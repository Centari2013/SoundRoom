import { describe, it, expect, vi, beforeEach } from 'vitest'
import AudioCacheManager from '@/lib/AudioCacheManager'

// Mock idb-keyval so tests do not touch a real IndexedDB
const mockStore = new Map()

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key) => mockStore.get(key)),
  set: vi.fn(async (key, val) => mockStore.set(key, val)),
  del: vi.fn(async (key) => mockStore.delete(key)),
  keys: vi.fn(async () => [...mockStore.keys()]),
}))

import { get, set, del, keys } from 'idb-keyval'

describe('AudioCacheManager', () => {
  beforeEach(() => {
    mockStore.clear()
    vi.clearAllMocks()
    // Reset URL mock counters
    URL.createObjectURL.mockClear?.()
    URL.revokeObjectURL.mockClear?.()
  })

  // ─── Constructor ─────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('starts with an empty memory cache', () => {
      const mgr = new AudioCacheManager()
      expect(mgr.memoryCache.size).toBe(0)
      expect(mgr.bufferCache.size).toBe(0)
    })

    it('accepts an optional AudioContext', () => {
      const ctx = { state: 'suspended' }
      const mgr = new AudioCacheManager(ctx)
      expect(mgr.audioContext).toBe(ctx)
    })

    it('defaults maxEntries to 20', () => {
      const mgr = new AudioCacheManager()
      expect(mgr._maxEntries).toBe(20)
    })

    it('defaults maxPersistentEntries to 100', () => {
      const mgr = new AudioCacheManager()
      expect(mgr._maxPersistentEntries).toBe(100)
    })

    it('defaults maxDecodedBuffers to 30', () => {
      const mgr = new AudioCacheManager()
      expect(mgr._maxDecodedBuffers).toBe(30)
    })

    it('accepts custom limits', () => {
      const mgr = new AudioCacheManager(null, 5, 50, 10)
      expect(mgr._maxEntries).toBe(5)
      expect(mgr._maxPersistentEntries).toBe(50)
      expect(mgr._maxDecodedBuffers).toBe(10)
    })
  })

  // ─── setAudioContext ──────────────────────────────────────────────────────────

  describe('setAudioContext', () => {
    it('sets the audio context when none exists', () => {
      const mgr = new AudioCacheManager()
      const ctx = {}
      mgr.setAudioContext(ctx)
      expect(mgr.audioContext).toBe(ctx)
    })

    it('ignores a second call and warns', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const mgr = new AudioCacheManager()
      const first = {}
      const second = {}
      mgr.setAudioContext(first)
      mgr.setAudioContext(second)
      expect(mgr.audioContext).toBe(first)
      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })
  })

  // ─── setMaxPersistentEntries ──────────────────────────────────────────────────

  describe('setMaxPersistentEntries', () => {
    it('updates the persistent limit', () => {
      const mgr = new AudioCacheManager()
      mgr.setMaxPersistentEntries(25)
      expect(mgr._maxPersistentEntries).toBe(25)
    })
  })

  // ─── _touch (in-memory LRU) ──────────────────────────────────────────────────

  describe('_touch', () => {
    it('adds a new entry to the memory cache', () => {
      const mgr = new AudioCacheManager()
      mgr._touch('file-1', 'blob:url-1')
      expect(mgr.memoryCache.has('file-1')).toBe(true)
    })

    it('moves an existing entry to the end (most-recently-used)', () => {
      const mgr = new AudioCacheManager()
      mgr._touch('a', 'blob:a')
      mgr._touch('b', 'blob:b')
      mgr._touch('a', 'blob:a') // re-touch a
      const keys = [...mgr.memoryCache.keys()]
      expect(keys[keys.length - 1]).toBe('a')
    })

    it('evicts the oldest entry when capacity is exceeded', () => {
      const mgr = new AudioCacheManager(null, 3)
      mgr._touch('x', 'blob:x')
      mgr._touch('y', 'blob:y')
      mgr._touch('z', 'blob:z')
      mgr._touch('w', 'blob:w') // should evict 'x'
      expect(mgr.memoryCache.has('x')).toBe(false)
      expect(mgr.memoryCache.has('w')).toBe(true)
    })

    it('calls URL.revokeObjectURL for the evicted entry', () => {
      const mgr = new AudioCacheManager(null, 2)
      mgr._touch('a', 'blob:a')
      mgr._touch('b', 'blob:b')
      mgr._touch('c', 'blob:c') // evicts 'a'
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:a')
    })
  })

  // ─── getAudioURL ─────────────────────────────────────────────────────────────

  describe('getAudioURL', () => {
    it('returns a cached URL from memory without calling fetchFn', async () => {
      const mgr = new AudioCacheManager()
      mgr._touch('cached', 'blob:already-there')
      const fetchFn = vi.fn()
      const url = await mgr.getAudioURL('cached', fetchFn)
      expect(url).toBe('blob:already-there')
      expect(fetchFn).not.toHaveBeenCalled()
    })

    it('calls fetchFn when the file is not in memory or IndexedDB', async () => {
      const mgr = new AudioCacheManager()
      const blob = new Blob(['audio data'])
      const fetchFn = vi.fn().mockResolvedValue(blob)
      await mgr.getAudioURL('new-file', fetchFn)
      expect(fetchFn).toHaveBeenCalled()
    })

    it('stores the fetched blob in IndexedDB', async () => {
      const mgr = new AudioCacheManager()
      const blob = new Blob(['audio data'])
      const fetchFn = vi.fn().mockResolvedValue(blob)
      await mgr.getAudioURL('store-me', fetchFn)
      expect(set).toHaveBeenCalledWith('store-me', blob)
    })

    it('returns a URL from IndexedDB without calling fetchFn', async () => {
      const blob = new Blob(['cached blob'])
      mockStore.set('idb-file', blob)
      const mgr = new AudioCacheManager()
      const fetchFn = vi.fn()
      const url = await mgr.getAudioURL('idb-file', fetchFn)
      expect(fetchFn).not.toHaveBeenCalled()
      expect(typeof url).toBe('string')
    })
  })

  // ─── getAudioBuffer ──────────────────────────────────────────────────────────

  describe('getAudioBuffer', () => {
    it('returns a decoded buffer from memory without fetching or decoding twice', async () => {
      const decoded = { duration: 1 }
      const ctx = { decodeAudioData: vi.fn(async () => decoded) }
      const mgr = new AudioCacheManager(ctx)
      const fetchFn = vi.fn(async () => new Blob(['audio data']))

      const first = await mgr.getAudioBuffer('sound-1', fetchFn)
      const second = await mgr.getAudioBuffer('sound-1', fetchFn)

      expect(first).toBe(decoded)
      expect(second).toBe(decoded)
      expect(fetchFn).toHaveBeenCalledOnce()
      expect(ctx.decodeAudioData).toHaveBeenCalledOnce()
    })

    it('shares an in-flight decode for the same file id', async () => {
      const decoded = { duration: 1 }
      const ctx = { decodeAudioData: vi.fn(async () => decoded) }
      const mgr = new AudioCacheManager(ctx)
      const fetchFn = vi.fn(async () => new Blob(['audio data']))

      const [first, second] = await Promise.all([
        mgr.getAudioBuffer('sound-1', fetchFn),
        mgr.getAudioBuffer('sound-1', fetchFn),
      ])

      expect(first).toBe(decoded)
      expect(second).toBe(decoded)
      expect(fetchFn).toHaveBeenCalledOnce()
      expect(ctx.decodeAudioData).toHaveBeenCalledOnce()
    })

    it('evicts the oldest decoded buffer when capacity is exceeded', async () => {
      const ctx = { decodeAudioData: vi.fn(async () => ({ duration: 1 })) }
      const mgr = new AudioCacheManager(ctx, 20, 100, 1)
      const fetchFn = vi.fn(async () => new Blob(['audio data']))

      await mgr.getAudioBuffer('first', fetchFn)
      await mgr.getAudioBuffer('second', fetchFn)

      expect(mgr.bufferCache.has('first')).toBe(false)
      expect(mgr.bufferCache.has('second')).toBe(true)
    })
  })

  // ─── clearMemoryCache ────────────────────────────────────────────────────────

  describe('clearMemoryCache', () => {
    it('removes all entries from the memory cache', () => {
      const mgr = new AudioCacheManager()
      mgr._touch('a', 'blob:a')
      mgr._touch('b', 'blob:b')
      mgr._touchBuffer('decoded', { duration: 1 })
      mgr.clearMemoryCache()
      expect(mgr.memoryCache.size).toBe(0)
      expect(mgr.bufferCache.size).toBe(0)
    })

    it('revokes object URLs for all cleared entries', () => {
      const mgr = new AudioCacheManager()
      mgr._touch('x', 'blob:x')
      mgr._touch('y', 'blob:y')
      mgr.clearMemoryCache()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x')
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:y')
    })
  })

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes the entry from memory cache', async () => {
      const mgr = new AudioCacheManager()
      mgr._touch('del-me', 'blob:del-me')
      mgr._touchBuffer('del-me', { duration: 1 })
      await mgr.remove('del-me')
      expect(mgr.memoryCache.has('del-me')).toBe(false)
      expect(mgr.bufferCache.has('del-me')).toBe(false)
    })

    it('calls del on IndexedDB', async () => {
      const mgr = new AudioCacheManager()
      await mgr.remove('some-key')
      expect(del).toHaveBeenCalledWith('some-key')
    })

    it('revokes the object URL when removing from memory', async () => {
      const mgr = new AudioCacheManager()
      mgr._touch('rr', 'blob:rr-url')
      await mgr.remove('rr')
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:rr-url')
    })
  })

  // ─── addBlob ──────────────────────────────────────────────────────────────────

  describe('addBlob', () => {
    it('stores the blob in IndexedDB', async () => {
      const mgr = new AudioCacheManager()
      const blob = new Blob(['test'])
      await mgr.addBlob('blob-key', blob)
      expect(set).toHaveBeenCalledWith('blob-key', blob)
    })
  })

  // ─── prunePersistentCache ────────────────────────────────────────────────────

  describe('prunePersistentCache', () => {
    it('returns stats in dryRun mode without deleting', async () => {
      mockStore.set('k1', new Blob())
      mockStore.set('k2', new Blob())
      const mgr = new AudioCacheManager()
      const result = await mgr.prunePersistentCache({ keep: [], maxCount: 5, dryRun: true })
      expect(result.total).toBe(2)
      expect(del).not.toHaveBeenCalled()
    })

    it('deletes keys not in the keep list', async () => {
      mockStore.set('keep-me', new Blob())
      mockStore.set('purge-me', new Blob())
      const mgr = new AudioCacheManager()
      await mgr.prunePersistentCache({ keep: ['keep-me'], maxCount: 10 })
      expect(del).toHaveBeenCalledWith('purge-me')
      expect(del).not.toHaveBeenCalledWith('keep-me')
    })

    it('reports correct removed/kept counts', async () => {
      mockStore.set('a', new Blob())
      mockStore.set('b', new Blob())
      mockStore.set('c', new Blob())
      const mgr = new AudioCacheManager()
      const result = await mgr.prunePersistentCache({ keep: ['a'], maxCount: 10, dryRun: true })
      expect(result.total).toBe(3)
      expect(result.kept).toBe(1)
      expect(result.removed).toBe(2)
    })
  })
})
