/**
 * Delete an audio file from the R2 bucket.
 *
 * @param {string} bucket - storage bucket name
 * @param {string} path - path of the file within the bucket
 * @param {string} base - base directory for the R2 bucket
 * @returns {Promise<void>}
 */
export default async function deleteAudio(bucket, path, base) {
  const params = new URLSearchParams({ bucket, path, base })
  const res = await fetch(`/api/delete-file?${params.toString()}`, { method: 'DELETE' })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Invalid JSON response' }))
    throw new Error(errorData.error || 'Failed to delete file')
  }
  await res.json()
}
