import { supabase } from './supabaseClient'

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
  const response = await fetch(`/api/get-upload-url?${params.toString()}`)

  const rawBody = await response.text().catch(() => '')

  if (!response.ok) {
    throw new Error(rawBody || 'Unable to get signed Cloudflare R2 URL')
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

  const { signedUrl, key } = await getSignedUploadUrl({
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
    mime_type: file.type
  }

  const { error } = await supabase.from('sound_files').insert(payload)
  if (error) {
    throw error
  }

  return { key }
}
