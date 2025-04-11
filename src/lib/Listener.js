// lib/Listener.js
export default class Listener {
  _angle = 90
  _audioContext = null
  _canvasContext

  constructor(x = 300, y = 200, angle=90) {
    this.x = x
    this.y = y
    //this._angle = angle
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
    const angleRad = (this._angle * Math.PI) / 180

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

  draw() {
    this._canvasContext.beginPath()
    this._canvasContext.arc(this.x, this.y, 10, 0, Math.PI * 2)
    this._canvasContext.fillStyle = '#00f'
    this._canvasContext.fill()

    const angleRad = (this._angle * Math.PI) / 180
    const dx = Math.cos(angleRad) * 20
    const dy = Math.sin(angleRad) * 20
    this._canvasContext.beginPath()
    this._canvasContext.moveTo(this.x, this.y)
    this._canvasContext.lineTo(this.x - dx, this.y - dy)
    this._canvasContext.strokeStyle = '#fff'
    this._canvasContext.stroke()

    this.updateAudio()
  }
}
