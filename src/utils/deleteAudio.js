import { supabase } from '@/utils/supabase';

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Delete an audio file from the R2 bucket.
 *
 * @param {string} bucket - storage bucket name
 * @param {string} path - path of the file within the bucket
 * @param {string} base - base directory for the R2 bucket
 * @returns {Promise<void>}
 */
export default async function deleteAudio(bucket, path, base) {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('You must be signed in to delete audio');
  }

  const params = new URLSearchParams({ bucket, path, base });
  const res = await fetch(`/api/delete-file?${params.toString()}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
    const message = errorData.error || 'Failed to delete file';

    if (res.status === 401 || res.status === 403) {
      throw new Error(message || 'You are not authorized to delete this file');
    }

    throw new Error(message);
  }
  await res.json();
}
