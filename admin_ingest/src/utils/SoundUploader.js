import { supabase } from './supabaseClient'
import { requestPreviewGeneration } from '@app/utils/previewGeneration'
import { buildApiUrl } from '@app/utils/apiBase'

function sanitizeExtension(filename = '') {
  const trimmed = filename.trim()
  const lastDot = trimmed.lastIndexOf('.')
  if (lastDot === -1) return ''
  return trimmed.slice(lastDot + 1).replace(/[^a-zA-Z0-9]+/g, '').toLowerCase()
}

function createObjectKey(soundId, filename) {
  const extension = sanitizeExtension(filename)
  return extension ? `${soundId}.${extension}` : soundId
}

/**
 * Fetch a signed upload URL using the exact flow the customer-facing uploader uses,
 * but always targeting the flat <soundId>.<ext> naming convention.
 */
async function getSignedUploadUrl({ objectKey, userId }) {
  const params = new URLSearchParams({ key: objectKey })

  if (userId) params.set('userId', userId)

  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw new Error(`Unable to read Supabase session: ${sessionError.message}`)
  }

  const token = session?.access_token

  if (!token) {
    throw new Error('Missing Supabase access token. Please sign in again.')
  }

  const endpoint = buildApiUrl(`/api/get-upload-url?${params.toString()}`)

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const rawBody = await response.text().catch(() => '')

  if (!response.ok) {
    let message = rawBody || 'Unable to get signed Cloudflare R2 URL'
    try {
      const json = JSON.parse(rawBody)
      message = json?.error || json?.message || message
    } catch (_err) {
      // fall back to raw/default
    }
    throw new Error(`${message} (status ${response.status})`)
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch (_err) {
    const snippet = rawBody?.slice(0, 240)
    throw new Error(
      `Unexpected response from /api/get-upload-url (status ${response.status}): ${snippet || 'Empty body'}`
    )
  }

  if (!payload?.signedUrl || !payload?.key) {
    throw new Error('Signed upload URL response was missing "signedUrl" or "key"')
  }

  return payload
}

function uploadViaXhr(file, signedUrl) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl)
    xhr.setRequestHeader('Content-Type', file.type)

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`R2 upload failed with status ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error('Network error while uploading to R2'))
    xhr.send(file)
  })
}

/**
 * Upload a single file and then insert the DB row.
 *
 * @param {Object} options
 * @param {File} options.file
 * @param {string} options.userId
 * @param {Object} options.metadata payload destined for public.sound_files. Includes
 *   `id`, `name`, `tags`, `duration_seconds`, `cone_inner`, `cone_outer`,
 *   `plan_tier`, `bucket`, `path`, plus optional licensing fields
 *   `source` (e.g. "Sonniss") and `license_type` (e.g. "CC0"). Licensing
 *   fields are nullable — pass `null` when unknown.
 */
export async function uploadFileAndInsert({ file, userId, metadata }) {
  if (!userId) {
    throw new Error('Supabase user is required before uploading')
  }

  if (!metadata?.id) {
    throw new Error('Sound ID is required to build the flat object key')
  }

  const objectKey = metadata.path || createObjectKey(metadata.id, file.name)
  const { signedUrl, key } = await getSignedUploadUrl({ objectKey, userId })
  await uploadViaXhr(file, signedUrl)

  const payload = {
    ...metadata,
    path: key,
    size: file.size,
    mime_type: file.type,
    preview_url: null
  }

  const { data, error } = await supabase.from('sound_files').insert(payload).select('id').single()
  if (error) {
    throw error
  }

  if (data?.id) {
    await requestPreviewGeneration({ key, soundId: data.id })
  }

  return { key }
}
