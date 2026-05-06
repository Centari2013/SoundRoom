import { get, set, del, keys } from 'idb-keyval'

/**
 * Manages in-memory and persistent caching of audio files.
 *
 * The manager stores small sets of object URLs in memory for quick reuse and
 * uses the [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) library
 * to persist blobs in IndexedDB.  This allows audio files to be fetched once
 * and then reused across sessions without additional network requests.  Both
 * caches have configurable size limits and will prune old entries when the
 * limits are exceeded.
 */
export default class AudioCacheManager {
  /**
   * @param {AudioContext} [audioContext]  Optional audio context used when
   *   decoding buffers.
   * @param {number} [maxEntries=20]  Maximum number of in-memory object URLs.
   * @param {number} [maxPersistentEntries=100]  Maximum number of blobs stored
   *   in IndexedDB. A value of `0` disables the limit.
   * @param {number} [maxDecodedBuffers=30]  Maximum decoded AudioBuffers kept
   *   in memory.
   */
  constructor(audioContext, maxEntries = 20, maxPersistentEntries = 100, maxDecodedBuffers = 30) {
    // Map of fileId -> Object URL. New entries are added to the end so we can
    // treat it like an LRU cache.
    this.memoryCache = new Map()

    // Decoded buffers are much faster to reuse than Blob URLs because Web Audio
    // does not need to fetch or decode the same sound for every source instance.
    this.bufferCache = new Map()
    this._bufferPromises = new Map()

    // `audioContext` is optional so that the manager can be constructed before
    // Web Audio is initialised. It can later be supplied via `setAudioContext`.
    this.audioContext = audioContext || null

    // Maximum number of object URLs to keep in memory at once.
    this._maxEntries = maxEntries

    // Maximum number of persistent blobs allowed in IndexedDB.
    this._maxPersistentEntries = maxPersistentEntries

    // Maximum number of decoded buffers to retain in memory.
    this._maxDecodedBuffers = maxDecodedBuffers
  }

  /**
   * Supply an `AudioContext` to use when decoding audio data.  This is
   * separated from the constructor so that the manager can be created before
   * the user has interacted with the page (which is often required before an
   * `AudioContext` can be resumed).
   *
   * Subsequent calls are ignored to prevent accidentally switching contexts
   * while cached buffers may still be in use.
   *
   * @param {AudioContext} audioContext
   */
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

  /**
   * Internal helper used by the memory Map to mark an entry as recently used.
   *
   * The Map is treated as an ordered list with the most recently used entry
   * last.  When the limit is exceeded the oldest entry is revoked and removed
   * from the Map.
   */
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

  _touchBuffer(fileId, buffer) {
    if (this.bufferCache.has(fileId)) {
      this.bufferCache.delete(fileId)
    }
    this.bufferCache.set(fileId, buffer)

    if (this.bufferCache.size > this._maxDecodedBuffers) {
      const [oldestId] = this.bufferCache.keys()
      this.bufferCache.delete(oldestId)
    }
  }

  /**
   * Retrieve an object URL for an audio file.
   *
   * The method first checks the in-memory cache and then IndexedDB. If the file
   * is not found, `fetchFn` is invoked to obtain the Blob which is then stored
   * persistently. The returned object URL should be released by the caller when
   * no longer needed.
   *
   * @param {string} fileId  Unique identifier for the audio file.
   * @param {Function} fetchFn  Async function that returns a `Blob` when the
   *   file must be fetched from the network.
   * @returns {Promise<string>}  Object URL for the audio Blob.
   */
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

