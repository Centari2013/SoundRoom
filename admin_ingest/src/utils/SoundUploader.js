import { supabase } from './supabaseClient'
import { requestPreviewGeneration } from '@app/utils/previewGeneration'
import { buildApiUrl } from '@app/utils/apiBase'

/**
 * Fetch a signed upload URL using the exact flow the customer-facing uploader uses.
 * Admin ingest writes to {planTier}/{bucket}/{generatedKey} while retaining the user
 * fallback for customer uploads.
 */
async function getSignedUploadUrl({ userId, filename, planTier, bucket }) {
  const params = new URLSearchParams({ filename })

  if (userId) params.set('userId', userId)
  if (planTier) params.set('planTier', planTier)
  if (bucket) params.set('bucket', bucket)

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
export async function uploadFileAndInsert({ file, userId, planTier, bucket, metadata }) {
  if (!userId) {
    throw new Error('Supabase user is required before uploading')
  }

  const { signedUrl, key, base, bucket: bucketSegment } = await getSignedUploadUrl({
    userId,
    filename: file.name,
    planTier,
    bucket
  })
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
    await requestPreviewGeneration({ key, base, bucket: bucketSegment ?? bucket, soundId: data.id })
  }

  return { key }
}
