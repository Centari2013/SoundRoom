// lib/Room.js

export default class Room {
  width = 0
  height = 0
  name = ''
  id = null

  /**
   * Create a new room instance.
   *
   * @param {number} [width=600]  Width of the room in pixels.
   * @param {number} [height=400] Height of the room in pixels.
   * @param {string} [name='Untitled Room'] Human readable room name.
   * @param {?string} [id=null]   Optional unique identifier.
   */
  constructor (width = 600, height = 400, name = 'Untitled Room', id = null) {
    this.width = width
    this.height = height
    this.name = name
    this.id = id
  }

  /**
   * Clamp a value so it stays within the given range.
   *
   * @param {number} val   Value to constrain.
   * @param {number} min   Minimum allowed value.
   * @param {number} max   Maximum allowed value.
   * @returns {number}     Constrained value.
   */
  clamp(val, min, max) {
    return Math.max(min, Math.min(val, max))
  }

  /**
   * Recreate a Room instance from JSON data.
   *
   * @param {Object} json JSON containing `width`, `height`, `name` and `id`.
   * @returns {Room}
   */
  static fromJSON(json) {
    if (json.width && json.height && json.name && json.id !== undefined) {
      const newRoom = new Room(json.width, json.height, json.name, json.id)
      return newRoom
    } else {
      throw new Error('Invalid JSON format for Room')
    }
  }

  /**
   * Serialise this instance to a plain object for persistence.
   *
   * @returns {{width:number, height:number, name:string}}
   */
  toJSON() {
    return {
      width: this.width,
      height: this.height,
      name: this.name
    }
  }
}
