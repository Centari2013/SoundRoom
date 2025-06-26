export function setupAudioContext(audioEngine, listener) {
  
  const audioContext = audioEngine.getAudioContext()
  listener.setAudioContext(audioContext)
  audioEngine.setupAudioEngine() // run after listener audio context is set because it plays saved sounds
  return audioContext
}