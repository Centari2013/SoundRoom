import { describe, it, expect, vi, beforeEach } from 'vitest'
import Listener from '@/lib/Listener'

describe('Listener', () => {
  // ─── Constructor ─────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('uses default position and angle when called with no arguments', () => {
      const l = new Listener()
      expect(l.x).toBe(300)
      expect(l.y).toBe(200)
      expect(l.angle).toBe(180)
    })

    it('stores provided x, y and angle', () => {
      const l = new Listener(100, 50, 270)
      expect(l.x).toBe(100)
      expect(l.y).toBe(50)
      expect(l.angle).toBe(270)
    })

    it('starts without an audio context', () => {
      const l = new Listener()
      expect(l._audioContext).toBeNull()
    })
  })

  // ─── angle getter ─────────────────────────────────────────────────────────────

  describe('angle getter', () => {
    it('returns the internal _angle value', () => {
      const l = new Listener(0, 0, 90)
      expect(l.angle).toBe(90)
    })
  })

  // ─── updateAngle ─────────────────────────────────────────────────────────────

  describe('updateAngle', () => {
    it('updates _angle to the new value', () => {
      const l = new Listener()
      l.updateAngle(45)
      expect(l.angle).toBe(45)
    })

    it('calls updateAudio after updating the angle', () => {
      const l = new Listener()
      const spy = vi.spyOn(l, 'updateAudio')
      l.updateAngle(90)
      expect(spy).toHaveBeenCalled()
    })
  })

  // ─── setAudioContext ──────────────────────────────────────────────────────────

  describe('setAudioContext', () => {
    it('stores the provided audio context', () => {
      const l = new Listener()
      const ctx = { listener: { setPosition: vi.fn(), setOrientation: vi.fn() } }
      l.setAudioContext(ctx)
      expect(l._audioContext).toBe(ctx)
    })
  })

  // ─── updateAudio ─────────────────────────────────────────────────────────────

  describe('updateAudio', () => {
    it('does nothing when no audio context is set', () => {
      const l = new Listener()
      expect(() => l.updateAudio()).not.toThrow()
    })

    it('calls setPosition on the audio context listener', () => {
      const l = new Listener(300, 200, 180)
      const setPosition = vi.fn()
      const setOrientation = vi.fn()
      l._audioContext = { listener: { setPosition, setOrientation } }
      l.updateAudio()
      expect(setPosition).toHaveBeenCalledOnce()
    })

    it('scales position by 0.01', () => {
      const l = new Listener(300, 200, 180)
      const setPosition = vi.fn()
      const setOrientation = vi.fn()
      l._audioContext = { listener: { setPosition, setOrientation } }
      l.updateAudio()
      expect(setPosition).toHaveBeenCalledWith(3, 2, 0)
    })

    it('calls setOrientation on the audio context listener', () => {
      const l = new Listener(0, 0, 180)
      const setPosition = vi.fn()
      const setOrientation = vi.fn()
      l._audioContext = { listener: { setPosition, setOrientation } }
      l.updateAudio()
      expect(setOrientation).toHaveBeenCalledOnce()
    })

    it('passes the up-vector [0,0,1] as z components to setOrientation', () => {
      const l = new Listener(0, 0, 0)
      const setOrientation = vi.fn()
      l._audioContext = { listener: { setPosition: vi.fn(), setOrientation } }
      l.updateAudio()
      const args = setOrientation.mock.calls[0]
      // last 3 args are the up vector
      expect(args[3]).toBe(0)
      expect(args[4]).toBe(0)
      expect(args[5]).toBe(1)
    })
  })

  // ─── toJSON ──────────────────────────────────────────────────────────────────

  describe('toJSON', () => {
    it('returns an object with x, y and angle', () => {
      const l = new Listener(150, 75, 90)
      expect(l.toJSON()).toEqual({ x: 150, y: 75, angle: 90 })
    })
  })

  // ─── fromJSON ────────────────────────────────────────────────────────────────

  describe('fromJSON', () => {
    it('creates a Listener from a valid JSON object', () => {
      const l = Listener.fromJSON({ x: 100, y: 200, angle: 45 })
      expect(l).toBeInstanceOf(Listener)
      expect(l.x).toBe(100)
      expect(l.y).toBe(200)
      expect(l.angle).toBe(45)
    })

    it('throws when x is missing', () => {
      expect(() => Listener.fromJSON({ y: 200, angle: 0 })).toThrow()
    })

    it('throws when y is missing', () => {
      expect(() => Listener.fromJSON({ x: 100, angle: 0 })).toThrow()
    })

    it('throws when angle is missing', () => {
      expect(() => Listener.fromJSON({ x: 100, y: 200 })).toThrow()
    })

    it('round-trips through toJSON/fromJSON', () => {
      const original = new Listener(250, 150, 270)
      const copy = Listener.fromJSON(original.toJSON())
      expect(copy.x).toBe(original.x)
      expect(copy.y).toBe(original.y)
      expect(copy.angle).toBe(original.angle)
    })
  })

  // ─── dispose ─────────────────────────────────────────────────────────────────

  describe('dispose', () => {
    it('clears _audioContext', () => {
      const l = new Listener()
      l._audioContext = { listener: {} }
      l.dispose()
      expect(l._audioContext).toBeNull()
    })

    it('clears _canvasContext', () => {
      const l = new Listener()
      l._canvasContext = {}
      l.dispose()
      expect(l._canvasContext).toBeNull()
    })
  })
})
