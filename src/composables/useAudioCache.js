const audioBufferCache = new Map();

/**
 * Loads and caches a decoded AudioBuffer for the given path.
 * @param {AudioContext} audioContext - The audio context to decode in.
 * @param {string} path - The path to the audio file.
 * @returns {Promise<AudioBuffer>}
 */
export async function getCachedAudioBuffer(audioContext, path) {
  if (audioBufferCache.has(path)) {
    return audioBufferCache.get(path);
  }

  const response = await fetch(path);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  audioBufferCache.set(path, audioBuffer);
  return audioBuffer;
}
