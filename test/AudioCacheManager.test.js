import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
  keys: vi.fn(async () => [])
}))

import { del, keys } from 'idb-keyval'
import AudioCacheManager from '../src/lib/AudioCacheManager.js'

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

  it('clears memory cache and revokes urls', () => {
    manager.memoryCache.set('a', 'blob:a')
    manager.memoryCache.set('b', 'blob:b')
    manager.clearMemoryCache()
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:a')
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:b')
    expect(manager.memoryCache.size).toBe(0)
  })

  it('removes a single file from caches', async () => {
    manager.memoryCache.set('foo', 'blob:foo')
    await manager.remove('foo')
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:foo')
    expect(manager.memoryCache.has('foo')).toBe(false)
    expect(del).toHaveBeenCalledWith('foo')
  })

  it('prunes persistent cache beyond limit', async () => {
    keys.mockResolvedValue(['k1','k2','k3','k4'])
    const summary = await manager.prunePersistentCache({ keep: ['k4'], maxCount: 2 })
    expect(del).toHaveBeenCalledWith('k1')
    expect(del).toHaveBeenCalledWith('k2')
    expect(del).toHaveBeenCalledWith('k3')
    expect(summary).toEqual({ total: 4, removed: 3, kept: 1 })
  })

  it('estimates storage when available', async () => {
    global.navigator = { storage: { estimate: vi.fn(async () => ({ usage: 3 * 1024 * 1024, quota: 10 * 1024 * 1024 })) } }
    const info = await manager.estimateStorage()
    expect(info).toEqual({ usageMB: '3.00', quotaMB: '10.00', percent: '30.0' })
  })
})
