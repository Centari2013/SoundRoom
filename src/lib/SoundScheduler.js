const DEFAULT_LOOKAHEAD_SECONDS = 5
const DEFAULT_HIDDEN_LOOKAHEAD_SECONDS = 30
const DEFAULT_SCHEDULE_INTERVAL_MS = 100
const DEFAULT_HIDDEN_SCHEDULE_INTERVAL_MS = 1000
const MIN_SCHEDULE_LEAD_SECONDS = 0.03
const DEFAULT_MAX_EVENTS_PER_TICK = 256

/**
 * Schedules non-timeline sound sources against AudioContext.currentTime.
 *
 * Timers are used only to keep a rolling lookahead queue filled; exact playback
 * starts and stops are handled by AudioBufferSourceNode.start(when, offset, duration).
 */
export default class SoundScheduler {
  /**
   * @param {AudioEngine} audioEngine - a reference to the main AudioEngine instance
   */
  constructor(audioEngine, options = {}) {
    this.audioEngine = audioEngine

    this.intervals = new Map()
    this.pauseInfo = new Map()
    this.roomStartTime = null

    this._entries = new Map()
    this._timerId = null
    this._lookaheadSeconds = options.lookaheadSeconds ?? DEFAULT_LOOKAHEAD_SECONDS
    this._hiddenLookaheadSeconds = options.hiddenLookaheadSeconds ?? DEFAULT_HIDDEN_LOOKAHEAD_SECONDS
    this._scheduleIntervalMs = options.scheduleIntervalMs ?? DEFAULT_SCHEDULE_INTERVAL_MS
    this._hiddenScheduleIntervalMs = options.hiddenScheduleIntervalMs ?? DEFAULT_HIDDEN_SCHEDULE_INTERVAL_MS
    this._minScheduleLeadSeconds = options.minScheduleLeadSeconds ?? MIN_SCHEDULE_LEAD_SECONDS
    this._maxEventsPerTick = options.maxEventsPerTick ?? DEFAULT_MAX_EVENTS_PER_TICK
    this._lifecycleHandlersInstalled = false

    this._handleVisibilityChange = this._handleVisibilityChange.bind(this)
  }

  get _audioContext() {
    return this.audioEngine.getAudioContext?.() ?? null
  }

  _isTimelineSource(source) {
    const scheduleId = source?.state?.schedule?.id ?? source?.instance?.state?.schedule?.id
    return Boolean(scheduleId && this.audioEngine.isSourceOnTimeline(scheduleId))
  }

  _sourceInstance(sourceOrWrapper) {
    return sourceOrWrapper?.instance ?? sourceOrWrapper ?? null
  }

  _scheduleIdFor(sourceOrWrapper) {
    return this._sourceInstance(sourceOrWrapper)?.state?.schedule?.id ?? null
  }

  _createEntry(source, sched, nextStartTime) {
    return {
      source,
      scheduleId: sched.id,
      generation: 0,
      loading: false,
      duration: this._sourceDuration(source),
      nextStartTime,
      scheduledEvents: new Map(),
      paused: false,
      retired: false,
      nextLoadAttemptTime: 0,
    }
  }

  _now() {
    return this._audioContext?.currentTime ?? 0
  }

  _roomPositionAt(contextTime) {
    if (this.roomStartTime === null) return 0
    return Math.max(0, contextTime - this.roomStartTime)
  }

  _documentHidden() {
    return typeof document !== 'undefined' && document.hidden
  }

  /**
   * Starts the scheduler clock. Existing entries keep their next starts.
   */
  start() {
    const audioContext = this._audioContext
    if (!audioContext) return

    if (this.roomStartTime === null) {
      this.roomStartTime = audioContext.currentTime
    }

    this._ensureTimer()
  }

