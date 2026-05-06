import { describe, expect, it, vi } from 'vitest'
import SoundSource from '@/lib/SoundSource'

vi.mock('@/utils/downloadAudio', () => ({
  fetchAudioBlob: vi.fn(async () => new Blob(['audio'])),
}))

function makeContext() {
  return new AudioContext()
}

function makeSource(overrides = {}) {
  const audioContext = makeContext()
  const masterGain = audioContext.createGain()
  const state = {
    x: 100,
    y: 200,
    angle: 90,
    coneInner: 60,
    coneOuter: 120,
    volume: 0.75,
    ...overrides.state,
  }

  return {
    audioContext,
    masterGain,
    source: new SoundSource({
      audioContext,
      masterGain,
      file: overrides.file ?? '/sounds/rain.wav',
      state,
      audioCacheManager: overrides.audioCacheManager ?? null,
    }),
  }
}

describe('SoundSource', () => {
  it('initializes default schedule and audio routing state', () => {
    const { source } = makeSource()

    expect(source.state.schedule).toMatchObject({
      enabled: false,
      mode: 'interval',
      gapMin: 5,
      gapMax: 10,
      count: 5,
    })
    expect(source.playing).toBe(false)
    expect(source.getVolume()).toBe(0.75)
  })

  it('updates panner position and orientation from canvas state', () => {
    const { source, audioContext } = makeSource()

    source.updateAudio()

    expect(source._pannerNode.positionX.setValueAtTime).toHaveBeenCalledWith(1, audioContext.currentTime)
    expect(source._pannerNode.positionY.setValueAtTime).toHaveBeenCalledWith(2, audioContext.currentTime)
    expect(source._pannerNode.orientationX.setValueAtTime).toHaveBeenCalledWith(
      expect.closeTo(0, 5),
      audioContext.currentTime,
    )
    expect(source._pannerNode.orientationY.setValueAtTime).toHaveBeenCalledWith(1, audioContext.currentTime)
  })

  it('clamps playback offsets to the decoded buffer duration', () => {
    const { source } = makeSource()
    source._audioBuffer = { duration: 10 }

    expect(source._normalizePlaybackOffset(-5)).toBe(0)
    expect(source._normalizePlaybackOffset(Number.NaN)).toBe(0)
    expect(source._normalizePlaybackOffset(99)).toBe(9.999)
    expect(source._normalizePlaybackOffset(3)).toBe(3)
  })

  it('loads audio through the cache manager when one is available', async () => {
    const blob = new Blob(['audio'])
    const cache = {
      getOrFetchBlob: vi.fn(async () => blob),
    }
    const { source, audioContext } = makeSource({
      file: { fileId: 'sound-1', audioPath: '/sounds/rain.wav' },
      audioCacheManager: cache,
    })

    await source.loadAudioBuffer()

    expect(cache.getOrFetchBlob).toHaveBeenCalledWith('sound-1', expect.any(Function))
    expect(audioContext.decodeAudioData).toHaveBeenCalledWith(expect.any(ArrayBuffer))
    expect(source.duration).toBe(1)
  })

  it('starts and stops loaded playback while notifying listeners once', () => {
    const { source, audioContext } = makeSource()
    source._audioBuffer = { duration: 4 }
    const listener = vi.fn()

    source.oncePlaybackFinished(listener)
    source.playLoaded({ offset: 1 })

    expect(source.playing).toBe(true)
    expect(audioContext.createBufferSource).toHaveBeenCalled()

    source.stop()

    expect(listener).toHaveBeenCalledOnce()
    expect(source.playing).toBe(false)
  })

  it('can schedule loaded playback at an AudioContext time without cancelling existing scheduled sources', () => {
    const { source, audioContext } = makeSource()
    source._audioBuffer = { duration: 4 }

    source.scheduleLoaded({ when: 2, offset: 0, duration: 1 })
    source.scheduleLoaded({ when: 3, offset: 1, duration: 1 })

    expect(audioContext.createBufferSource).toHaveBeenCalledTimes(2)
    const first = audioContext.createBufferSource.mock.results[0].value
    const second = audioContext.createBufferSource.mock.results[1].value
    expect(first.start).toHaveBeenCalledWith(2, 0, 1)
    expect(second.start).toHaveBeenCalledWith(3, 1, 1)
    expect(first.stop).not.toHaveBeenCalled()
    expect(source.playing).toBe(true)
  })

  it('disconnects nodes and clears buffers during dispose', () => {
    const { source } = makeSource()
    source._audioBuffer = { duration: 3 }

    source.dispose()

    expect(source._disposed).toBe(true)
    expect(source._audioBuffer).toBeNull()
    expect(source.outputNode).toBeNull()
  })
})
