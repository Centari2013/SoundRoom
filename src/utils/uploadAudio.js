/**
 * Fetch a signed URL for uploading a file to the R2 bucket.
 *
 * @param {string} userId - Supabase user ID
 * @param {string} filename - original file name
 * @returns {Promise<{signedUrl: string, key: string}>}
 */
async function getSignedUploadUrl(userId, displayName) {
  const params = new URLSearchParams({ userId, filename: displayName });
  const res = await fetch(`/api/get-upload-url?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
    throw new Error(errorData.error || 'Failed to get signed upload URL');
  }
  const payload = await res.json();
  if (!payload?.key || !payload?.signedUrl) {
    throw new Error('Signed upload URL response is missing required fields');
  }
  return payload;
}

/**
 * Upload an audio file to the R2 bucket for the given user.
 *
 * @param {File|Blob} file - file to upload
 * @param {string} userId - Supabase user ID
 * @param {function} [onProgress] - optional progress callback (percent => void)
 * @returns {Promise<string>} key of the uploaded file
 */
export default async function uploadAudio(file, userId, onProgress) {
  const { signedUrl, key } = await getSignedUploadUrl(userId, file.name);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        const percent = (event.loaded / event.total) * 100;
        onProgress(percent);
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(key);
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed due to a network error'));

    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
