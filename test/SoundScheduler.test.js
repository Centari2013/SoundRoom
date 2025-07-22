import { describe, it, expect, vi, beforeEach } from 'vitest'
import SoundScheduler from '../src/lib/SoundScheduler.js'

const createSource = (playing = true) => {
  return {
    forcePlayFromStart: vi.fn(),
    _audioElement: {
      addEventListener: vi.fn((_, h) => { queueMicrotask(h) }),
      removeEventListener: vi.fn(),
      pause: vi.fn()
    },
    state: {
      schedule: {
        id: crypto.randomUUID(),
        enabled: true,
        gapMin: 0.1,
        gapMax: 0.2,
        isPlaying: playing,
        paused: false
      }
    }
  }
}

let scheduler
let engine

beforeEach(() => {
  engine = { soundSources: { value: [] } }
  scheduler = new SoundScheduler(engine)
  vi.useFakeTimers()
})

describe('SoundScheduler.start', () => {
  it('starts only playing sources', () => {
    const src1 = createSource(true)
    const src2 = createSource(false)
    engine.soundSources.value = [{ instance: src1 }, { instance: src2 }]
    const spy = vi.spyOn(scheduler, '_schedule')

    scheduler.start()

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(src1)
    expect(src1.state.schedule.paused).toBe(false)
    expect(src2.state.schedule.paused).toBe(true)
  })
})

describe('SoundScheduler scheduling loop', () => {
  it('initializes loop and stores timeout', async () => {
    const src = createSource(true)
    scheduler._schedule(src)
    await vi.runAllTicks(); await vi.runAllTicks(); await vi.runAllTicks()
    expect(src.forcePlayFromStart).toHaveBeenCalled()
    expect(scheduler.intervals.size).toBe(1)
    const info = scheduler.pauseInfo.get(src.state.schedule.id)
    expect(info).toBeDefined()
    expect(info.remainingGapMs).toBeGreaterThan(0)
  })

  it('pauses and resumes a source', async () => {
    const src = createSource(true)
    scheduler._schedule(src)
    await vi.runAllTicks(); await vi.runAllTicks(); await vi.runAllTicks()
    scheduler.pauseSource(src)
    expect(scheduler.intervals.size).toBe(0)
    expect(src.state.schedule.paused).toBe(true)

    scheduler.resumeSource(src)
    await vi.runAllTicks(); await vi.runAllTicks(); await vi.runAllTicks()
    expect(scheduler.intervals.size).toBe(1)
    expect(src.state.schedule.paused).toBe(false)
  })
})

