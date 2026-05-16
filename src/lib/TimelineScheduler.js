import { ref } from 'vue'

const DEFAULT_LOOKAHEAD_SECONDS = 5
const DEFAULT_SCHEDULE_INTERVAL_MS = 100
const MIN_SCHEDULE_LEAD_SECONDS = 0.03
const HIDDEN_UI_INTERVAL_MS = 250

export default class TimelineScheduler {
  constructor(audioEngine, options = {}) {
    this._engine = audioEngine
    this._lookaheadSeconds = options.lookaheadSeconds ?? DEFAULT_LOOKAHEAD_SECONDS
    this._scheduleIntervalMs = options.scheduleIntervalMs ?? DEFAULT_SCHEDULE_INTERVAL_MS
    this._minScheduleLeadSeconds = options.minScheduleLeadSeconds ?? MIN_SCHEDULE_LEAD_SECONDS

    this._schedulerTimerId = null
    this._uiRafId = null
    this._uiTimerId = null
    this._startOffset = 0
    this._transportStartContextTime = null
    this._scheduledEventKeys = new Set()
    this._scheduleGeneration = 0
    this._lifecycleHandlersInstalled = false

    this._handleVisibilityChange = this._handleVisibilityChange.bind(this)

    this.isRunning = ref(false)
    this.currentTime = ref(0)
  }

  get _timeline() {
    return this._engine.timeline
  }

  get _audioContext() {
    return this._engine.getAudioContext?.() ?? null
  }

  start(fromSeconds = 0) {
    this._stopScheduling()
    this._stopTimelineSources()
    this._startOffset = this._clampTimelineTime(fromSeconds)
    this.currentTime.value = this._startOffset
    this._beginTransportAtCurrentContextTime()
  }

  pause() {
    if (!this.isRunning.value) return
    this._updateCurrentTimeFromClock()
    this._startOffset = this.currentTime.value
    this._stopScheduling()
    this._stopTimelineSources()
    this.isRunning.value = false
    this._transportStartContextTime = null
  }

  resume() {
    if (this.isRunning.value) return
    this._startOffset = this._clampTimelineTime(this.currentTime.value || this._startOffset)
    this._beginTransportAtCurrentContextTime()
  }

  stop() {
    this._stopScheduling()
    this._stopTimelineSources()
    this.currentTime.value = 0
    this._startOffset = 0
    this.isRunning.value = false
    this._transportStartContextTime = null
  }

  seek(seconds) {
    const wasRunning = this.isRunning.value
    const nextTime = this._clampTimelineTime(seconds)

    this._stopScheduling()
    this._stopTimelineSources()
    this._startOffset = nextTime
    this.currentTime.value = nextTime
    this._transportStartContextTime = null
    this.isRunning.value = false

    if (wasRunning) {
      this._beginTransportAtCurrentContextTime()
    }
  }

  _beginTransportAtCurrentContextTime() {
    const audioContext = this._audioContext
    if (!audioContext) {
      console.warn('Timeline scheduler cannot start without an AudioContext.')
      return
    }

    if (audioContext.state === 'suspended') {
      void audioContext.resume?.()
    }

    this._scheduleGeneration += 1
    this._scheduledEventKeys.clear()
    this._transportStartContextTime = audioContext.currentTime
    this.isRunning.value = true

    this._installLifecycleHandlers()
    this._scheduleTick(0)
    this._startUiClock()
  }

  _stopScheduling() {
    if (this._schedulerTimerId !== null) {
      clearTimeout(this._schedulerTimerId)
      this._schedulerTimerId = null
    }
    if (this._uiRafId !== null) {
      cancelAnimationFrame(this._uiRafId)
      this._uiRafId = null
    }
    if (this._uiTimerId !== null) {
      clearTimeout(this._uiTimerId)
      this._uiTimerId = null
    }

    this._scheduleGeneration += 1
    this._scheduledEventKeys.clear()
  }

  _scheduleTick(delayMs = this._scheduleIntervalMs) {
    if (!this.isRunning.value) return

    if (this._schedulerTimerId !== null) {
      clearTimeout(this._schedulerTimerId)
    }

    this._schedulerTimerId = setTimeout(() => {
      this._schedulerTimerId = null
      this._schedulerTick()
    }, delayMs)
  }

  _schedulerTick() {
    if (!this.isRunning.value) return

    const ended = this._updateCurrentTimeFromClock()
    if (ended) return

    const audioContext = this._audioContext
    if (!audioContext || audioContext.state === 'suspended') {
      this._scheduleTick(this._scheduleIntervalMs)
      return
    }

    const absolutePosition = this._absolutePositionAtContextTime(audioContext.currentTime)
    this._scheduleWindow(absolutePosition, absolutePosition + this._lookaheadSeconds)
    this._scheduleTick(this._scheduleIntervalMs)
  }

