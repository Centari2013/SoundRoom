import { describe, it, expect } from 'vitest'
import AudioEngine from '../src/lib/AudioEngine.js'

const sampleJson = {
  soundSources: [
    {
      libraryId: 'lib1',
      name: 'test',
      audioPath: 'a',
      index: 0,
      instance: { state: { x:0, y:0, angle:0, coneInner:30, coneOuter:60, schedule:{} } },
      state: { angle:0, coneInner:30, coneOuter:60 }
    }
  ],
  masterVolume: 0.8
}

describe('AudioEngine.fromJSON', () => {
  it('creates an engine with provided master volume', () => {
    const engine = AudioEngine.fromJSON(sampleJson)
    expect(engine.masterVolume.value).toBe(0.8)
  })

  it('throws on invalid json', () => {
    expect(() => AudioEngine.fromJSON({ foo: 'bar' })).toThrow()
  })
})
