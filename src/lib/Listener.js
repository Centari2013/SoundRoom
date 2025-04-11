// lib/Listener.js
export default class Listener {
  _angle = 90
  _audioContext = null

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

  setCanvasContext(canvasContext) {
    this._canvasContext = canvasContext
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

  draw(ctx) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, 10, 0, Math.PI * 2)
    ctx.fillStyle = '#00f'
    ctx.fill()

    const angleRad = (this._angle * Math.PI) / 180
    const dx = Math.cos(angleRad) * 20
    const dy = Math.sin(angleRad) * 20
    ctx.beginPath()
    ctx.moveTo(this.x, this.y)
    ctx.lineTo(this.x - dx, this.y - dy)
    ctx.strokeStyle = '#fff'
    ctx.stroke()

    this.updateAudio()
  }
}
