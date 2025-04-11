// lib/Room.js

export default class Room {
  width = 0
  height = 0

  constructor (width = 600, height = 400) {
    this.width = width
    this.height = height
  }

  clamp(val, min, max) {
    return Math.max(min, Math.min(val, max))
  }
}
