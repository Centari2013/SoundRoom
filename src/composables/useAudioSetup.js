export function setupAudioContext(audioEngine, listener) {
  audioEngine.setupAudioEngine()
  const audioContext = audioEngine.getAudioContext()
  listener.setAudioContext(audioContext)
  return audioContext
}