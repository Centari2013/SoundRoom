import { describe, it, expect, vi } from 'vitest'
import Listener from '../src/lib/Listener.js'

const createCtx = () => ({
  listener: {
    setPosition: vi.fn(),
    setOrientation: vi.fn()
  }
})

describe('Listener', () => {
  it('serializes and deserializes', () => {
    const l = new Listener(100, 50, 270)
    const json = l.toJSON()
    expect(json).toEqual({ x: 100, y: 50, angle: 270 })

    const from = Listener.fromJSON(json)
    expect(from.x).toBe(100)
    expect(from.y).toBe(50)
    expect(from.angle).toBe(270)
  })

  it('updates audio position and orientation', () => {
    const ctx = createCtx()
    const l = new Listener()
    l.setAudioContext(ctx)
    l.updateAudio()
    expect(ctx.listener.setPosition).toHaveBeenCalledWith(3, 2, 0)
    const [x, y] = ctx.listener.setOrientation.mock.calls[0]
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(1)
  })

  it('updateAngle changes orientation', () => {
    const ctx = createCtx()
    const l = new Listener()
    l.setAudioContext(ctx)
    l.updateAngle(90)
    const lastCall = ctx.listener.setOrientation.mock.calls.at(-1)
    expect(l.angle).toBe(90)
    expect(lastCall[1]).toBeCloseTo(0)
  })

  it('setCanvasContext stores the context', () => {
    const ref = { value: { foo: 'bar' } }
    const l = new Listener()
    l.setCanvasContext(ref)
    expect(l._canvasContext).toBe(ref.value)
  })
})
