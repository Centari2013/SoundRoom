import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import SoundScheduler from '@/lib/SoundScheduler'

function makeAudioContext(currentTime = 0) {
  const audioContext = {
    currentTime,
    state: 'running',
    resume: vi.fn(async () => {
      audioContext.state = 'running'
    }),
  }
  return audioContext
}

function makeEngine({ sources = [], timelineSourceIds = new Set(), audioContext = makeAudioContext() } = {}) {
  return {
    soundSources: ref(sources),
    getAudioContext: () => audioContext,
    isSourceOnTimeline: (id) => timelineSourceIds.has(id),
  }
}

function makeScheduledSource(id = 'schedule-1', overrides = {}) {
  const schedule = {
    id,
    enabled: true,
    mode: 'interval',
    gapMin: 1,
    gapMax: 1,
    count: null,
    activeStart: 0,
    activeEnd: 300,
    restart: false,
    timesPlayed: 0,
    isPlaying: false,
    lastPlayedAt: null,
    paused: false,
    stopCurrentLoop: false,
    ...overrides.schedule,
  }

  const source = {
    locked: false,
    state: { schedule },
    _audioBuffer: { duration: 1 },
    loadAudioBuffer: vi.fn(async () => source._audioBuffer),
    scheduleLoaded: vi.fn((event) => {
      source._scheduled.push(event)
      source._lastOnEnded = event.onended
    }),
    stop: vi.fn(),
    setLoopingActive: vi.fn(),
    oncePlaybackFinished: vi.fn((callback) => {
      source._finishCallback = callback
    }),
    _scheduled: [],
    ...overrides.source,
  }
  source.instance = source
  return source
}

