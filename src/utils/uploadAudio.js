/**
 * Fetch a signed URL for uploading a file to the R2 bucket.
 *
 * @param {string} userId - Supabase user ID
 * @param {string} filename - original file name
 * @returns {Promise<{signedUrl: string, key: string}>}
 */
async function getSignedUploadUrl(userId, filename) {
  const params = new URLSearchParams({ userId, filename });
  const res = await fetch(`/api/get-upload-url?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
    throw new Error(errorData.error || 'Failed to get signed upload URL');
  }
  return await res.json();
}

/**
 * Upload an audio file to the R2 bucket for the given user.
 *
 * @param {File|Blob} file - file to upload
 * @param {string} userId - Supabase user ID
 * @returns {Promise<string>} key of the uploaded file
 */
export default async function uploadAudio(file, userId) {
  const { signedUrl, key } = await getSignedUploadUrl(userId, file.name);
  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
  if (!uploadRes.ok) {
    throw new Error('Failed to upload file to R2');
  }
  return key;
}
