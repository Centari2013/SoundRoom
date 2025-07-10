// lib/Listener.js
/**
 * Represents the listener within the room and updates the underlying
 * AudioContext listener as its position or orientation changes.
 */
export default class Listener {
  _angle = 180
  _audioContext = null
  _canvasContext

  /**
   * @param {number} [x=300] - Initial x coordinate in room space.
   * @param {number} [y=200] - Initial y coordinate in room space.
   * @param {number} [angle=180] - Facing angle in degrees.
   */
  constructor(x = 300, y = 200, angle = 180) {
    this.x = x
    this.y = y
    this._angle = angle
  }

  /** @returns {number} */
  get angle() {
    return this._angle
  }

  /**
   * Creates a Listener instance from its serialized form.
   *
   * @param {Object} json
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

  /** @returns {{x:number,y:number,angle:number}} */
  toJSON() {
    return {
      x: this.x,
      y: this.y,
      angle: this._angle
    }
  }

  /**
   * Updates the facing angle of the listener and applies it to the AudioContext.
   * @param {number} newAngle
   */
  updateAngle(newAngle) {
    this._angle = newAngle
    this.updateAudio()
  }

  /** @param {AudioContext} audioContext */
  setAudioContext(audioContext) {
    this._audioContext = audioContext
  }

  /**
   * @param {{ value: CanvasRenderingContext2D }} canvasContextRef
   */
  setCanvasContext(canvasContextRef) {
    this._canvasContext = canvasContextRef.value
  }

  /**
   * Applies the listener's position and orientation to the AudioContext.
   */
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
  /**
   * Clears references to external contexts.
   */
  dispose() {
    this._audioContext = null;
    this._canvasContext = null;
  }

}
