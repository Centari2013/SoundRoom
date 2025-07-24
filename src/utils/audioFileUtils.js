/**
 * Utility helpers for processing audio files during uploads.
 */

/**
 * Get the duration of an audio File using the Web Audio API.
 *
 * @param {File|Blob} file - audio file to decode
 * @returns {Promise<number>} duration in seconds
 */
export async function getFileDuration(file) {
  const context = new AudioContext();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    return audioBuffer.duration;
  } finally {
    context.close();
  }
}

/**
 * Return the file name without its extension.
 *
 * @param {string} fileName - original file name
 * @returns {string} file name stripped of extension
 */
export function stripExtension(fileName) {
  return fileName.replace(/\.[^/.]+$/, '');
}

export const ALLOWED_AUDIO_TYPES = [
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/webm'
];
