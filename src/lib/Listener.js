// lib/Listener.js
export default class Listener {
  _angle = 180
  _audioContext = null
  _canvasContext

  constructor(x = 300, y = 200) {
    this.x = x
    this.y = y
  }

  get angle() {
    return this._angle
  }

  updateAngle(newAngle) {
    this._angle = newAngle
    this.updateAudio()
  }

  setAudioContext(audioContext) {
    this._audioContext = audioContext
  }

  setCanvasContext(canvasContextRef) {
    this._canvasContext = canvasContextRef.value
  }

  updateAudio() {
    if (!this._audioContext) return

    const scale = 0.01
    
    // subtracted 90 degrees to have listener facing 'up' in room
    const angleRad = ((this._angle - 90) * Math.PI) / 180;

    this._audioContext.listener.setPosition(this.x * scale, this.y * scale, 0)
    this._audioContext.listener.setOrientation(
      Math.cos(angleRad),
      Math.sin(angleRad),
      0,
      0,
      0,
      1
    )
  }
}
