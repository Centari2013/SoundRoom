import { supabase } from '@/utils/supabase'
/**
 * Downloads an audio file from Supabase storage.
 * @param {string} bucket
 * @param {string} path
 * @param {boolean} [populateAudio=true]
 * @param {?Function} [stopPlayback=null]
 * @returns {Promise<{blobUrl:string, audio:HTMLAudioElement|null}>}
 */

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

/**
 * Helper to download many audio files in parallel.
 *
 * @param {Array<{id:number,bucket:string,path:string}>} sourcesList
 * @param {boolean} [populateAudio=false]
 * @param {?Function} [stopPlayback=null]
 * @returns {Promise<Array<{id:number,audioPath:string}>>}
 */
export async function downloadMultipleAudio(sourcesList, populateAudio = false, stopPlayback = null) {
  const results = await Promise.all(sourcesList.map(async (src) => {
    const result = await downloadAudio(src.bucket, src.path, populateAudio, stopPlayback);
    return result ? { id: src.id, audioPath: result.blobUrl } : null;
  }));

  return results.filter(Boolean); // filter out any failed downloads
}