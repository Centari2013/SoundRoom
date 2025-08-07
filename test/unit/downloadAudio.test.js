import { describe, it, expect, beforeEach, vi } from 'vitest'
import downloadAudio, { downloadMultipleAudio } from '../../src/utils/downloadAudio.js'
import { setActivePinia, createPinia } from 'pinia'

let store

vi.mock('../../src/stores/useAudioCacheStore.js', () => ({
  useAudioCacheStore: () => store
}))

beforeEach(() => {
  store = {
    audioCacheManager: {
      getAudioURL: vi.fn(async (id, fetchFn) => 'blob:' + id)
    }
  }
  global.Audio = vi.fn(function (url) {
    this.url = url
    this.preload = ''
    this.addEventListener = vi.fn()
  })
  setActivePinia(createPinia())
})

describe('downloadAudio', () => {
  it('downloads and returns an Audio element', async () => {
    const stop = vi.fn()
    const result = await downloadAudio('bucket', 'path', 'base', true, stop)
    expect(store.audioCacheManager.getAudioURL).toHaveBeenCalledWith('base/bucket/path', expect.any(Function))
    expect(global.Audio).toHaveBeenCalledWith('blob:base/bucket/path')
    const handler = result.audio.addEventListener.mock.calls[0][1]
    handler()
    expect(stop).toHaveBeenCalled()
    expect(result.blobUrl).toBe('blob:base/bucket/path')
    expect(result.audio).not.toBeNull()
  })

  it('skips creating Audio when populateAudio is false', async () => {
    const result = await downloadAudio('b', 'p', 'base', false)
    expect(result.audio).toBeNull()
  })
})

describe('downloadMultipleAudio', () => {
  it('returns audio paths for each source', async () => {
    const list = [
      { id: '1', bucket: 'b1', path: 'p1', base: 'base1' },
      { id: '2', bucket: 'b2', path: 'p2', base: 'base2' }
    ]
    const results = await downloadMultipleAudio(list, false)
    expect(results).toEqual([
      { id: '1', audioPath: 'blob:base1/b1/p1' },
      { id: '2', audioPath: 'blob:base2/b2/p2' }
    ])
  })
})
