import { describe, it, expect, vi, beforeEach } from 'vitest'
import Room from '@/lib/Room'

// Provide a minimal AudioEngine stand-in so Room.setAudioEngine works
vi.mock('@/lib/AudioEngine', () => ({
  default: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    setRoom: vi.fn(),
  })),
}))

import AudioEngine from '@/lib/AudioEngine'

describe('Room', () => {
  // ─── Constructor ─────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('uses default dimensions when called with no arguments', () => {
      const room = new Room()
      expect(room.width).toBe(600)
      expect(room.height).toBe(400)
    })

    it('sets name.value to the provided name', () => {
      const room = new Room(800, 600, 'Studio A', 'abc-123')
      expect(room.name.value).toBe('Studio A')
    })

    it('stores the provided id', () => {
      const room = new Room(800, 600, 'X', 'my-id')
      expect(room.id).toBe('my-id')
    })

    it('id is null by default', () => {
      const room = new Room()
      expect(room.id).toBeNull()
    })

    it('audioEngine starts as a shallowRef with null value', () => {
      const room = new Room()
      expect(room.audioEngine.value).toBeNull()
    })
  })

  // ─── clamp ───────────────────────────────────────────────────────────────────

  describe('clamp', () => {
    let room
    beforeEach(() => { room = new Room() })

    it('returns the value when within range', () => {
      expect(room.clamp(50, 0, 100)).toBe(50)
    })

    it('clamps to min when value is below range', () => {
      expect(room.clamp(-10, 0, 100)).toBe(0)
    })

    it('clamps to max when value is above range', () => {
      expect(room.clamp(200, 0, 100)).toBe(100)
    })

    it('returns min when value equals min', () => {
      expect(room.clamp(0, 0, 100)).toBe(0)
    })

    it('returns max when value equals max', () => {
      expect(room.clamp(100, 0, 100)).toBe(100)
    })
  })

  // ─── toJSON ──────────────────────────────────────────────────────────────────

  describe('toJSON', () => {
    it('returns an object with width, height, and name', () => {
      const room = new Room(1200, 800, 'Big Room')
      const json = room.toJSON()
      expect(json).toEqual({
        width: 1200,
        height: 800,
        name: 'Big Room',
      })
    })

    it('does not include id in the serialised output', () => {
      const room = new Room(600, 400, 'Room', 'some-id')
      const json = room.toJSON()
      expect(json).not.toHaveProperty('id')
    })
  })

  // ─── fromJSON ────────────────────────────────────────────────────────────────

  describe('fromJSON', () => {
    it('creates a Room from a valid JSON object', () => {
      const room = Room.fromJSON({ width: 500, height: 300, name: 'Test Room', id: 'xyz' })
      expect(room).toBeInstanceOf(Room)
      expect(room.width).toBe(500)
      expect(room.height).toBe(300)
      expect(room.name.value).toBe('Test Room')
      expect(room.id).toBe('xyz')
    })

    it('accepts id: null in the JSON', () => {
      const room = Room.fromJSON({ width: 600, height: 400, name: 'Null ID Room', id: null })
      expect(room.id).toBeNull()
    })

    it('throws when width is missing', () => {
      expect(() => Room.fromJSON({ height: 400, name: 'Bad', id: '1' })).toThrow()
    })

    it('throws when height is missing', () => {
      expect(() => Room.fromJSON({ width: 600, name: 'Bad', id: '1' })).toThrow()
    })

    it('throws when name is missing', () => {
      expect(() => Room.fromJSON({ width: 600, height: 400, id: '1' })).toThrow()
    })

    it('throws when id is missing entirely', () => {
      expect(() => Room.fromJSON({ width: 600, height: 400, name: 'Bad' })).toThrow()
    })
  })

  // ─── setAudioEngine ──────────────────────────────────────────────────────────

  describe('setAudioEngine', () => {
    it('creates and assigns a new AudioEngine when called with no argument', () => {
      const room = new Room()
      room.setAudioEngine()
      expect(room.audioEngine.value).not.toBeNull()
    })

    it('throws when passed an object that is not an AudioEngine instance', () => {
      const room = new Room()
      expect(() => room.setAudioEngine({ fake: true })).toThrow('Expected an instance of AudioEngine')
    })

    it('calls setRoom on the new engine', () => {
      const room = new Room()
      room.setAudioEngine()
      const engine = AudioEngine.mock.results[AudioEngine.mock.results.length - 1].value
      expect(engine.setRoom).toHaveBeenCalledWith(room)
    })

    it('disposes the old engine when replacing it', () => {
      const room = new Room()
      room.setAudioEngine()
      const firstEngine = room.audioEngine.value
      room.setAudioEngine()
      expect(firstEngine.dispose).toHaveBeenCalled()
    })
  })

  // ─── dispose ─────────────────────────────────────────────────────────────────

  describe('dispose', () => {
    it('calls dispose on the audio engine', () => {
      const room = new Room()
      room.setAudioEngine()
      const engine = room.audioEngine.value
      room.dispose()
      expect(engine.dispose).toHaveBeenCalled()
    })

    it('sets audioEngine.value to null after dispose', () => {
      const room = new Room()
      room.setAudioEngine()
      room.dispose()
      expect(room.audioEngine.value).toBeNull()
    })

    it('does not throw when audioEngine is already null', () => {
      const room = new Room()
      expect(() => room.dispose()).not.toThrow()
    })
  })
})
