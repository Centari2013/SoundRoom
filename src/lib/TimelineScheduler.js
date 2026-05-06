import { ref } from 'vue'

export default class TimelineScheduler {
  constructor(audioEngine) {
    this._engine = audioEngine
    this._timeouts = []
    this._rafId = null
    this._startedAt = null
    this._startOffset = 0
    this._activeTimelinePlays = new Map()

    this.isRunning = ref(false)
    this.currentTime = ref(0)
  }

  get _timeline() {
    return this._engine.timeline
  }

  start(fromSeconds = 0) {
    this._clearAll()
    this._startOffset = Math.max(0, fromSeconds)
    this._startedAt = performance.now()
    this.currentTime.value = this._startOffset
    this.isRunning.value = true
    this._startActiveClips(this._startOffset)
    this._scheduleClips(this._startOffset)
    this._tick()
  }

  pause() {
    if (!this.isRunning.value) return
    this._startOffset = this.currentTime.value
    this._clearAll()
    this._stopTimelineSources()
  }

  resume() {
    if (this.isRunning.value) return
    this._startedAt = performance.now()
    this.isRunning.value = true
    this._startActiveClips(this._startOffset)
    this._scheduleClips(this._startOffset)
    this._tick()
  }

  stop() {
    this._clearAll()
    this._stopTimelineSources()
    this.currentTime.value = 0
    this._startOffset = 0
  }

  seek(seconds) {
    const wasRunning = this.isRunning.value
    this._clearAll()
    this._stopTimelineSources()
    this._startOffset = Math.max(0, Math.min(seconds, this._timeline.duration))
    this.currentTime.value = this._startOffset
    if (wasRunning) {
      this._startedAt = performance.now()
      this.isRunning.value = true
      this._startActiveClips(this._startOffset)
      this._scheduleClips(this._startOffset)
      this._tick()
    }
  }

  _clearAll() {
    this._timeouts.forEach(clearTimeout)
    this._timeouts = []
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
    this.isRunning.value = false
    this._startedAt = null
    this._activeTimelinePlays.clear()
  }

  _tick() {
    if (!this.isRunning.value) return
    const elapsed = (performance.now() - this._startedAt) / 1000
    const pos = this._startOffset + elapsed
    const { duration, loop } = this._timeline

    if (pos >= duration) {
      this._stopTimelineSources()
      if (loop) {
        this._clearAll()
        this.start(0)
      } else {
        this.currentTime.value = duration
        this._clearAll()
      }
      return
    }

    this.currentTime.value = pos
    this._rafId = requestAnimationFrame(() => this._tick())
  }

  _scheduleClips(fromSeconds) {
    for (const clip of this._timeline.clips) {
      const delay = (clip.startTime - fromSeconds) * 1000
      if (delay <= 0) continue

      const id = setTimeout(() => {
        this._playClip(clip)
      }, delay)

      this._timeouts.push(id)
    }
  }

  _startActiveClips(atSeconds) {
    for (const clip of this._timeline.clips) {
      const endTime = this._clipEndTime(clip)
      if (clip.startTime <= atSeconds && atSeconds < endTime) {
        this._playClip(clip, atSeconds - clip.startTime)
      }
    }
  }

  _clipEndTime(clip) {
    if (Number.isFinite(clip.endTime)) return clip.endTime
    if (Number.isFinite(clip.duration)) return clip.startTime + clip.duration
    return clip.startTime
  }

  async _playClip(clip, offset = 0) {
    const src = this._engine.soundSources.value.find(
      s => s.instance?.state?.schedule?.id === clip.sourceId
    )

    if (!src || src.locked || !src.instance) return

    const instance = src.instance
    const safeOffset = Math.max(0, offset)
    const endTime = this._clipEndTime(clip)
    const remaining = endTime - clip.startTime - safeOffset
    if (remaining <= 0) return
    const playToken = Symbol(clip.id)

    instance.stop?.()
    this._activeTimelinePlays.set(clip.sourceId, playToken)

    if (typeof instance.loadAudioBuffer === 'function' && typeof instance.playLoaded === 'function') {
      try {
        await instance.loadAudioBuffer()
        if (this._activeTimelinePlays.get(clip.sourceId) !== playToken) return
        const sourceDuration = this._clipSourceDuration(clip, instance)
        const sourceOffset = sourceDuration ? safeOffset % sourceDuration : safeOffset
        const segmentSeconds = sourceDuration
          ? Math.min(remaining, sourceDuration - sourceOffset)
          : remaining
        const nextOffset = safeOffset + segmentSeconds

        instance.playLoaded({ offset: sourceOffset })
        this._scheduleClipSegmentEnd(clip, segmentSeconds, playToken, nextOffset)
        return
      } catch (err) {
        console.warn('Failed to start timeline clip at offset:', err)
      }
    }

    instance.play?.({ offset: safeOffset })
    this._scheduleClipSegmentEnd(clip, remaining, playToken)
  }

  _clipSourceDuration(clip, instance) {
    const sourceDuration = clip.sourceDuration ?? instance.duration ?? instance._audioBuffer?.duration
    return Number.isFinite(sourceDuration) && sourceDuration > 0 ? sourceDuration : null
  }

  _scheduleClipSegmentEnd(clip, segmentSeconds, playToken, nextOffset = null) {
    const id = setTimeout(() => {
      if (this._activeTimelinePlays.get(clip.sourceId) !== playToken) return

      const src = this._engine.soundSources.value.find(
        s => s.instance?.state?.schedule?.id === clip.sourceId
      )

      src?.instance?.stop?.()
      src?.instance?.pause?.()
      this._activeTimelinePlays.delete(clip.sourceId)

      if (Number.isFinite(nextOffset) && nextOffset < this._clipEndTime(clip) - clip.startTime) {
        this._playClip(clip, nextOffset)
      }
    }, segmentSeconds * 1000)

    this._timeouts.push(id)
  }

  _stopTimelineSources() {
    const sourceIds = new Set(this._timeline.clips.map(clip => clip.sourceId))

    for (const sourceId of sourceIds) {
      const src = this._engine.soundSources.value.find(
        s => s.instance?.state?.schedule?.id === sourceId
      )

      if (src?.instance) {
        src.instance.stop?.()
        src.instance.pause?.()
      }
    }

    this._activeTimelinePlays.clear()
  }

  dispose() {
    this._clearAll()
    this._stopTimelineSources()
  }
}
