import { ref } from 'vue'

export default class TimelineScheduler {
  constructor(audioEngine) {
    this._engine = audioEngine
    this._timeouts = []
    this._rafId = null
    this._startedAt = null
    this._startOffset = 0

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
    this._startOffset = Math.max(0, Math.min(seconds, this._timeline.duration))
    this.currentTime.value = this._startOffset
    if (wasRunning) {
      this._startedAt = performance.now()
      this.isRunning.value = true
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
  }

  _tick() {
    if (!this.isRunning.value) return
    const elapsed = (performance.now() - this._startedAt) / 1000
    const pos = this._startOffset + elapsed
    const { duration, loop } = this._timeline

    if (pos >= duration) {
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
      if (delay < 0) continue

      const id = setTimeout(() => {
        const src = this._engine.soundSources.value.find(
          s => s.instance?.state?.schedule?.id === clip.sourceId
        )
        if (src && !src.locked) {
          src.instance.play()
        }
      }, delay)

      this._timeouts.push(id)
    }
  }

  dispose() {
    this._clearAll()
  }
}
