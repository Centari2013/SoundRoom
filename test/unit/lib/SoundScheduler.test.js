import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import SoundScheduler from '@/lib/SoundScheduler'

function makeScheduledSource(id = 'schedule-1') {
  const source = {
    state: {
      schedule: {
        id,
        enabled: true,
        gapMin: 1,
        gapMax: 1,
        timesPlayed: 0,
        isPlaying: false,
        lastPlayedAt: null,
        paused: false,
      },
    },
    playAndWait: vi.fn(async () => {}),
    stop: vi.fn(),
    setLoopingActive: vi.fn(),
  }
  source.instance = source
  return source
}

describe('SoundScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('records the room start time when scheduling begins', () => {
    const scheduler = new SoundScheduler({ soundSources: ref([]), isSourceOnTimeline: () => false })

    scheduler.start()

    expect(scheduler.roomStartTime).toBe(performance.now())
  })

  it('plays a scheduled source and queues the next interval', async () => {
    const source = makeScheduledSource()
    const scheduler = new SoundScheduler({ soundSources: ref([source]), isSourceOnTimeline: () => false })
    scheduler.start()

    scheduler.scheduleNewSource(source)
    await vi.runOnlyPendingTimersAsync()

    expect(source.playAndWait).toHaveBeenCalled()
    expect(source.state.schedule.timesPlayed).toBeGreaterThan(0)
    expect(scheduler.intervals.has('schedule-1')).toBe(true)
    expect(source.setLoopingActive).toHaveBeenCalledWith(true)
  })

  it('pauses non-timeline sources and clears their queued timer', async () => {
    const source = makeScheduledSource()
    const scheduler = new SoundScheduler({ soundSources: ref([source]), isSourceOnTimeline: () => false })
    scheduler.start()
    scheduler.scheduleNewSource(source)
    await vi.runOnlyPendingTimersAsync()

    scheduler.pause()

    expect(source.state.schedule.paused).toBe(true)
    expect(source.setLoopingActive).toHaveBeenLastCalledWith(false)
    expect(scheduler.intervals.has('schedule-1')).toBe(false)
  })

  it('cancels a source schedule and marks it stopped', async () => {
    const source = makeScheduledSource()
    const scheduler = new SoundScheduler({ soundSources: ref([source]), isSourceOnTimeline: () => false })
    scheduler.start()
    scheduler.scheduleNewSource(source)
    await vi.runOnlyPendingTimersAsync()

    scheduler.cancelSchedule(source)

    expect(scheduler.intervals.has('schedule-1')).toBe(false)
    expect(source.state.schedule.loopFn).toBeNull()
    expect(source.state.schedule.paused).toBe(true)
    expect(source.setLoopingActive).toHaveBeenLastCalledWith(false)
  })

  it('does not pause sources controlled by the timeline', () => {
    const source = makeScheduledSource('timeline-source')
    const scheduler = new SoundScheduler({
      soundSources: ref([source]),
      isSourceOnTimeline: (id) => id === 'timeline-source',
    })

    scheduler.pause()

    expect(source.state.schedule.paused).toBe(false)
    expect(source.setLoopingActive).not.toHaveBeenCalled()
  })

  describe('resume', () => {
    it('restores scheduling and re-enables looping after pause', async () => {
      const source = makeScheduledSource()
      const scheduler = new SoundScheduler({ soundSources: ref([source]), isSourceOnTimeline: () => false })
      scheduler.start()
      scheduler.scheduleNewSource(source)
      await vi.runOnlyPendingTimersAsync()

      scheduler.pause()
      source.playAndWait.mockClear()

      scheduler.resume()
      await vi.runOnlyPendingTimersAsync()

      expect(source.state.schedule.paused).toBe(false)
      expect(source.instance.setLoopingActive).toHaveBeenLastCalledWith(true)
      expect(source.playAndWait).toHaveBeenCalled()
    })

    it('does nothing for sources that were not paused', () => {
      const source = makeScheduledSource()
      const scheduler = new SoundScheduler({ soundSources: ref([source]), isSourceOnTimeline: () => false })
      scheduler.start()

      scheduler.resume()

      expect(source.playAndWait).not.toHaveBeenCalled()
    })

    it('skips timeline sources', () => {
      const source = makeScheduledSource('tl-1')
      const scheduler = new SoundScheduler({
        soundSources: ref([source]),
        isSourceOnTimeline: (id) => id === 'tl-1',
      })
      scheduler.start()

      scheduler.resume()

      expect(source.instance.setLoopingActive).not.toHaveBeenCalled()
    })
  })

  describe('stop', () => {
    it('clears all intervals and disables looping on all non-timeline sources', async () => {
      const s1 = makeScheduledSource('s1')
      const s2 = makeScheduledSource('s2')
      const scheduler = new SoundScheduler({ soundSources: ref([s1, s2]), isSourceOnTimeline: () => false })
      scheduler.start()
      scheduler.scheduleNewSource(s1)
      scheduler.scheduleNewSource(s2)
      await vi.runOnlyPendingTimersAsync()

      scheduler.stop()

      expect(scheduler.intervals.size).toBe(0)
      expect(s1.instance.setLoopingActive).toHaveBeenLastCalledWith(false)
      expect(s2.instance.setLoopingActive).toHaveBeenLastCalledWith(false)
    })

    it('leaves timeline sources untouched', async () => {
      const tlSource = makeScheduledSource('tl-1')
      const scheduler = new SoundScheduler({
        soundSources: ref([tlSource]),
        isSourceOnTimeline: (id) => id === 'tl-1',
      })
      scheduler.start()

      scheduler.stop()

      expect(tlSource.instance.setLoopingActive).not.toHaveBeenCalled()
    })
  })

  describe('updateSchedule', () => {
    it('restarts scheduling immediately when the source is not currently playing', async () => {
      const source = makeScheduledSource()
      const scheduler = new SoundScheduler({ soundSources: ref([source]), isSourceOnTimeline: () => false })
      scheduler.start()
      scheduler.scheduleNewSource(source)
      await vi.runOnlyPendingTimersAsync()
      source.playAndWait.mockClear()

      scheduler.updateSchedule(source)
      await vi.runOnlyPendingTimersAsync()

      expect(source.playAndWait).toHaveBeenCalled()
    })

    it('defers the restart until current playback finishes', async () => {
      const source = makeScheduledSource()
      source.playAndWait = vi.fn()
        .mockImplementationOnce(() => new Promise(() => {})) // first call never resolves
        .mockResolvedValue(undefined)
      source.oncePlaybackFinished = vi.fn()

      const scheduler = new SoundScheduler({ soundSources: ref([source]), isSourceOnTimeline: () => false })
      scheduler.start()
      scheduler.scheduleNewSource(source)

      // isPlaying is set synchronously before the awaited promise
      expect(source.state.schedule.isPlaying).toBe(true)

      scheduler.updateSchedule(source)

      expect(source.state.schedule.pendingUpdate).toBe(true)
      expect(source.oncePlaybackFinished).toHaveBeenCalledOnce()

      // Simulate playback finishing by invoking the registered callback.
      // _schedule runs synchronously inside cb(), calling loop() which calls
      // source.playAndWait() synchronously before it first awaits.
      const [cb] = source.oncePlaybackFinished.mock.calls[0]
      cb()

      expect(source.state.schedule.pendingUpdate).toBe(false)
      expect(source.playAndWait).toHaveBeenCalledTimes(2)
    })
  })

  describe('pauseSource / resumeSource', () => {
    it('pauseSource marks the source paused and clears its interval', async () => {
      const source = makeScheduledSource()
      const scheduler = new SoundScheduler({ soundSources: ref([source]), isSourceOnTimeline: () => false })
      scheduler.start()
      scheduler.scheduleNewSource(source)
      await vi.runOnlyPendingTimersAsync()

      scheduler.pauseSource(source)

      expect(source.state.schedule.paused).toBe(true)
      expect(source.state.schedule.stopCurrentLoop).toBe(true)
      expect(source.setLoopingActive).toHaveBeenLastCalledWith(false)
      expect(scheduler.intervals.has('schedule-1')).toBe(false)
    })

    it('resumeSource restarts the loop after a pauseSource', async () => {
      const source = makeScheduledSource()
      const scheduler = new SoundScheduler({ soundSources: ref([source]), isSourceOnTimeline: () => false })
      scheduler.start()
      scheduler.scheduleNewSource(source)
      await vi.runOnlyPendingTimersAsync()

      scheduler.pauseSource(source)
      source.playAndWait.mockClear()

      scheduler.resumeSource(source)
      await vi.runOnlyPendingTimersAsync()

      expect(source.state.schedule.paused).toBe(false)
      expect(source.setLoopingActive).toHaveBeenLastCalledWith(true)
      expect(source.playAndWait).toHaveBeenCalled()
    })

    it('resumeSource starts a fresh schedule when no prior pauseInfo exists', async () => {
      const source = makeScheduledSource()
      const scheduler = new SoundScheduler({ soundSources: ref([source]), isSourceOnTimeline: () => false })
      scheduler.start()

      scheduler.resumeSource(source)
      await vi.runOnlyPendingTimersAsync()

      expect(source.playAndWait).toHaveBeenCalled()
    })
  })

  describe('gap scheduling', () => {
    it('uses randomInRange to derive next interval from gapMin/gapMax', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const source = makeScheduledSource()
      source.state.schedule.gapMin = 2
      source.state.schedule.gapMax = 4
      // expected gap: 0.5 * (4 - 2) + 2 = 3 s = 3000 ms

      const scheduler = new SoundScheduler({ soundSources: ref([source]), isSourceOnTimeline: () => false })
      scheduler.start()
      scheduler.scheduleNewSource(source)
      await vi.runOnlyPendingTimersAsync() // first play completes, 3000 ms timer queued

      source.playAndWait.mockClear()

      await vi.advanceTimersByTimeAsync(2999)
      expect(source.playAndWait).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(2)
      await vi.runOnlyPendingTimersAsync()
      expect(source.playAndWait).toHaveBeenCalled()
    })

    it('continues scheduling after a playback error', async () => {
      let callCount = 0
      const source = makeScheduledSource()
      source.playAndWait = vi.fn(async () => {
        if (++callCount === 1) throw new Error('audio error')
      })

      const scheduler = new SoundScheduler({ soundSources: ref([source]), isSourceOnTimeline: () => false })
      scheduler.start()
      scheduler.scheduleNewSource(source)
      // First loop call fires synchronously (throws); after microtasks flush, the
      // 1000 ms gap timer is queued. runOnlyPendingTimersAsync fires that timer,
      // triggering the second call which succeeds.
      await vi.runOnlyPendingTimersAsync()

      expect(source.playAndWait).toHaveBeenCalledTimes(2)
      expect(source.state.schedule.isPlaying).toBe(false)
    })
  })
})
