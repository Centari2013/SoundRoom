import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useSelectedSource, getSourceName } from '../src/composables/useSelectedSource.js'

let sources
let engine

vi.mock('../src/stores/useAudioEngineStore.js', () => ({
  useAudioEngineStore: () => engine
}))

beforeEach(() => {
  sources = []
  engine = { audioEngine: ref({ soundSources: { get value() { return sources } } }) }
})

describe('getSourceName', () => {
  it('strips extension from file path', () => {
    expect(getSourceName('sounds/foo/bar.mp3')).toBe('bar')
  })
})

describe('useSelectedSource', () => {
  it('returns null when index is invalid', () => {
    const idx = ref(null)
    const { selectedSource } = useSelectedSource(idx)
    expect(selectedSource.value).toBeNull()
  })

  it('exposes selected source with volume', () => {
    sources.push({ instance: { getVolume: () => 0.4 }, state: {} })
    const idx = ref(0)
    const { selectedSource } = useSelectedSource(idx)
    expect(selectedSource.value.volume).toBe(0.4)
  })
})