  scheduleNewSource(sourceOrWrapper) {
    const source = this._sourceInstance(sourceOrWrapper)
    if (!source || this._isTimelineSource(sourceOrWrapper)) return

    const sched = source.state?.schedule
    if (!sched?.id) return

    if (this.roomStartTime === null) {
      this.start()
    }

    const now = this._now()
    const startWindowTime = this._contextTimeForActiveStart(sched)
    const entry = this._createEntry(
      source,
      sched,
      Math.max(now + this._minScheduleLeadSeconds, startWindowTime)
    )

    sched.loopFn = null
    sched.paused = false
    sched.stopCurrentLoop = false
    sched.pendingUpdate = false

    source.setLoopingActive?.(true)

    this._entries.set(sched.id, entry)
    this.intervals.set(sched.id, entry)
    this.pauseInfo.set(sched.id, {
      remainingSeconds: Math.max(0, entry.nextStartTime - now),
      remainingGapMs: Math.max(0, entry.nextStartTime - now) * 1000,
      isPaused: false,
      resumeTimer: null,
      queuedLoop: null,
    })

    this._installLifecycleHandlers()
    this._schedulerTick()
  }

  pause() {
    for (const wrapper of this.audioEngine.soundSources.value) {
      if (this._isTimelineSource(wrapper)) continue
      this.pauseSource(this._sourceInstance(wrapper))
    }
  }

  resume() {
    for (const wrapper of this.audioEngine.soundSources.value) {
      if (this._isTimelineSource(wrapper)) continue
      const source = this._sourceInstance(wrapper)
      const scheduleId = this._scheduleIdFor(source)
      const info = scheduleId ? this.pauseInfo.get(scheduleId) : null

      if (info?.isPaused) {
        this.resumeSource(source)
      }
    }
  }

  pauseSource(sourceOrWrapper) {
    const source = this._sourceInstance(sourceOrWrapper)
    const sched = source?.state?.schedule
    if (!source || !sched?.id) return

    const now = this._now()
    const entry = this._entries.get(sched.id)
    const pauseDetails = entry
      ? this._pauseDetailsForEntry(entry, now)
      : { mode: 'gap', remainingSeconds: 0 }

    if (entry) {
      entry.paused = true
      entry.generation += 1
      entry.scheduledEvents.clear()
    }

    sched.paused = true
    sched.stopCurrentLoop = true
    sched.isPlaying = false

    source.stop?.()
    source.setLoopingActive?.(false)

    this.intervals.delete(sched.id)
    this.pauseInfo.set(sched.id, {
      ...pauseDetails,
      remainingSeconds: pauseDetails.remainingSeconds,
      remainingGapMs: pauseDetails.remainingSeconds * 1000,
      isPaused: true,
      resumeTimer: null,
      queuedLoop: null,
    })
  }

  resumeSource(sourceOrWrapper) {
    const source = this._sourceInstance(sourceOrWrapper)
    const sched = source?.state?.schedule
    if (!source || !sched?.id) return

    const info = this.pauseInfo.get(sched.id)
    const remainingSeconds = info?.isPaused
      ? Math.max(0, info.remainingSeconds ?? (info.remainingGapMs ?? 0) / 1000)
      : 0

    let entry = this._entries.get(sched.id)
    if (!entry) {
      if (this.roomStartTime === null) {
        this.start()
      }

      entry = this._createEntry(
        source,
        sched,
        this._now() + Math.max(remainingSeconds, this._minScheduleLeadSeconds)
      )
      this._entries.set(sched.id, entry)
    }
    if (!entry) return

    entry.paused = false
    entry.generation += 1
    entry.scheduledEvents.clear()
    entry.retired = false
    entry.nextStartTime = this._now() + Math.max(remainingSeconds, this._minScheduleLeadSeconds)

    sched.paused = false
    sched.stopCurrentLoop = false
    source.setLoopingActive?.(true)

    this.intervals.set(sched.id, entry)
    this.pauseInfo.set(sched.id, {
      remainingSeconds: Math.max(0, entry.nextStartTime - this._now()),
      remainingGapMs: Math.max(0, entry.nextStartTime - this._now()) * 1000,
      isPaused: false,
      resumeTimer: null,
      queuedLoop: null,
    })

    if (info?.mode === 'clip' && entry.duration) {
      this._resumePausedClip(entry, info)
    }

    this._installLifecycleHandlers()
    this._schedulerTick()
  }

  stop() {
    if (this._timerId !== null) {
      clearTimeout(this._timerId)
      this._timerId = null
    }

    for (const entry of this._entries.values()) {
      entry.generation += 1
      entry.scheduledEvents.clear()
      entry.retired = true
      entry.source.stop?.()
      entry.source.setLoopingActive?.(false)
      if (entry.source.state?.schedule) {
        entry.source.state.schedule.isPlaying = false
      }
    }

    this._entries.clear()
    this.intervals.clear()
    this.pauseInfo.clear()
    this.roomStartTime = null
    this._removeLifecycleHandlers()
  }

