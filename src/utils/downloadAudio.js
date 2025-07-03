import { useAudioCacheStore } from '@/stores/useAudioCacheStore'


async function fetchAudioBlob(key) {
  const res = await fetch(`/api/get-signed-url?key=${encodeURIComponent(key)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
    throw new Error(errorData.error || "Failed to get signed URL");
  }
  const { signedUrl } = await res.json();

  const audioResponse = await fetch(signedUrl);
  if (!audioResponse.ok) throw new Error("Failed to fetch audio from R2");

  return await audioResponse.blob();
}




export default async function downloadAudio(
  bucket,
  path,
  populateAudio = true,
  stopPlayback = null,
  libraryId = null
) {
  const cacheStore = useAudioCacheStore()
  const cacheManager = cacheStore.audioCacheManager

  // uncomment for debugging cache and download issues
  //cacheManager.clearPersistentCache()
  const fileId = libraryId ?? `${bucket}/${path}`

  const blobUrl = await cacheManager.getAudioURL(fileId, async () => {
  /*  const { data: fileData, error: fileError } = await supabase.storage
      .from(bucket)
      .download(path)

    if (fileError) {
      console.error(`Failed to download:`, fileError)
      return new Blob()
    } */
    
    const audioBlob = await fetchAudioBlob(`free/${bucket}/${path}`)
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

export async function downloadMultipleAudio(
  sourcesList,
  populateAudio = false,
  stopPlayback = null
) {
  const results = await Promise.all(
    sourcesList.map(async (src) => {
      const result = await downloadAudio(
        src.bucket,
        src.path,
        populateAudio,
        stopPlayback,
        src.id
      )
      return result ? { id: src.id, audioPath: result.blobUrl } : null
    })
  )

  return results.filter(Boolean); // filter out any failed downloads
}