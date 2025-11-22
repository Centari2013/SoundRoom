import { supabase } from './supabaseClient'
import { requestPreviewGeneration } from '@app/utils/previewGeneration'
import { buildApiUrl } from '@app/utils/apiBase'

function getFileExtension(filename = '') {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1 || lastDot === filename.length - 1) return ''
  return filename.slice(lastDot + 1).toLowerCase()
}

function buildStorageKey(soundId, extension) {
  const extSegment = extension ? `.${extension}` : ''
  return `${soundId}${extSegment}`
}

/**
 * Fetch a signed upload URL using the exact flow the customer-facing uploader uses.
 * Admin ingest writes to {planTier}/{bucket}/{generatedKey} while retaining the user
 * fallback for customer uploads.
 */
async function getSignedUploadUrl({ key, filename }) {
  const params = new URLSearchParams()
  if (filename) params.set('filename', filename)
  if (key) params.set('key', key)

  const endpoint = buildApiUrl(`/api/get-upload-url?${params.toString()}`)
  const response = await fetch(endpoint)

  const rawBody = await response.text().catch(() => '')

  if (!response.ok) {
    let message = rawBody || 'Unable to get signed Cloudflare R2 URL'
    try {
      const json = JSON.parse(rawBody)
      message = json?.error || json?.message || message
    } catch (_err) {
      // fall back to the raw or default message
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
 * @param {Object} options
 * @param {File} options.file
 * @param {string} options.userId
 * @param {string} options.planTier
 * @param {string} options.bucket
 * @param {Object} options.metadata - payload destined for public.sound_files
 */
export async function uploadFileAndInsert({ file, userId, metadata }) {
  if (!userId) {
    throw new Error('Supabase user is required before uploading')
  }

  const extension = getFileExtension(file.name)
  const insertPayload = {
    ...metadata,
    size: file.size,
    mime_type: file.type,
    preview_url: null
  }

  const { data: created, error: insertError } = await supabase
    .from('sound_files')
    .insert(insertPayload)
    .select('id')
    .single()

  if (insertError) {
    throw insertError
  }

  const storageKey = buildStorageKey(created.id, extension)

  const { signedUrl } = await getSignedUploadUrl({ key: storageKey, filename: file.name })
  await uploadViaXhr(file, signedUrl)

  const { error: updateError } = await supabase
    .from('sound_files')
    .update({ path: storageKey })
    .eq('id', created.id)

  if (updateError) {
    throw updateError
  }

  await requestPreviewGeneration({ key: storageKey, soundId: created.id })

  return { key: storageKey, soundId: created.id }
}
