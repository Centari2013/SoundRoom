import { describe, it, expect, vi, beforeEach } from 'vitest'
import SoundSource from '../../src/lib/SoundSource.js'
import Room from '../../src/lib/Room.js'

let ctx
let panner
let mainGain
let reverbGain

beforeEach(() => {
  panner = {
    connect: vi.fn(function(){ return this }),
    positionX: { setValueAtTime: vi.fn() },
    positionY: { setValueAtTime: vi.fn() },
    positionZ: { setValueAtTime: vi.fn() },
    orientationX: { setValueAtTime: vi.fn() },
    orientationY: { setValueAtTime: vi.fn() },
    orientationZ: { setValueAtTime: vi.fn() }
  }
  mainGain = { connect: vi.fn(function(){ return this }), gain: { setValueAtTime: vi.fn(), value: 1 } }
  reverbGain = { connect: vi.fn(function(){ return this }), gain: { setValueAtTime: vi.fn(), value: 1 } }
  let callCount = 0
  ctx = {
    currentTime: 0,
    createMediaElementSource: vi.fn(() => ({ connect: vi.fn(function(){ return this }) })),
    createGain: vi.fn(() => {
      callCount++
      if (callCount === 1) return mainGain
      if (callCount === 2) return reverbGain
      return { connect: vi.fn(function(){ return this }), gain: { setValueAtTime: vi.fn(), value: 1 } }
    }),
    createPanner: vi.fn(() => panner),
    createDelay: vi.fn(() => ({ connect: vi.fn(function(){ return this }), delayTime: { value: 0 } })),
    createBiquadFilter: vi.fn(() => ({ connect: vi.fn(function(){ return this }), frequency: { value: 0, setValueAtTime: vi.fn() } })),
    createDynamicsCompressor: vi.fn(() => ({
      connect: vi.fn(function(){ return this }),
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 }
    })),
    destination: {}
  }
  global.Audio = vi.fn(function(){
    this.addEventListener = vi.fn()
    this.pause = vi.fn()
    this.play = vi.fn()
    this.load = vi.fn()
    this.volume = 1
    this.loop = false
    this.preload = ''
  })
})

describe('SoundSource', () => {
  const baseState = { x:0, y:0, angle:0, coneInner:30, coneOuter:60, volume:1, schedule:{} }

  it('sets and gets volume', () => {
    const src = new SoundSource({ audioContext: ctx, masterGain: mainGain, file: 'f', state: { ...baseState } })
    src.setVolume(0.7)
    expect(src.getVolume()).toBe(0.7)
  })

  it('updates audio position and orientation', () => {
    const state = { ...baseState, x:100, y:200, angle:90 }
    const src = new SoundSource({ audioContext: ctx, masterGain: mainGain, file: 'f', state })
    src.updateAudio()
    expect(panner.positionX.setValueAtTime).toHaveBeenCalledWith(1, 0)
    expect(panner.positionY.setValueAtTime).toHaveBeenCalledWith(2, 0)
    expect(panner.orientationX.setValueAtTime.mock.calls[0][0]).toBeCloseTo(0)
    expect(panner.orientationY.setValueAtTime.mock.calls[0][0]).toBeCloseTo(1)
  })

  it('updates gain based on room interaction', () => {
    const state = { ...baseState, x:10, y:10 }
    const src = new SoundSource({ audioContext: ctx, masterGain: mainGain, file: 'f', state })
    const room = new Room(200,200,'r')
    src.updateRoomInteraction(room)
    expect(mainGain.gain.setValueAtTime).toHaveBeenCalled()
    expect(reverbGain.gain.setValueAtTime).toHaveBeenCalled()
  })

  it('reflects paused state through playing getter', () => {
    const state = { ...baseState, schedule: { paused: false } }
    const src = new SoundSource({ audioContext: ctx, masterGain: mainGain, file: 'f', state })
    expect(src.playing).toBe(true)
    src.state.schedule.paused = true
    expect(src.playing).toBe(false)
  })
})
