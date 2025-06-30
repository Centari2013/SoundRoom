// lib/Room.js

export default class Room {
  width = 0
  height = 0
  name = ''

  constructor (width = 600, height = 400, name = 'Untitled Room') {
    this.width = width
    this.height = height
    this.name = name
  }

  // clamp values to be within room boundaries
  clamp(val, min, max) {
    return Math.max(min, Math.min(val, max))
  }

  static fromJSON(json) {
    if (json.width && json.height && json.name) {
      const newRoom = new Room(json.width, json.height, json.name)
      return newRoom
    } else {
      throw new Error('Invalid JSON format for Room')
    }
  }

  toJSON() {
    return {
      width: this.width,
      height: this.height,
      name: this.name
    }
  }
}