  _startUiClock() {
    if (!this.isRunning.value) return

    const tick = () => {
      this._uiRafId = null
      this._uiTimerId = null
      if (!this.isRunning.value) return

      const ended = this._updateCurrentTimeFromClock()
      if (ended) return

      if (typeof document !== 'undefined' && document.hidden) {
        this._uiTimerId = setTimeout(tick, HIDDEN_UI_INTERVAL_MS)
        return
      }

      if (typeof requestAnimationFrame === 'function') {
        this._uiRafId = requestAnimationFrame(tick)
      } else {
        this._uiTimerId = setTimeout(tick, 16)
      }
    }

    tick()
  }

  _updateCurrentTimeFromClock() {
    if (!this.isRunning.value || this._transportStartContextTime === null) return false

    const audioContext = this._audioContext
    if (!audioContext) return false

    const absolutePosition = this._absolutePositionAtContextTime(audioContext.currentTime)
    const duration = this._timeline.duration

    if (!this._timeline.loop && absolutePosition >= duration) {
      this.currentTime.value = duration
      this._stopScheduling()
      this._stopTimelineSources()
      this.isRunning.value = false
      this._startOffset = duration
      this._transportStartContextTime = null
      return true
    }

    this.currentTime.value = this._positionWithinTimeline(absolutePosition)
    return false
  }

  _absolutePositionAtContextTime(contextTime) {
    if (this._transportStartContextTime === null) return this._startOffset
    return Math.max(0, this._startOffset + (contextTime - this._transportStartContextTime))
  }

  _contextTimeForAbsolutePosition(absolutePosition) {
    if (this._transportStartContextTime === null) return this._audioContext?.currentTime ?? 0
    return this._transportStartContextTime + (absolutePosition - this._startOffset)
  }

  _positionWithinTimeline(absolutePosition) {
    const duration = Math.max(0, this._timeline.duration)
    if (duration === 0) return 0
    return this._timeline.loop ? absolutePosition % duration : Math.min(absolutePosition, duration)
  }

  _scheduleWindow(absoluteWindowStart, absoluteWindowEnd) {
    const duration = this._timeline.duration
    if (!Number.isFinite(duration) || duration <= 0) return

    const firstCycle = this._timeline.loop ? Math.floor(absoluteWindowStart / duration) : 0
    const lastCycle = this._timeline.loop ? Math.floor(absoluteWindowEnd / duration) : 0
    const generation = this._scheduleGeneration

    for (let cycle = firstCycle; cycle <= lastCycle; cycle += 1) {
      if (!this._timeline.loop && cycle > 0) break
      const cycleStart = cycle * duration

      for (const clip of this._timeline.clips) {
        this._scheduleClipSegmentsForCycle(clip, cycle, cycleStart, absoluteWindowStart, absoluteWindowEnd, generation)
      }
    }
  }

  _scheduleClipSegmentsForCycle(clip, cycle, cycleStart, absoluteWindowStart, absoluteWindowEnd, generation) {
    const source = this._findSource(clip.sourceId)
    if (!source || source.locked || !source.instance) return

    const clipStart = Number.isFinite(clip.startTime) ? clip.startTime : 0
    const clipEnd = this._clipEndTime(clip)
    const clipDuration = Math.max(0, clipEnd - clipStart)
    if (clipDuration <= 0) return

    const sourceDuration = this._clipSourceDuration(clip, source.instance)
    const segmentLength = sourceDuration ? Math.min(sourceDuration, clipDuration) : clipDuration
    const segmentCount = Math.max(1, Math.ceil(clipDuration / segmentLength))
    const absoluteClipStart = cycleStart + clipStart
    const firstSegmentIndex = Math.max(
      0,
      Math.floor(Math.max(0, absoluteWindowStart - absoluteClipStart) / segmentLength)
    )
    const lastSegmentIndex = Math.min(
      segmentCount - 1,
      Math.floor(Math.max(0, absoluteWindowEnd - absoluteClipStart) / segmentLength)
    )

    for (let segmentIndex = firstSegmentIndex; segmentIndex <= lastSegmentIndex; segmentIndex += 1) {
      const segmentStartInClip = segmentIndex * segmentLength
      const segmentDuration = Math.min(segmentLength, clipDuration - segmentStartInClip)
      const absoluteSegmentStart = absoluteClipStart + segmentStartInClip
      const absoluteSegmentEnd = absoluteSegmentStart + segmentDuration

      if (absoluteSegmentEnd <= absoluteWindowStart) continue
      if (absoluteSegmentStart >= absoluteWindowEnd) continue

      const sourceOffset = sourceDuration ? segmentStartInClip % sourceDuration : segmentStartInClip
      const eventKey = `${generation}:${cycle}:${clip.id}:${segmentIndex}`

      this._scheduleEvent({
        eventKey,
        clip,
        source,
        absoluteSegmentStart,
        absoluteSegmentEnd,
        sourceOffset,
        generation
      })
    }
  }

