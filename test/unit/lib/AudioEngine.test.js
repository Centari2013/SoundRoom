import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import AudioEngine from '@/lib/AudioEngine'

function makeSource(id, {
  playing = false,
  schedulePlaying = false,
  locked = false,
  loadAudioBuffer = null,
} = {}) {
  const schedule = {
    id,
    enabled: true,
    gapMin: 1,
    gapMax: 1,
    timesPlayed: 0,
    isPlaying: schedulePlaying,
    lastPlayedAt: null,
    paused: false,
  }

  const instance = {
    locked,
    state: { schedule },
    playing,
    playAndWait: vi.fn(async () => {}),
    loadAudioBuffer: vi.fn(loadAudioBuffer ?? (async () => instance._audioBuffer)),
    scheduleLoaded: vi.fn(),
    stop: vi.fn(() => {
      instance.playing = false
      schedule.isPlaying = false
    }),
    setLoopingActive: vi.fn((active) => {
      instance.playing = active
    }),
    oncePlaybackFinished: vi.fn(),
    _audioBuffer: { duration: 1 },
  }

  return {
    locked,
    state: { schedule },
    instance,
  }
}

describe('AudioEngine media session controls', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('resumes only non-timeline sources that were active when media pause was pressed', async () => {
    const engine = new AudioEngine()
    const active = makeSource('active-source', { playing: true })
    const inactive = makeSource('inactive-source')
    engine.soundSources.value.push(active, inactive)
    engine.getAudioContext().state = 'running'

    expect(engine.pauseForMediaSession()).toBe(true)

    expect(active.instance.setLoopingActive).toHaveBeenCalledWith(false)
    expect(inactive.instance.setLoopingActive).not.toHaveBeenCalled()

    await engine.resumeFromMediaSession()

    expect(active.instance.scheduleLoaded).toHaveBeenCalled()
    expect(inactive.instance.scheduleLoaded).not.toHaveBeenCalled()
  })

  it('pauses a running timeline even when non-timeline sources are also present', () => {
    const engine = new AudioEngine()
    const timelineSource = makeSource('timeline-source')
    const looseSource = makeSource('loose-source')
    engine.soundSources.value.push(timelineSource, looseSource)
    engine.timeline.clips.push({
      id: 'clip-1',
      sourceId: 'timeline-source',
      startTime: 0,
      duration: 1,
    })

    engine.timelineScheduler.isRunning.value = true
    const pauseTimeline = vi.spyOn(engine.timelineScheduler, 'pause')

    engine.pauseAll()

    expect(pauseTimeline).toHaveBeenCalledOnce()
  })

  it('preloads source buffers before playAll starts scheduling playback', async () => {
    let resolveLoad
    const loadPromise = new Promise(resolve => {
      resolveLoad = resolve
    })
    const source = makeSource('scheduled-source', {
      loadAudioBuffer: () => loadPromise,
    })
    const engine = new AudioEngine()
    engine.soundSources.value.push(source)
    engine.getAudioContext().state = 'running'

    const playPromise = engine.playAll()
    await Promise.resolve()

    expect(source.instance.loadAudioBuffer).toHaveBeenCalled()
    expect(source.instance.scheduleLoaded).not.toHaveBeenCalled()

    resolveLoad(source.instance._audioBuffer)
    await playPromise

    expect(source.instance.scheduleLoaded).toHaveBeenCalled()
  })
})
