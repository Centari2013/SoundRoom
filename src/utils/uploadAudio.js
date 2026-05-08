import { supabase } from '@/utils/supabase';
import { buildApiUrl } from './apiBase';

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Fetch a signed URL for uploading a file to the R2 bucket.
 *
 * @param {string} userId - Supabase user ID
 * @param {string} filename - original file name
 * @returns {Promise<{signedUrl: string, key: string}>}
 */
function createSoundId() {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return [...buffer]
    .map((b, i) => (i === 6 ? (b & 0x0f) | 0x40 : i === 8 ? (b & 0x3f) | 0x80 : b).toString(16).padStart(2, '0'))
    .join('');
}

function buildObjectKey(soundId, displayName) {
  const trimmed = displayName?.trim() || '';
  const ext = trimmed.includes('.') ? trimmed.split('.').pop() : '';
  const safeExt = (ext || '').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
  return safeExt ? `${soundId}.${safeExt}` : soundId;
}

async function getSignedUploadUrl(key, userId, fileSize) {
  const params = new URLSearchParams({ key });
  if (userId) params.set('userId', userId);
  if (fileSize > 0) params.set('fileSize', String(fileSize));
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('You must be signed in to upload audio.');
  }

  const res = await fetch(buildApiUrl(`/api/get-upload-url?${params.toString()}`), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    let message = 'Failed to get signed upload URL';
    const rawBody = await res.text().catch(() => '');

    if (rawBody) {
      try {
        const errorData = JSON.parse(rawBody);
        message = errorData?.error || errorData?.message || message;
      } catch (parseError) {
        message = rawBody;
      }
    }

    throw new Error(message);
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
 * @returns {Promise<{ key: string, soundId: string }>} key and id of the uploaded file
 */
export default async function uploadAudio(file, userId, onProgress) {
  const soundId = createSoundId();
  const objectKey = buildObjectKey(soundId, file.name);
  const { signedUrl, key } = await getSignedUploadUrl(objectKey, userId, file.size);

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
        resolve({ key, soundId });
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
