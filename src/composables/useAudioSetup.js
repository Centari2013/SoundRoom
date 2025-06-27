export function setupAudioContext(audioEngine, listener) {
  const audioContext = audioEngine.value.getAudioContext()
  listener.value.setAudioContext(audioContext)
  audioEngine.value.setupAudioEngine() // run after listener audio context is set because it plays saved sounds
  listener.value.updateAudio() // ensure listener is ready with the new context
}