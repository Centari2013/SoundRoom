// lib/Room.js

export default class Room {
  width = 0
  height = 0
  name = ''
  id = null

  constructor (width = 600, height = 400, name = 'Untitled Room', id = null) {
    this.width = width
    this.height = height
    this.name = name
    this.id = id
  }

  // clamp values to be within room boundaries
  clamp(val, min, max) {
    return Math.max(min, Math.min(val, max))
  }

  static fromJSON(json) {
    if (json.width && json.height && json.name && json.id !== undefined) {
      const newRoom = new Room(json.width, json.height, json.name, json.id)
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
