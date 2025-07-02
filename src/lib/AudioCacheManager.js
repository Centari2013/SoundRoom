import { get, set, del, keys } from 'idb-keyval'

export default class AudioCacheManager {
  constructor(audioContext, maxEntries = 20, maxPersistentEntries = 100) {
    this.memoryCache = new Map()
    this.audioContext = audioContext || null
    this._maxEntries = maxEntries
    this._maxPersistentEntries = maxPersistentEntries
  }

  setAudioContext(audioContext) {
    if (this.audioContext) {
      console.warn('AudioContext already set, ignoring new context')
      return
    }
    this.audioContext = audioContext
  }

  setMaxPersistentEntries(max) {
    this._maxPersistentEntries = max
  }

  // 🔁 Used by memory Map to evict old items
  _touch(fileId, url) {
    if (this.memoryCache.has(fileId)) {
      this.memoryCache.delete(fileId)
    }
    this.memoryCache.set(fileId, url)

    if (this.memoryCache.size > this._maxEntries) {
      const [oldestId] = this.memoryCache.keys()
      const oldestUrl = this.memoryCache.get(oldestId)
      if (oldestUrl) URL.revokeObjectURL(oldestUrl)
      this.memoryCache.delete(oldestId)
    }
  }

  async getAudioURL(fileId, fetchFn) {
    if (this.memoryCache.has(fileId)) {
      const url = this.memoryCache.get(fileId)
      this._touch(fileId, url)
      return url
    }

    let blob = await get(fileId)
    if (!blob) {
      blob = await fetchFn()
      await set(fileId, blob)
    }

    const url = URL.createObjectURL(blob)
    this._touch(fileId, url)
    return url
  }

  async getAudioBuffer(fileId, fetchFn) {
    const blob = await this.getOrFetchBlob(fileId, fetchFn)
    const arrayBuffer = await blob.arrayBuffer()
    return await this.audioContext.decodeAudioData(arrayBuffer)
  }
    // Add a blob to persistent cache and trigger pruning
  async addBlob(fileId, blob) {
    await set(fileId, blob)
    await this._ensurePersistentLimit([fileId])
  }

  async getOrFetchBlob(fileId, fetchFn) {
    let blob = await get(fileId)
    if (!blob) {
      blob = await fetchFn()
      await set(fileId, blob)
      await this._ensurePersistentLimit([fileId])
    }
    return blob
  }

  async _ensurePersistentLimit(extraKeep = []) {
    if (this._maxPersistentEntries === 0) return // infinite allowed
    const allKeys = await keys()
    if (allKeys.length <= this._maxPersistentEntries) return

    const keepKeys = [...this.memoryCache.keys(), ...extraKeep]
    await this.prunePersistentCache({
      keep: keepKeys,
      maxCount: this._maxPersistentEntries,
    })
  }

  clearMemoryCache() {
    for (const url of this.memoryCache.values()) {
      URL.revokeObjectURL(url)
    }
    this.memoryCache.clear()
  }

  async clearPersistentCache() {
    const allKeys = await keys()
    await Promise.all(allKeys.map(k => del(k)))
  }

  async remove(fileId) {
    const url = this.memoryCache.get(fileId)
    if (url) URL.revokeObjectURL(url)
    this.memoryCache.delete(fileId)
    await del(fileId)
  }

  // Self-cleaner: prune all persistent cache except whitelisted keys
  async prunePersistentCache({ keep = [], maxCount = 100, dryRun = false } = {}) {
    const allKeys = await keys()

    // If the cache is under maxCount, do nothing
    if (allKeys.length <= maxCount && keep.length === 0) return

    const keysToRemove = allKeys.filter(k => !keep.includes(k))

    if (keysToRemove.length > 0 && !dryRun) {
      await Promise.all(keysToRemove.map(k => del(k)))
    }

    return {
      total: allKeys.length,
      removed: keysToRemove.length,
      kept: allKeys.length - keysToRemove.length
    }
  }

  // get usage in MB
  async estimateStorage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { usage, quota } = await navigator.storage.estimate()
      return {
        usageMB: (usage / 1024 / 1024).toFixed(2),
        quotaMB: (quota / 1024 / 1024).toFixed(2),
        percent: ((usage / quota) * 100).toFixed(1)
      }
    }
    return null
  }
}
