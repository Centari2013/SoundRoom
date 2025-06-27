import { supabase } from '@/utils/supabase'

export default async function downloadAudio(bucket, path, populateAudio=true, stopPlayback=null) {
  const { data: fileData, error: fileError } = await supabase
    .storage
    .from(bucket)
    .download(path)

    if (fileError) {
      console.error(`Failed to download:`, fileError)
      return
    }

    const blobUrl = URL.createObjectURL(fileData)
    let audio = null
    if (populateAudio) {
      audio = new Audio(blobUrl)
      audio.preload = 'auto'

      if (stopPlayback){
        // Handle natural end of audio (shorter than preview window)
      audio.addEventListener('ended', () => {
        stopPlayback()
      })
      }
      
    }

    return {blobUrl, audio}
}

export async function downloadMultipleAudio(sourcesList, populateAudio = false, stopPlayback = null) {
  const results = await Promise.all(sourcesList.map(async (src) => {
    const result = await downloadAudio(src.bucket, src.path, populateAudio, stopPlayback);
    return result ? { id: src.id, audioPath: result.blobUrl } : null;
  }));

  return results.filter(Boolean); // filter out any failed downloads
}