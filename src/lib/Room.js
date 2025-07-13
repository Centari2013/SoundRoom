// lib/Room.js

import AudioEngine from './AudioEngine'
import Listener from './Listener'

export default class Room {
  width = 0
  height = 0
  name = ''
  id = null
  /** @type {AudioEngine|null} */
  audioEngine = null
  /** @type {Listener|null} */
  listener = null
  /** @type {Array<any>} */
  soundSources = []

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
    this.audioEngine = new AudioEngine([])
    this.listener = new Listener()
    this.soundSources = []
  }

  /**
   * Assign an existing AudioEngine instance to this room.
   * @param {AudioEngine} engine
   */
  setAudioEngine(engine) {
    this.audioEngine = engine
  }

  /**
   * Assign a listener instance to this room.
   * @param {Listener} listener
   */
  setListener(listener) {
    this.listener = listener
  }

  /**
   * Add a sound source to the room and inform the source about its new context.
   * @param {any} source
   */
  addSoundSource(source) {
    if (!source) return
    if (typeof source.setRoom === 'function') {
      source.setRoom(this)
    }
    this.soundSources.push(source)
  }

  /**
   * Remove a sound source from the room.
   * @param {any} source
   */
  removeSoundSource(source) {
    const i = this.soundSources.indexOf(source)
    if (i !== -1) this.soundSources.splice(i, 1)
  }

  /**
   * Update the room dimensions and notify sound sources.
   * @param {number} width
   * @param {number} height
   */
  updateRoomSize(width, height) {
    this.width = width
    this.height = height
    this.soundSources.forEach(s => {
      if (typeof s.onRoomResize === 'function') {
        s.onRoomResize(width, height)
      }
    })
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
