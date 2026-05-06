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
})
