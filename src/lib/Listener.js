// lib/Listener.js
export default class Listener {
  _angle = 180
  _audioContext = null
  _canvasContext

  /**
   * Create a listener positioned within the room.
   *
   * @param {number} [x=300]     X coordinate in pixels.
   * @param {number} [y=200]     Y coordinate in pixels.
   * @param {number} [angle=180] Orientation angle in degrees.
   */
  constructor(x = 300, y = 200, angle = 180) {
    this.x = x
    this.y = y
    this._angle = angle
  }

  get angle() {
    return this._angle
  }

  /**
   * Recreate a Listener from JSON data.
   *
   * @param {Object} json Object with `x`, `y` and `angle` properties.
   * @returns {Listener}
   */
  static fromJSON(json) {
    if (json.x !== undefined && json.y !== undefined && json.angle !== undefined) {
      const newListener = new Listener(json.x, json.y, json.angle)
      return newListener
    } else {
      throw new Error('Invalid JSON format for Listener')
    }
  }

  /**
   * Serialise the listener to a plain object.
   *
   * @returns {{x:number, y:number, angle:number}}
   */
  toJSON() {
    return {
      x: this.x,
      y: this.y,
      angle: this._angle
    }
  }

  /**
   * Update the orientation angle and refresh the audio context.
   *
   * @param {number} newAngle
   */
  updateAngle(newAngle) {
    this._angle = newAngle
    this.updateAudio()
  }

  /**
   * Set the Web Audio context used for spatialisation.
   *
   * @param {AudioContext} audioContext
   */
  setAudioContext(audioContext) {
    this._audioContext = audioContext
  }

  /**
   * Provide the canvas context reference used for rendering.
   *
   * @param {{ value: CanvasRenderingContext2D }} canvasContextRef
   */
  setCanvasContext(canvasContextRef) {
    this._canvasContext = canvasContextRef.value
  }

  /**
   * Synchronise the listener position and orientation with the audio context.
   *
   * ─── Convention note ─────────────────────────────────────────────────
   * The canvas and Web Audio use different coordinate grids. `_angle` is
   * stored in canvas convention (Konva-style: 0 = +X / right, 90 = +Y /
   * down). The -90° offset below and the absence of a Y-flip on the
   * position values are intentional adjustments that map canvas
   * convention onto Web Audio's own coordinate system.
   *
   * The visual teardrop's pointy end IS forward — visual / audio
   * alignment is verified empirically, not derivable by reading either
   * grid in isolation. Don't "fix" the -90° or add a Y-flip unless
   * you've actually listened to it being broken.
   * ─────────────────────────────────────────────────────────────────────
   */
  updateAudio() {
    if (!this._audioContext) return

    const scale = 0.01

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
  /**
   * Release stored context references.
   */
  dispose() {
    this._audioContext = null;
    this._canvasContext = null;
  }

}
