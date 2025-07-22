import { describe, it, expect, vi, beforeEach } from 'vitest'
import AudioCacheManager from '../../src/lib/AudioCacheManager.js'

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
  keys: vi.fn(async () => [])
}))

const createBlob = () => new Blob(['test'], { type: 'audio/mpeg' })

let manager

beforeEach(() => {
  manager = new AudioCacheManager()
  global.URL.createObjectURL = vi.fn(() => 'blob:url')
  global.URL.revokeObjectURL = vi.fn()
})

describe('AudioCacheManager', () => {
  it('fetches and caches a new blob', async () => {
    const fetchFn = vi.fn(async () => createBlob())
    const url = await manager.getAudioURL('file1', fetchFn)
    expect(url).toBe('blob:url')
    expect(fetchFn).toHaveBeenCalled()
  })

  it('uses memory cache when available', async () => {
    manager.memoryCache.set('file1', 'cached:url')
    const fetchFn = vi.fn()
    const url = await manager.getAudioURL('file1', fetchFn)
    expect(url).toBe('cached:url')
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
