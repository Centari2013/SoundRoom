import { get, set, del, keys } from 'idb-keyval'

export default class AudioCacheManager {
  audioContext = null
  #maxEntries = 20

  constructor(audioContext, maxEntries = 20) {
    this.memoryCache = new Map() // fileId -> Object URL
    this.audioContext = audioContext || null
    this.#maxEntries = maxEntries
  }

  #touch(fileId, url) {
    if (this.memoryCache.has(fileId)) {
      this.memoryCache.delete(fileId)
    }
    this.memoryCache.set(fileId, url)

    if (this.memoryCache.size > this.#maxEntries) {
      const [oldestId] = this.memoryCache.keys()
      const oldestUrl = this.memoryCache.get(oldestId)
      if (oldestUrl) URL.revokeObjectURL(oldestUrl)
      this.memoryCache.delete(oldestId)
    }
  }

  setAudioContext(audioContext) {
    if (this.audioContext) {
      console.warn('AudioContext already set, ignoring new context')
      return
    }
    this.audioContext = audioContext
  }

  // Get object URL for use in <audio> tag
  async getAudioURL(fileId, fetchFn) {
    if (this.memoryCache.has(fileId)) {
      const url = this.memoryCache.get(fileId)
      this.#touch(fileId, url)
      return url
    }

    let blob = await get(fileId)
    if (!blob) {
      blob = await fetchFn()
      await set(fileId, blob)
    }

    const url = URL.createObjectURL(blob)
    this.#touch(fileId, url)
    return url
  }

  // Get decoded AudioBuffer for use in AudioContext
  async getAudioBuffer(fileId, fetchFn) {
    const blob = await this.getOrFetchBlob(fileId, fetchFn)
    const arrayBuffer = await blob.arrayBuffer()
    return await this.audioContext.decodeAudioData(arrayBuffer)
  }

  async getOrFetchBlob(fileId, fetchFn) {
    let blob = await get(fileId)
    if (!blob) {
      blob = await fetchFn()
      await set(fileId, blob)
    }
    return blob
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
}