  updateSchedule(sourceOrWrapper) {
    const source = this._sourceInstance(sourceOrWrapper)
    const sched = source?.state?.schedule
    if (!source || !sched?.id) return

    const forceRestart = sched.restart

    const entry = this._entries.get(sched.id)
    const sourceIsAudible = entry
      ? Boolean(this._activeEventForEntry(entry, this._now()))
      : Boolean(sched.isPlaying)

    if (!forceRestart && sourceIsAudible && typeof source.oncePlaybackFinished === 'function') {
      if (!sched.pendingUpdate) {
        sched.pendingUpdate = true
        source.oncePlaybackFinished(() => {
          sched.pendingUpdate = false
          this.cancelSchedule(source)
          this.scheduleNewSource(source)
        })
      }
      return
    }

    this.cancelSchedule(source)
    this.scheduleNewSource(source)
  }

  cancelSchedule(sourceOrWrapper) {
    const source = this._sourceInstance(sourceOrWrapper)
    const sched = source?.state?.schedule
    if (!source || !sched?.id) return

    const entry = this._entries.get(sched.id)
    if (entry) {
      entry.generation += 1
      entry.scheduledEvents.clear()
    }

    this._entries.delete(sched.id)
    this.intervals.delete(sched.id)
    this.pauseInfo.delete(sched.id)

    sched.loopFn = null
    sched.pendingUpdate = false
    sched.stopCurrentLoop = true
    sched.paused = true
    sched.isPlaying = false

    source.stop?.()
    source.setLoopingActive?.(false)

    if (this._entries.size === 0) {
      this._removeLifecycleHandlers()
    }
  }

  _ensureTimer() {
    if (this._timerId !== null || this._entries.size === 0) return

    const delayMs = this._documentHidden()
      ? this._hiddenScheduleIntervalMs
      : this._scheduleIntervalMs

    this._timerId = setTimeout(() => {
      this._timerId = null
      this._schedulerTick()
    }, delayMs)
  }

  _schedulerTick() {
    const audioContext = this._audioContext
    if (!audioContext || this._entries.size === 0) return

    if (audioContext.state === 'suspended') {
      this._ensureTimer()
      return
    }

    const now = audioContext.currentTime
    const lookaheadSeconds = this._documentHidden()
      ? this._hiddenLookaheadSeconds
      : this._lookaheadSeconds
    const horizon = now + lookaheadSeconds

    for (const entry of this._entries.values()) {
      this._scheduleEntryThrough(entry, now, horizon)
    }

    this._ensureTimer()
  }

  _scheduleEntryThrough(entry, now, horizon) {
    const source = entry.source
    const sched = source.state?.schedule
    if (!sched || entry.retired || entry.paused || sched.paused || sched.stopCurrentLoop) return
    if (source.locked) return

    if (!entry.duration) {
      this._loadEntryBuffer(entry)
      return
    }

    this._normalizeNextStart(entry, now)

    let scheduledCount = 0
    while (entry.nextStartTime <= horizon) {
      if (scheduledCount >= this._maxEventsPerTick) {
        this._updatePauseInfo(entry, false)
        return
      }

      if (this._countLimitReached(sched)) {
        this._retireEntry(entry)
        return
      }

      const activeEndTime = this._contextTimeForActiveEnd(sched)
      if (Number.isFinite(activeEndTime) && entry.nextStartTime >= activeEndTime) {
        this._retireEntry(entry)
        return
      }

      const when = Math.max(entry.nextStartTime, now + this._minScheduleLeadSeconds)
      const duration = Math.max(0, Math.min(entry.duration, activeEndTime - when))
      if (duration <= 0) return

      const eventKey = `${entry.scheduleId}:${entry.generation}:${when.toFixed(6)}`
      const nextGap = this._nextGapSeconds(sched)
      const scheduled = !entry.scheduledEvents.has(eventKey)
        ? this._schedulePlaybackEvent(entry, {
          eventKey,
          when,
          offset: 0,
          duration,
          gapAfterSeconds: nextGap,
        })
        : false

      if (scheduled) {
        sched.lastPlayedAt = this._roomPositionAt(when)
        sched.timesPlayed = (sched.timesPlayed || 0) + 1
        scheduledCount += 1
      }

      entry.nextStartTime = when + duration + nextGap
      this._updatePauseInfo(entry, false)
    }
  }