  _scheduleEvent({
    eventKey,
    clip,
    source,
    absoluteSegmentStart,
    absoluteSegmentEnd,
    sourceOffset,
    generation
  }) {
    if (this._scheduledEventKeys.has(eventKey)) return

    this._scheduledEventKeys.add(eventKey)

    void (async () => {
      try {
        const instance = source.instance
        await instance.loadAudioBuffer?.()

        if (!this.isRunning.value || generation !== this._scheduleGeneration) {
          this._scheduledEventKeys.delete(eventKey)
          return
        }

        const audioContext = this._audioContext
        if (!audioContext) {
          this._scheduledEventKeys.delete(eventKey)
          return
        }

        const segmentEndContextTime = this._contextTimeForAbsolutePosition(absoluteSegmentEnd)
        if (segmentEndContextTime <= audioContext.currentTime) {
          this._scheduledEventKeys.delete(eventKey)
          return
        }

        const nominalStartContextTime = this._contextTimeForAbsolutePosition(absoluteSegmentStart)
        const when = Math.max(audioContext.currentTime + this._minScheduleLeadSeconds, nominalStartContextTime)
        const elapsedBeforeStart = Math.max(0, when - nominalStartContextTime)
        const duration = Math.max(0, segmentEndContextTime - when)
        if (duration <= 0) {
          this._scheduledEventKeys.delete(eventKey)
          return
        }

        const offset = Math.max(0, sourceOffset + elapsedBeforeStart)
        const onended = () => {
          this._scheduledEventKeys.delete(eventKey)
        }

        if (typeof instance.scheduleLoaded !== 'function') {
          this._scheduledEventKeys.delete(eventKey)
          console.warn('Timeline source does not support AudioContext-time scheduling.')
          return
        }

        instance.scheduleLoaded({ when, offset, duration, onended })
      } catch (err) {
        this._scheduledEventKeys.delete(eventKey)
        console.warn('Failed to schedule timeline clip:', err)
      }
    })()
  }

  _clipEndTime(clip) {
    if (Number.isFinite(clip.endTime)) return clip.endTime
    if (Number.isFinite(clip.duration)) return clip.startTime + clip.duration
    return clip.startTime
  }

  _clipSourceDuration(clip, instance) {
    const sourceDuration = clip.sourceDuration ?? instance.duration ?? instance._audioBuffer?.duration
    return Number.isFinite(sourceDuration) && sourceDuration > 0 ? sourceDuration : null
  }

  _findSource(sourceId) {
    return this._engine.soundSources.value.find(
      s => s.instance?.state?.schedule?.id === sourceId
    )
  }

  _stopTimelineSources() {
    const sourceIds = new Set(this._timeline.clips.map(clip => clip.sourceId))

    for (const sourceId of sourceIds) {
      const src = this._findSource(sourceId)

      if (src?.instance) {
        src.instance.stop?.()
        src.instance.pause?.()
      }
    }

    this._scheduledEventKeys.clear()
  }

  _clampTimelineTime(seconds) {
    const duration = Math.max(0, this._timeline.duration)
    if (!Number.isFinite(seconds)) return 0
    return Math.max(0, Math.min(seconds, duration))
  }

  async _handleVisibilityChange() {
    if (typeof document !== 'undefined' && document.hidden) return
    if (!this.isRunning.value) return

    const audioContext = this._audioContext
    if (audioContext?.state === 'suspended') {
      try {
        await audioContext.resume?.()
      } catch (err) {
        console.warn('Failed to resume AudioContext after visibility change:', err)
      }
    }

    this._schedulerTick()
  }

  _installLifecycleHandlers() {
    if (this._lifecycleHandlersInstalled || typeof document === 'undefined') return
    document.addEventListener('visibilitychange', this._handleVisibilityChange)
    this._lifecycleHandlersInstalled = true
  }

  _removeLifecycleHandlers() {
    if (!this._lifecycleHandlersInstalled || typeof document === 'undefined') return
    document.removeEventListener('visibilitychange', this._handleVisibilityChange)
    this._lifecycleHandlersInstalled = false
  }

  dispose() {
    this._stopScheduling()
    this._stopTimelineSources()
    this.isRunning.value = false
    this._removeLifecycleHandlers()
  }
}