  /**
   * Decode an audio file into an `AudioBuffer` using the configured context.
   *
   * @param {string} fileId
   * @param {Function} fetchFn  Function used to fetch the Blob if needed.
   * @returns {Promise<AudioBuffer>}
   */
  async getAudioBuffer(fileId, fetchFn) {
    if (!this.audioContext) {
      throw new Error('AudioContext is required to decode audio buffers.')
    }

    if (this.bufferCache.has(fileId)) {
      const buffer = this.bufferCache.get(fileId)
      this._touchBuffer(fileId, buffer)
      return buffer
    }

    if (this._bufferPromises.has(fileId)) {
      return this._bufferPromises.get(fileId)
    }

    const promise = (async () => {
      const blob = await this.getOrFetchBlob(fileId, fetchFn)
      const arrayBuffer = await blob.arrayBuffer()
      const decoded = await this.audioContext.decodeAudioData(arrayBuffer.slice(0))
      this._touchBuffer(fileId, decoded)
      return decoded
    })()

    this._bufferPromises.set(fileId, promise)

    try {
      return await promise
    } finally {
      this._bufferPromises.delete(fileId)
    }
  }

  /**
   * Add a Blob directly to the persistent cache, bypassing any fetch step.
   * The blob will also trigger a pruning run to enforce the persistent limit.
   */
  async addBlob(fileId, blob) {
    await set(fileId, blob)
    await this._ensurePersistentLimit([fileId])
  }

  /**
   * Convenience helper that returns a Blob from cache or by invoking `fetchFn`.
   */
  async getOrFetchBlob(fileId, fetchFn) {
    let blob = await get(fileId)
    if (!blob) {
      blob = await fetchFn()
      await set(fileId, blob)
      await this._ensurePersistentLimit([fileId])
    }
    return blob
  }

  /**
   * Internal check that prunes the persistent cache when it exceeds the
   * configured limit.
   *
   * @param {string[]} [extraKeep]  File IDs that should not be removed during
   *   pruning (in addition to those currently in the memory cache).
   */
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

  /**
   * Clear the in-memory cache and revoke all generated object URLs.
   */
  clearMemoryCache() {
    for (const url of this.memoryCache.values()) {
      URL.revokeObjectURL(url)
    }
    this.memoryCache.clear()
    this.bufferCache.clear()
    this._bufferPromises.clear()
  }

  /**
   * Remove all entries from the persistent IndexedDB cache.
   */
  async clearPersistentCache() {
    const allKeys = await keys()
    await Promise.all(allKeys.map(k => del(k)))
  }

  /**
   * Delete a single file from both memory and persistent storage.
   */
  async remove(fileId) {
    const url = this.memoryCache.get(fileId)
    if (url) URL.revokeObjectURL(url)
    this.memoryCache.delete(fileId)
    this.bufferCache.delete(fileId)
    this._bufferPromises.delete(fileId)
    await del(fileId)
  }

  /**
   * Self-cleaner: prune all persistent cache except whitelisted keys.
   *
   * @param {Object} [opts]
   * @param {string[]} [opts.keep]  File IDs to always keep.
   * @param {number} [opts.maxCount=100]  Maximum allowed entries.
   * @param {boolean} [opts.dryRun=false]  If true, no files are deleted and a
   *   summary is still returned.
   * @returns {Promise<{total:number, removed:number, kept:number}>}
   */
  async prunePersistentCache({ keep = [], maxCount = 100, dryRun = false } = {}) {
    // Remove old blobs from IndexedDB until the number of entries is under
    // `maxCount`. Keys listed in `keep` are preserved. When `dryRun` is true
    // the cache is scanned but nothing is deleted.
    const allKeys = await keys()

    const keysToRemove = allKeys.filter(k => !keep.includes(k))
    const shouldPrune = allKeys.length > maxCount || keep.length > 0

    if (!shouldPrune && !dryRun) return

    if (shouldPrune && keysToRemove.length > 0 && !dryRun) {
      await Promise.all(keysToRemove.map(k => del(k)))
    }

    return {
      total: allKeys.length,
      removed: keysToRemove.length,
      kept: allKeys.length - keysToRemove.length
    }
  }

  /**
   * Estimate persistent storage usage in megabytes.
   */
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