  _loadEntryBuffer(entry) {
    if (entry.loading) return
    const now = this._now()
    if (entry.nextLoadAttemptTime && now < entry.nextLoadAttemptTime) return

    if (typeof entry.source.loadAudioBuffer !== 'function') {
      console.warn('Sound source does not support scheduled buffer loading.')
      entry.nextLoadAttemptTime = now + 5
      this._updatePauseInfo(entry, false)
      return
    }

    entry.loading = true
    const generation = entry.generation

    void entry.source.loadAudioBuffer()
      .then(() => {
        if (!this._entries.has(entry.scheduleId) || generation !== entry.generation) return
        entry.duration = this._sourceDuration(entry.source)
        entry.loading = false

        if (!entry.duration) {
          console.warn('Sound scheduling skipped because the loaded audio buffer has no duration.')
          entry.nextLoadAttemptTime = this._now() + 5
          this._updatePauseInfo(entry, false)
          this._ensureTimer()
          return
        }

        this._schedulerTick()
      })
      .catch(err => {
        entry.loading = false
        console.warn('Sound scheduling buffer load failed:', err)
        entry.nextLoadAttemptTime = this._now() + 5
        entry.nextStartTime = this._now() + this._nextGapSeconds(entry.source.state.schedule)
        this._updatePauseInfo(entry, false)
        this._ensureTimer()
      })
  }

  _schedulePlaybackEvent(entry, {
    eventKey,
    when,
    offset = 0,
    duration,
    gapAfterSeconds = 0,
  }) {
    const sched = entry.source.state.schedule
    const generation = entry.generation

    const event = {
      key: eventKey,
      generation,
      when,
      offset,
      duration,
      gapAfterSeconds,
      endTime: when + duration,
    }

    entry.scheduledEvents.set(eventKey, event)
    sched.isPlaying = true

    try {
      if (typeof entry.source.scheduleLoaded !== 'function') {
        throw new Error('Source does not support AudioContext-time scheduling.')
      }

      entry.source.scheduleLoaded({
        when,
        offset,
        duration,
        onended: () => {
          entry.scheduledEvents.delete(eventKey)
          if (generation === entry.generation && entry.scheduledEvents.size === 0) {
            sched.isPlaying = false
            if (entry.retired) {
              this._finalizeRetiredEntry(entry)
            }
          }
          this._schedulerTick()
        }
      })
      return true
    } catch (err) {
      entry.scheduledEvents.delete(eventKey)
      sched.isPlaying = false
      console.warn('Sound scheduling failed:', err)
      return false
    }
  }

  _activeEventForEntry(entry, contextTime) {
    for (const event of entry.scheduledEvents.values()) {
      if (event.when <= contextTime && event.endTime > contextTime) {
        return event
      }
    }
    return null
  }

  _futureEventForEntry(entry, contextTime) {
    let nextEvent = null
    for (const event of entry.scheduledEvents.values()) {
      if (event.when <= contextTime) continue
      if (!nextEvent || event.when < nextEvent.when) {
        nextEvent = event
      }
    }
    return nextEvent
  }

  _pauseDetailsForEntry(entry, contextTime) {
    const activeEvent = this._activeEventForEntry(entry, contextTime)
    if (activeEvent) {
      const elapsed = Math.max(0, contextTime - activeEvent.when)
      const clipOffset = Math.max(0, activeEvent.offset + elapsed)
      const clipRemainingSeconds = Math.max(0, activeEvent.endTime - contextTime)

      return {
        mode: 'clip',
        remainingSeconds: clipRemainingSeconds,
        clipOffset,
        clipRemainingSeconds,
        gapAfterSeconds: Math.max(0, activeEvent.gapAfterSeconds ?? 0),
      }
    }

    const futureEvent = this._futureEventForEntry(entry, contextTime)
    const remainingSeconds = futureEvent
      ? Math.max(0, futureEvent.when - contextTime)
      : Math.max(0, entry.nextStartTime - contextTime)

    return {
      mode: 'gap',
      remainingSeconds,
    }
  }