function makeScheduler(engine, options = {}) {
  return new SoundScheduler(engine, {
    lookaheadSeconds: 0.05,
    hiddenLookaheadSeconds: 5,
    scheduleIntervalMs: 100,
    hiddenScheduleIntervalMs: 1000,
    ...options,
  })
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

  it('records the room start time from AudioContext.currentTime', () => {
    const audioContext = makeAudioContext(42)
    const scheduler = makeScheduler(makeEngine({ audioContext }))

    scheduler.start()

    expect(scheduler.roomStartTime).toBe(42)
  })

  it('loads the buffer and schedules playback against AudioContext time', async () => {
    const audioContext = makeAudioContext(10)
    const source = makeScheduledSource('schedule-1', {
      source: {
        _audioBuffer: null,
        loadAudioBuffer: vi.fn(async () => {
          source._audioBuffer = { duration: 1 }
          return source._audioBuffer
        }),
      },
    })
    const scheduler = makeScheduler(makeEngine({ sources: [source], audioContext }))

    scheduler.scheduleNewSource(source)
    await vi.advanceTimersByTimeAsync(0)

    expect(source.loadAudioBuffer).toHaveBeenCalledOnce()
    expect(source.scheduleLoaded).toHaveBeenCalledWith(expect.objectContaining({
      when: expect.closeTo(10.03, 3),
      offset: 0,
      duration: 1,
    }))
    expect(source.state.schedule.timesPlayed).toBe(1)
    expect(source.setLoopingActive).toHaveBeenCalledWith(true)
  })

  it('fills a rolling lookahead without waiting for playback-end callbacks', () => {
    const source = makeScheduledSource()
    const scheduler = makeScheduler(makeEngine({ sources: [source] }), { lookaheadSeconds: 5 })

    scheduler.scheduleNewSource(source)

    expect(source.scheduleLoaded).toHaveBeenCalledTimes(3)
    expect(source.scheduleLoaded).toHaveBeenNthCalledWith(1, expect.objectContaining({ when: expect.closeTo(0.03, 3) }))
    expect(source.scheduleLoaded).toHaveBeenNthCalledWith(2, expect.objectContaining({ when: expect.closeTo(2.03, 3) }))
    expect(source.scheduleLoaded).toHaveBeenNthCalledWith(3, expect.objectContaining({ when: expect.closeTo(4.03, 3) }))
  })

  it('ignores sources that are controlled by the timeline scheduler', () => {
    const source = makeScheduledSource('timeline-source')
    const scheduler = makeScheduler(makeEngine({
      sources: [source],
      timelineSourceIds: new Set(['timeline-source']),
    }))

    scheduler.scheduleNewSource(source)
    scheduler.pause()
    scheduler.resume()

    expect(source.scheduleLoaded).not.toHaveBeenCalled()
    expect(source.setLoopingActive).not.toHaveBeenCalled()
  })

  it('pauses an audible clip, stores its audio-clock offset, and cancels queued nodes', () => {
    const audioContext = makeAudioContext(0)
    const source = makeScheduledSource()
    const scheduler = makeScheduler(makeEngine({ sources: [source], audioContext }))
    scheduler.scheduleNewSource(source)

    audioContext.currentTime = 0.4
    scheduler.pauseSource(source)

    const info = scheduler.pauseInfo.get('schedule-1')
    expect(info).toMatchObject({
      isPaused: true,
      mode: 'clip',
      clipOffset: expect.closeTo(0.37, 2),
      clipRemainingSeconds: expect.closeTo(0.63, 2),
    })
    expect(source.stop).toHaveBeenCalledOnce()
    expect(source.state.schedule.paused).toBe(true)
    expect(scheduler.intervals.has('schedule-1')).toBe(false)
  })

  it('resumes a paused audible clip from the saved buffer offset', () => {
    const audioContext = makeAudioContext(0)
    const source = makeScheduledSource()
    const scheduler = makeScheduler(makeEngine({ sources: [source], audioContext }))
    scheduler.scheduleNewSource(source)

    audioContext.currentTime = 0.4
    scheduler.pauseSource(source)
    source.scheduleLoaded.mockClear()

    audioContext.currentTime = 5
    scheduler.resumeSource(source)

    expect(source.scheduleLoaded).toHaveBeenCalledWith(expect.objectContaining({
      when: expect.closeTo(5.03, 3),
      offset: expect.closeTo(0.37, 2),
      duration: expect.closeTo(0.63, 2),
    }))
    expect(source.state.schedule.paused).toBe(false)
    expect(source.setLoopingActive).toHaveBeenLastCalledWith(true)
  })

  it('preserves remaining wait time when pausing before the next scheduled start', () => {
    const audioContext = makeAudioContext(0)
    const source = makeScheduledSource('schedule-1', {
      schedule: { activeStart: 5 },
    })
    const scheduler = makeScheduler(makeEngine({ sources: [source], audioContext }))
    scheduler.scheduleNewSource(source)

    audioContext.currentTime = 1
    scheduler.pauseSource(source)

    expect(scheduler.pauseInfo.get('schedule-1')).toMatchObject({
      mode: 'gap',
      remainingSeconds: 4,
    })

    audioContext.currentTime = 20
    scheduler.resumeSource(source)

    expect(scheduler.intervals.get('schedule-1').nextStartTime).toBeCloseTo(24)
  })

  it('cancels a source schedule and stops queued playback', () => {
    const source = makeScheduledSource()
    const scheduler = makeScheduler(makeEngine({ sources: [source] }))
    scheduler.scheduleNewSource(source)

    scheduler.cancelSchedule(source)

    expect(scheduler.intervals.has('schedule-1')).toBe(false)
    expect(scheduler.pauseInfo.has('schedule-1')).toBe(false)
    expect(source.stop).toHaveBeenCalledOnce()
    expect(source.state.schedule.paused).toBe(true)
    expect(source.setLoopingActive).toHaveBeenLastCalledWith(false)
  })

  it('stops all entries and removes lifecycle handlers', () => {
    const s1 = makeScheduledSource('s1')
    const s2 = makeScheduledSource('s2')
    const scheduler = makeScheduler(makeEngine({ sources: [s1, s2] }))
    scheduler.scheduleNewSource(s1)
    scheduler.scheduleNewSource(s2)

    scheduler.stop()

    expect(scheduler.intervals.size).toBe(0)
    expect(scheduler.pauseInfo.size).toBe(0)
    expect(scheduler.roomStartTime).toBeNull()
    expect(s1.stop).toHaveBeenCalledOnce()
    expect(s2.stop).toHaveBeenCalledOnce()
  })

  it('restarts immediately when only future events are queued', () => {
    const source = makeScheduledSource()
    const scheduler = makeScheduler(makeEngine({ sources: [source] }))
    scheduler.scheduleNewSource(source)

    scheduler.updateSchedule(source)

    expect(source.oncePlaybackFinished).not.toHaveBeenCalled()
    expect(source.stop).toHaveBeenCalledOnce()
    expect(source.scheduleLoaded).toHaveBeenCalledTimes(2)
  })

  it('defers schedule updates while a clip is currently audible', () => {
    const audioContext = makeAudioContext(0)
    const source = makeScheduledSource()
    const scheduler = makeScheduler(makeEngine({ sources: [source], audioContext }))
    scheduler.scheduleNewSource(source)

    audioContext.currentTime = 0.4
    scheduler.updateSchedule(source)

    expect(source.state.schedule.pendingUpdate).toBe(true)
    expect(source.oncePlaybackFinished).toHaveBeenCalledOnce()

    source._finishCallback()

    expect(source.state.schedule.pendingUpdate).toBe(false)
    expect(source.stop).toHaveBeenCalledOnce()
    expect(source.scheduleLoaded).toHaveBeenCalledTimes(2)
  })

  it('retires count-based schedules after the allowed number of starts', () => {
    const source = makeScheduledSource('schedule-1', {
      schedule: { mode: 'count', count: 2 },
    })
    const scheduler = makeScheduler(makeEngine({ sources: [source] }), { lookaheadSeconds: 5 })

    scheduler.scheduleNewSource(source)

    expect(source.scheduleLoaded).toHaveBeenCalledTimes(2)
    expect(source.state.schedule.timesPlayed).toBe(2)
    expect(scheduler.intervals.has('schedule-1')).toBe(false)
    expect(source.stop).not.toHaveBeenCalled()

    source._scheduled.forEach(event => event.onended())

    expect(scheduler.pauseInfo.has('schedule-1')).toBe(false)
    expect(source.setLoopingActive).toHaveBeenLastCalledWith(false)
    expect(source.state.schedule.paused).toBe(true)
  })

  it('clips playback duration at activeEnd instead of crossing the active window', () => {
    const source = makeScheduledSource('schedule-1', {
      schedule: { activeEnd: 0.5 },
    })
    const scheduler = makeScheduler(makeEngine({ sources: [source] }))

    scheduler.scheduleNewSource(source)

    expect(source.scheduleLoaded).toHaveBeenCalledWith(expect.objectContaining({
      when: expect.closeTo(0.03, 3),
      duration: expect.closeTo(0.47, 2),
    }))
  })

  it('extends the scheduling horizon while the document is hidden', () => {
    const hiddenSpy = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    const source = makeScheduledSource()
    const scheduler = makeScheduler(makeEngine({ sources: [source] }), {
      lookaheadSeconds: 0.05,
      hiddenLookaheadSeconds: 5,
    })

    scheduler.scheduleNewSource(source)

    expect(source.scheduleLoaded).toHaveBeenCalledTimes(3)
    hiddenSpy.mockRestore()
  })

  it('resumes a suspended AudioContext on visibility return before scheduling', async () => {
    const audioContext = makeAudioContext(0)
    audioContext.state = 'suspended'
    const source = makeScheduledSource()
    const scheduler = makeScheduler(makeEngine({ sources: [source], audioContext }))
    scheduler.scheduleNewSource(source)

    expect(source.scheduleLoaded).not.toHaveBeenCalled()

    await scheduler._handleVisibilityChange()

    expect(audioContext.resume).toHaveBeenCalledOnce()
    expect(source.scheduleLoaded).toHaveBeenCalledOnce()
  })
})
