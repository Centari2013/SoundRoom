// lib/Room.js
/**
 * Describes the virtual room in which sound sources and the listener exist.
 */

export default class Room {
  width = 0
  height = 0

  /**
   * @param {number} [width=600]
   * @param {number} [height=400]
   */
  constructor (width = 600, height = 400) {
    this.width = width
    this.height = height
  }

  // clamp values to be within room boundaries
  /**
   * Ensures a value stays within the room bounds.
   * @param {number} val
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  clamp(val, min, max) {
    return Math.max(min, Math.min(val, max))
  }

  /**
   * Creates a Room from serialized data.
   * @param {{width:number,height:number}} json
   * @returns {Room}
   */
  static fromJSON(json) {
    if (json.width && json.height) {
      const newRoom = new Room(json.width, json.height)
      return newRoom
    } else {
      throw new Error('Invalid JSON format for Room')
    }
  }

  /** @returns {{width:number,height:number}} */
  toJSON() {
    return {
      width: this.width,
      height: this.height
    }
  }
}
