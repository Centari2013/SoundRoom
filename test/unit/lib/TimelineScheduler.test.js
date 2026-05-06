import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import TimelineScheduler from '@/lib/TimelineScheduler'

function makeEngine({ clips = [], duration = 10, loop = false, sources = [] } = {}) {
  return {
    timeline: { clips, duration, loop },
    soundSources: ref(sources),
  }
}

function sourceFor(scheduleId, overrides = {}) {
  return {
    locked: false,
    instance: {
      state: { schedule: { id: scheduleId } },
      loadAudioBuffer: vi.fn(async () => {}),
      playLoaded: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      _audioBuffer: { duration: 2 },
      ...overrides,
    },
  }
}

describe('TimelineScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16))
    global.cancelAnimationFrame = vi.fn(clearTimeout)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts running from the requested offset and schedules future clips', async () => {
    const source = sourceFor('source-1')
    const engine = makeEngine({
      clips: [{ id: 'clip-1', sourceId: 'source-1', startTime: 2, duration: 1 }],
      sources: [source],
    })
    const scheduler = new TimelineScheduler(engine)

    scheduler.start(1)
    await vi.advanceTimersByTimeAsync(1_000)

    expect(scheduler.isRunning.value).toBe(true)
    expect(source.instance.loadAudioBuffer).toHaveBeenCalledOnce()
    expect(source.instance.playLoaded).toHaveBeenCalledWith({ offset: 0 })
  })

  it('starts clips that are already active at the seek offset', async () => {
    const source = sourceFor('source-1')
    const engine = makeEngine({
      clips: [{ id: 'clip-1', sourceId: 'source-1', startTime: 2, duration: 5, sourceDuration: 10 }],
      sources: [source],
    })
    const scheduler = new TimelineScheduler(engine)

    scheduler.start(4)
    await vi.runOnlyPendingTimersAsync()

    expect(source.instance.playLoaded).toHaveBeenCalledWith({ offset: 2 })
  })

  it('pauses and resumes from the current timeline position', async () => {
    const source = sourceFor('source-1')
    const scheduler = new TimelineScheduler(makeEngine({
      clips: [{ id: 'clip-1', sourceId: 'source-1', startTime: 0, duration: 5 }],
      sources: [source],
    }))

    scheduler.start(0)
    await vi.advanceTimersByTimeAsync(500)
    scheduler.pause()
    const pausedAt = scheduler.currentTime.value

    expect(scheduler.isRunning.value).toBe(false)
    expect(source.instance.stop).toHaveBeenCalled()

    scheduler.resume()
    expect(scheduler.isRunning.value).toBe(true)
    expect(scheduler.currentTime.value).toBeGreaterThanOrEqual(pausedAt)
  })

  it('stops sources and resets time on stop', () => {
    const source = sourceFor('source-1')
    const scheduler = new TimelineScheduler(makeEngine({
      clips: [{ id: 'clip-1', sourceId: 'source-1', startTime: 0, duration: 5 }],
      sources: [source],
    }))

    scheduler.start(3)
    scheduler.stop()

    expect(scheduler.currentTime.value).toBe(0)
    expect(scheduler.isRunning.value).toBe(false)
    expect(source.instance.stop).toHaveBeenCalled()
    expect(source.instance.pause).toHaveBeenCalled()
  })
})
