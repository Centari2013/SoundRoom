import { describe, it, expect } from 'vitest'
import Room from '../../src/lib/Room.js'

describe('Room', () => {
  it('clamps values correctly', () => {
    const room = new Room()
    expect(room.clamp(150, 0, 100)).toBe(100)
    expect(room.clamp(-5, 0, 100)).toBe(0)
    expect(room.clamp(50, 0, 100)).toBe(50)
  })

  it('serializes and deserializes', () => {
    const original = new Room(800, 600, 'My Room', 'id1')
    const json = original.toJSON()
    expect(json).toEqual({ width: 800, height: 600, name: 'My Room' })

    const from = Room.fromJSON({ width: 800, height: 600, name: 'My Room', id: 'id1' })
    expect(from.width).toBe(800)
    expect(from.height).toBe(600)
    expect(from.name.value).toBe('My Room')
    expect(from.id).toBe('id1')
  })

  it('throws on invalid JSON', () => {
    expect(() => Room.fromJSON({ foo: 'bar' })).toThrow()
  })
})