  _resumePausedClip(entry, info) {
    const sched = entry.source.state?.schedule
    if (!sched) return

    const offset = Math.max(0, info.clipOffset ?? 0)
    const remainingFromBuffer = Math.max(0, entry.duration - offset)
    const duration = Math.min(
      Math.max(0, info.clipRemainingSeconds ?? info.remainingSeconds ?? 0),
      remainingFromBuffer
    )
    if (duration <= 0) return

    const when = this._now() + this._minScheduleLeadSeconds
    const eventKey = `${entry.scheduleId}:${entry.generation}:resume:${when.toFixed(6)}`
    const gapAfterSeconds = Math.max(0, info.gapAfterSeconds ?? 0)

    const scheduled = this._schedulePlaybackEvent(entry, {
      eventKey,
      when,
      offset,
      duration,
      gapAfterSeconds,
    })

    if (!scheduled) return

    sched.lastPlayedAt = this._roomPositionAt(when)
    entry.nextStartTime = when + duration + gapAfterSeconds
    this._updatePauseInfo(entry, false)
  }

  _normalizeNextStart(entry, now) {
    const sched = entry.source.state.schedule
    const activeStartTime = this._contextTimeForActiveStart(sched)

    if (entry.nextStartTime < activeStartTime) {
      entry.nextStartTime = activeStartTime
    }

    if (entry.nextStartTime < now + this._minScheduleLeadSeconds) {
      entry.nextStartTime = now + this._minScheduleLeadSeconds
    }
  }

  _retireEntry(entry) {
    entry.retired = true
    this.intervals.delete(entry.scheduleId)
    this.pauseInfo.delete(entry.scheduleId)

    if (entry.scheduledEvents.size === 0) {
      this._finalizeRetiredEntry(entry)
    }
  }

  _finalizeRetiredEntry(entry) {
    this._entries.delete(entry.scheduleId)
    entry.source.setLoopingActive?.(false)
    const sched = entry.source.state?.schedule
    if (sched) {
      sched.isPlaying = false
      sched.paused = true
      sched.stopCurrentLoop = true
    }

    if (this._entries.size === 0) {
      this._removeLifecycleHandlers()
    }
  }

  _updatePauseInfo(entry, isPaused) {
    const remainingSeconds = Math.max(0, entry.nextStartTime - this._now())
    this.pauseInfo.set(entry.scheduleId, {
      remainingSeconds,
      remainingGapMs: remainingSeconds * 1000,
      isPaused,
      resumeTimer: null,
      queuedLoop: null,
    })
  }

  _sourceDuration(source) {
    const duration = source.duration ?? source._audioBuffer?.duration
    return Number.isFinite(duration) && duration > 0 ? duration : null
  }

  _contextTimeForActiveStart(sched) {
    if (!sched.enabled) return this._now() + this._minScheduleLeadSeconds
    const activeStart = Number.isFinite(sched.activeStart) ? Math.max(0, sched.activeStart) : 0
    return (this.roomStartTime ?? this._now()) + activeStart
  }

  _contextTimeForActiveEnd(sched) {
    if (!sched.enabled || !Number.isFinite(sched.activeEnd)) return Infinity
    return (this.roomStartTime ?? this._now()) + Math.max(0, sched.activeEnd)
  }

  _countLimitReached(sched) {
    if (!['count', 'interval+count'].includes(sched.mode)) return false
    if (sched.count === null || sched.count === undefined) return false

    const count = Number(sched.count)
    if (!Number.isFinite(count)) return false
    return (sched.timesPlayed || 0) >= Math.max(0, count)
  }

  _nextGapSeconds(sched) {
    if (!sched.enabled || sched.mode === 'loop' || sched.mode === 'count') return 0

    const min = Number.isFinite(sched.gapMin) ? Math.max(0, sched.gapMin) : 0
    const max = Number.isFinite(sched.gapMax) ? Math.max(min, sched.gapMax) : min
    return randomInRange(min, max)
  }

  async _handleVisibilityChange() {
    const audioContext = this._audioContext
    if (!audioContext || this._entries.size === 0) return

    if (!this._documentHidden() && audioContext.state === 'suspended') {
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
}

/**
 * Utility function: returns a random number between min and max.
 * @param {number} min - minimum value
 * @param {number} max - maximum value
 */
function randomInRange(min, max) {
  return Math.random() * (max - min) + min
}
