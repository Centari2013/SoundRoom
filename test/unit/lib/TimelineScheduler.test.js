import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import TimelineScheduler from '@/lib/TimelineScheduler'

function makeEngine({ clips = [], duration = 10, loop = false, sources = [], currentTime = 0 } = {}) {
  const audioContext = {
    currentTime,
    state: 'running',
    resume: vi.fn(async () => {
      audioContext.state = 'running'
    }),
  }

  return {
    audioContext,
    timeline: { clips, duration, loop },
    soundSources: ref(sources),
    getAudioContext: () => audioContext,
  }
}

function sourceFor(scheduleId, overrides = {}) {
  return {
    locked: false,
    instance: {
      state: { schedule: { id: scheduleId } },
      loadAudioBuffer: vi.fn(async () => {}),
      playLoaded: vi.fn(),
      scheduleLoaded: vi.fn(),
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
    await vi.advanceTimersByTimeAsync(0)

    expect(scheduler.isRunning.value).toBe(true)
    expect(source.instance.loadAudioBuffer).toHaveBeenCalledOnce()
    expect(source.instance.scheduleLoaded).toHaveBeenCalledWith(expect.objectContaining({
      when: 1,
      offset: 0,
      duration: 1,
    }))
  })

  it('starts clips that are already active at the seek offset', async () => {
    const source = sourceFor('source-1')
    const engine = makeEngine({
      clips: [{ id: 'clip-1', sourceId: 'source-1', startTime: 2, duration: 5, sourceDuration: 10 }],
      sources: [source],
    })
    const scheduler = new TimelineScheduler(engine)

    scheduler.start(4)
    await vi.advanceTimersByTimeAsync(0)

    expect(source.instance.scheduleLoaded).toHaveBeenCalledWith(expect.objectContaining({
      offset: expect.closeTo(2.03, 2),
      duration: expect.closeTo(2.97, 2),
    }))
  })

  it('pauses and resumes from the current timeline position', async () => {
    const source = sourceFor('source-1')
    const engine = makeEngine({
      clips: [{ id: 'clip-1', sourceId: 'source-1', startTime: 0, duration: 5 }],
      sources: [source],
    })
    const scheduler = new TimelineScheduler(engine)

    scheduler.start(0)
    engine.audioContext.currentTime = 0.5
    await vi.advanceTimersByTimeAsync(100)
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

  describe('seek', () => {
    it('while running: stops current clips and restarts from the new position', async () => {
      // Use a large audio buffer so the offset does not wrap via modulo
    const source = sourceFor('s1', { _audioBuffer: { duration: 100 } })
      const engine = makeEngine({
        clips: [{ id: 'clip-1', sourceId: 's1', startTime: 0, duration: 10 }],
        sources: [source],
      })
      const scheduler = new TimelineScheduler(engine)

      scheduler.start(0)
      engine.audioContext.currentTime = 0.1
      await vi.advanceTimersByTimeAsync(100)

      scheduler.seek(5)
      await vi.advanceTimersByTimeAsync(0)

      expect(scheduler.isRunning.value).toBe(true)
      expect(scheduler.currentTime.value).toBeGreaterThanOrEqual(5)
      expect(source.instance.scheduleLoaded).toHaveBeenLastCalledWith(expect.objectContaining({
        offset: expect.closeTo(5.03, 2),
      }))
    })

    it('while paused: updates currentTime but does not restart playback', async () => {
      const source = sourceFor('s1')
      const engine = makeEngine({
        clips: [{ id: 'clip-1', sourceId: 's1', startTime: 0, duration: 10 }],
        sources: [source],
      })
      const scheduler = new TimelineScheduler(engine)

      scheduler.start(0)
      engine.audioContext.currentTime = 0.1
      await vi.advanceTimersByTimeAsync(100)
      scheduler.pause()

      source.instance.scheduleLoaded.mockClear()
      scheduler.seek(7)

      expect(scheduler.isRunning.value).toBe(false)
      expect(scheduler.currentTime.value).toBe(7)
      expect(source.instance.scheduleLoaded).not.toHaveBeenCalled()
    })

    it('clamps seek target to [0, duration]', () => {
      const engine = makeEngine({ duration: 8, sources: [] })
      const scheduler = new TimelineScheduler(engine)

      scheduler.seek(-5)
      expect(scheduler.currentTime.value).toBe(0)

      scheduler.seek(999)
      expect(scheduler.currentTime.value).toBe(8)
    })
  })

  describe('loop behavior', () => {
    it('restarts from 0 when loop is true and duration is reached', async () => {
      const engine = makeEngine({ duration: 1, loop: true, sources: [] })
      const scheduler = new TimelineScheduler(engine)

      scheduler.start(0)
      engine.audioContext.currentTime = 1.5
      await vi.advanceTimersByTimeAsync(100) // 500 ms past the 1 s duration

      expect(scheduler.isRunning.value).toBe(true)
      expect(scheduler.currentTime.value).toBeLessThan(1)
    })

    it('stops and clamps currentTime to duration when loop is false', async () => {
      const engine = makeEngine({ duration: 1, loop: false, sources: [] })
      const scheduler = new TimelineScheduler(engine)

      scheduler.start(0)
      engine.audioContext.currentTime = 1.5
      await vi.advanceTimersByTimeAsync(100)

      expect(scheduler.isRunning.value).toBe(false)
      expect(scheduler.currentTime.value).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('skips a clip whose sourceId has no matching source', async () => {
      const engine = makeEngine({
        clips: [{ id: 'clip-1', sourceId: 'ghost', startTime: 0, duration: 5 }],
        sources: [],
      })
      const scheduler = new TimelineScheduler(engine)

      expect(() => scheduler.start(0)).not.toThrow()
      await vi.advanceTimersByTimeAsync(0)

      expect(scheduler.isRunning.value).toBe(true)
    })

    it('skips locked sources', async () => {
      const source = sourceFor('s1')
      source.locked = true
      const scheduler = new TimelineScheduler(makeEngine({
        clips: [{ id: 'clip-1', sourceId: 's1', startTime: 0, duration: 5 }],
        sources: [source],
      }))

      scheduler.start(0)
      await vi.advanceTimersByTimeAsync(0)

      expect(source.instance.loadAudioBuffer).not.toHaveBeenCalled()
      expect(source.instance.scheduleLoaded).not.toHaveBeenCalled()
    })

    it('continues running after loadAudioBuffer rejects', async () => {
      const source = sourceFor('s1')
      source.instance.loadAudioBuffer = vi.fn().mockRejectedValue(new Error('load failed'))
      const scheduler = new TimelineScheduler(makeEngine({
        clips: [{ id: 'clip-1', sourceId: 's1', startTime: 0, duration: 5 }],
        sources: [source],
      }))

      scheduler.start(0)
      await vi.advanceTimersByTimeAsync(0)

      expect(source.instance.scheduleLoaded).not.toHaveBeenCalled()
      expect(scheduler.isRunning.value).toBe(true)
    })
  })

  describe('segment re-scheduling', () => {
    it('loops the audio source within a clip when sourceDuration < clip duration', async () => {
      // source audio is 2 s; clip is 6 s → plays source 3 times end-to-end
      const source = sourceFor('s1') // _audioBuffer.duration = 2
      const scheduler = new TimelineScheduler(makeEngine({
        clips: [{ id: 'clip-1', sourceId: 's1', startTime: 0, duration: 6 }],
        sources: [source],
      }))

      scheduler.start(0)
      await vi.advanceTimersByTimeAsync(0)

      expect(source.instance.scheduleLoaded).toHaveBeenCalledTimes(3)
      expect(source.instance.scheduleLoaded).toHaveBeenNthCalledWith(1, expect.objectContaining({
        offset: expect.closeTo(0.03, 2),
        duration: expect.closeTo(1.97, 2),
      }))
      expect(source.instance.scheduleLoaded).toHaveBeenNthCalledWith(2, expect.objectContaining({ offset: 0, duration: 2 }))
      expect(source.instance.scheduleLoaded).toHaveBeenNthCalledWith(3, expect.objectContaining({ offset: 0, duration: 2 }))
    })
  })

  describe('dispose', () => {
    it('stops all playback and marks the scheduler as not running', async () => {
      const source = sourceFor('s1')
      const scheduler = new TimelineScheduler(makeEngine({
        clips: [{ id: 'clip-1', sourceId: 's1', startTime: 0, duration: 5 }],
        sources: [source],
      }))

      scheduler.start(0)
      await vi.advanceTimersByTimeAsync(0)
      scheduler.dispose()

      expect(scheduler.isRunning.value).toBe(false)
      expect(source.instance.stop).toHaveBeenCalled()
    })
  })
})
