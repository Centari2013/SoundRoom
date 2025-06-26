// lib/Room.js

export default class Room {
  width = 0
  height = 0

  constructor (width = 600, height = 400) {
    this.width = width
    this.height = height
  }

  // clamp values to be within room boundaries
  clamp(val, min, max) {
    return Math.max(min, Math.min(val, max))
  }

  static fromJSON(json) {
    if (json.width && json.height) {
      const newRoom = new Room(json.width, json.height)
      return newRoom
    } else {
      throw new Error('Invalid JSON format for Room')
    }
  }

  toJSON() {
    return {
      width: this.width,
      height: this.height
    }
  }
}
