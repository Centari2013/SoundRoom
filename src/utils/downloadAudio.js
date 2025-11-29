import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { supabase } from '@/utils/supabase'

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

/**
 * Normalise the stored object path into the canonical R2 object key.
 * All files now live at the bucket root using the "<id>.<ext>" format,
 * so we simply trim leading/trailing slashes on the provided path.
 */
export function buildStorageKey(_base, _bucket, path) {
  return (path ?? '').toString().replace(/^\/+|\/+$/g, '')
}

/**
 * Fetch an audio file from the R2 bucket and return it as a Blob.
 *
 * @param {string} key - path key used to generate the signed URL
 * @returns {Promise<Blob>} resolved audio Blob
 */
export async function fetchAudioBlob(key) {
  const token = await getAccessToken()

  const res = await fetch(`/api/get-signed-url?key=${encodeURIComponent(key)}`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Invalid JSON response' }))
    const message = errorData.error || 'Failed to get signed URL'

    if (res.status === 401 || res.status === 403) {
      throw new Error(message || 'You are not authorized to access this audio file')
    }

    throw new Error(message)
  }
  const { signedUrl } = await res.json()

  const audioResponse = await fetch(signedUrl)
  if (!audioResponse.ok) throw new Error('Failed to fetch audio from R2')

  return await audioResponse.blob()
}

/**
 * Download an audio file and optionally populate an HTMLAudioElement.
 *
 * @param {string} bucket - storage bucket name
 * @param {string} path - path of the file within the bucket
 * @param {string} base - base directory for the R2 bucket (tier/namespace)
 * @param {boolean} [populateAudio=true] - create an `Audio` element when true
 * @param {?Function} [stopPlayback=null] - callback fired when preview ends
 * @param {?string} [libraryId=null] - unique ID used for caching
 * @returns {Promise<{blobUrl:string, audio:HTMLAudioElement|null}>}
 */
export default async function downloadAudio(
  bucket,
  path,
  base,
  populateAudio = true,
  stopPlayback = null,
  libraryId = null
) {
  const cacheStore = useAudioCacheStore()
  const cacheManager = cacheStore.audioCacheManager

  const storageKey = buildStorageKey(base, bucket, path)
  const fileId = libraryId ?? storageKey

  const blobUrl = await cacheManager.getAudioURL(fileId, async () => {
    const audioBlob = await fetchAudioBlob(storageKey)
    return audioBlob
  })

  let audio = null
  if (populateAudio) {
    audio = new Audio(blobUrl)
    audio.preload = 'auto'

    if (stopPlayback) {
      // Handle natural end of audio (shorter than preview window)
      audio.addEventListener('ended', () => {
        stopPlayback()
      })
    }
  }

  return { blobUrl, audio }
}

/**
 * Download multiple audio files in parallel.
 *
 * @param {{id:string, bucket:string, path:string, base:string}[]} sourcesList - list of sources to fetch
 * @param {boolean} [populateAudio=false] - create `Audio` elements when true
 * @param {?Function} [stopPlayback=null] - callback fired when preview ends
 * @returns {Promise<{id:string, audioPath:string}[]>} array of successfully downloaded entries
 */
export async function downloadMultipleAudio(
  sourcesList,
  populateAudio = false,
  stopPlayback = null
) {
  const successes = []
  const failedIds = []

  await Promise.all(
    sourcesList.map(async (src) => {
      try {
        const result = await downloadAudio(
          src.bucket,
          src.path,
          src.base,
          populateAudio,
          stopPlayback,
          src.id
        )
        if (result) successes.push({ id: src.id, audioPath: result.blobUrl })
      } catch (error) {
        console.warn(`Failed to download sound ${src.id}:`, error)
        failedIds.push(src.id)
      }
    })
  )

  return { successes, failedIds }
}
