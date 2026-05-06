// lib/AudioEngine.js
import SoundSource from '@/lib/SoundSource'
import SoundScheduler from '@/lib/SoundScheduler'
import TimelineScheduler from '@/lib/TimelineScheduler'
import Room from './Room'
import { computed, ref, watch, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { buildStorageKey } from '@/utils/downloadAudio'
import { registerSiteAudioTarget, updateSiteAudioPlaybackState } from '@/lib/siteAudioTransport'

/**
 * Central manager for all Web Audio operations.
 *
 * The engine maintains a single `AudioContext`, a master gain node and a
 * collection of `SoundSource` instances. It exposes helpers for creating the
 * context lazily, playing/pausing all sources and serialising the current
 * state so a room can be saved and rehydrated.
 */

export default class AudioEngine {
  soundSources = ref([])
  #masterGain = null
  #audioContext = null
  masterVolume = ref(null)
  #MAX_SOURCE_COUNT = 30
  #uninitializedSoundSources = null
  #scheduler = null
  #scheduleWatchers = null

  #convolver = null
  #reverbGain = null
  #currentIRName = null

  #room = null
  #audioCacheManagerRef = null
  #timelineScheduler = null
  #unregisterSiteAudioTarget = null
  #mediaSessionPauseSnapshot = null

  /**
   * Create a new AudioEngine instance.
   *
   * @param {Array} [uninitializedSoundSources=[]] sound sources to create on setup
   * @param {number} [volume=1] initial master volume
   * @param {Object} [timelineData=null] persisted timeline state to rehydrate
   */
  constructor(uninitializedSoundSources, volume = 1, timelineData = null) {
    this.#uninitializedSoundSources = uninitializedSoundSources || []
    this.soundSources.value = []  // reactive array of sources
    this.masterVolume.value = volume
    this.#scheduler = new SoundScheduler(this)
    this.#scheduleWatchers = new Map()

    this.timeline = reactive({
      enabled: timelineData?.enabled ?? true,
      duration: timelineData?.duration ?? 60,
      loop: timelineData?.loop ?? false,
      clips: timelineData?.clips ?? [],
    })
    this.#timelineScheduler = new TimelineScheduler(this)

    try {
      const cacheStore = useAudioCacheStore()
      if (cacheStore) {
        const { audioCacheManager } = storeToRefs(cacheStore)
        this.#audioCacheManagerRef = audioCacheManager
      }
    } catch (err) {
      console.warn('Audio cache store unavailable during AudioEngine initialisation:', err)
    }

    watch(this.masterVolume, (v) => {
      if (this.#masterGain && this.#audioContext) {
        this.#masterGain.gain.setValueAtTime(v, this.#audioContext.currentTime)
      }
    })

    // Computed: tracks if anything is playing
    this.isPlaying = computed(() =>
      this.soundSources.value.some(s => s.instance?.playing)
    )
  }

  /**
   * Set the room this engine is associated with.
   * @param {Room} room - the room instance to associate with this engine
   */
  setRoom(room) {
    if (room && !(room instanceof Room)) {
      throw new Error("Expected an instance of Room");
    }
    this.#room = room;
  }

  /**
   * Resume the audio context if it is suspended.
   */
  resumeAudioContext() {
    if (this.#audioContext && this.#audioContext.state === 'suspended') {
      this.#audioContext.resume()
    }
  }

  /**
   * Lazily create and return the shared `AudioContext` instance.
   *
   * @returns {AudioContext}
   */
  getAudioContext() {
    // Lazily create the audio context and master gain node on first use.
    // Subsequent calls return the same context.
    if (this.#audioContext) return this.#audioContext;
    this.#audioContext = new (window.AudioContext || window.webkitAudioContext)()

    // Create master gain when context is created
    this.#masterGain = this.#audioContext.createGain()
    this.#masterGain.gain.value = this.masterVolume.value // default volume
    this.#masterGain.connect(this.#audioContext.destination)
    
    // Inside getAudioContext()
    const reverbChainContext = this.#convolver?.context
    const gainContext = this.#reverbGain?.context
    const needsReverbChainReset =
      !this.#convolver ||
      !this.#reverbGain ||
      reverbChainContext !== this.#audioContext ||
      gainContext !== this.#audioContext

    if (needsReverbChainReset) {
      const previousBuffer = this.#convolver?.buffer ?? null
      const previousWetValue = this.#reverbGain?.gain?.value ?? 0.6

      try {
        this.#convolver?.disconnect()
      } catch (err) {
        console.warn('Problem disconnecting old convolver during context reset:', err)
      }
      try {
        this.#reverbGain?.disconnect()
      } catch (err) {
        console.warn('Problem disconnecting old reverb gain during context reset:', err)
      }

      this.#convolver = this.#audioContext.createConvolver()
      this.#reverbGain = this.#audioContext.createGain()
      this.#reverbGain.gain.value = previousWetValue

      if (previousBuffer) {
        try {
          // Reapply the previously loaded impulse response when possible.
          this.#convolver.buffer = previousBuffer
        } catch (err) {
          console.warn('Unable to reapply existing impulse response after context reset:', err)
        }
      }

      this.#convolver.connect(this.#reverbGain)
      this.#reverbGain.connect(this.#masterGain)

      // Ensure any already-created sources are routed through the new convolver
      this.soundSources.value.forEach(s => {
        if (s.instance?.reverbSend) {
          try {
            s.instance.reverbSend.connect(this.#convolver)
          } catch (err) {
            console.warn('Failed to reconnect reverb send after context reset:', err)
          }
        }
      })
    }

    return this.#audioContext
  }

  /**
   * Re-create sound sources and register media session handlers.
   */
  setupAudioEngine() {
    // Recreate `SoundSource` instances from any previously saved data and
    // register with the site transport so hardware play/pause keys work.
    if (this.#uninitializedSoundSources.length > 0) { // add loaded sound sources
      this.#uninitializedSoundSources.forEach(src => {
        this.addSoundSource(src) // saved sound sources already in payload format
      })
    }

    this.#scheduler.start();

    if (!this.#unregisterSiteAudioTarget) {
      this.#unregisterSiteAudioTarget = registerSiteAudioTarget({
        pauseForMediaSession: () => this.pauseForMediaSession(),
        resumeFromMediaSession: () => this.resumeFromMediaSession(),
        isPlaying: () => this.isPlayingForMediaSession(),
      })
    }

  }

  /**
   * Create a new `SoundSource` instance from a library entry and insert it
   * into the reactive `soundSources` array.
   *
   * @param {{src:Object, index?:number}} payload
   */
  addSoundSource(payload) {
    if (this.maxSourceCountReached){
      window.alert(`Limit of ${this.#MAX_SOURCE_COUNT} sound${this.#MAX_SOURCE_COUNT == 1 ? '' : 's'} in room reached.`);
      return
    }
    const src = payload.src

    src.index = payload.index ?? this.soundSources.value.length // for proper undo and redo
    const base = src.base ?? src.plan_tier ?? 'users'
    const storageKey = src.storageKey ?? (src.bucket && src.path ? buildStorageKey(base, src.bucket, src.path) : null)
    const fileId = src.fileId ?? src.libraryId ?? storageKey ?? src.audioPath ?? null
    const isLocked = !!src.locked

    const instance = new SoundSource({
      audioContext: this.getAudioContext(),
      masterGain: this.#masterGain,
      file: {
        audioPath: src.audioPath,
        libraryId: src.libraryId,
        bucket: src.bucket,
        path: src.path,
        base,
        storageKey,
        fileId
      },
      state: src.state,
      audioCacheManager: this.#audioCacheManagerRef?.value ?? null
    })
    // Route the new source through the reverb chain
    this.connectToReverb(instance)
    instance.setRoom(this.#room)

    src.locked = isLocked
    instance.locked = isLocked

    src.instance = instance
    this.soundSources.value.splice(src.index, 0, src)
    // keep the stored indices aligned with the reactive array order
    for (let i = src.index; i < this.soundSources.value.length; i++) {
      this.soundSources.value[i].index = i
    }
    if (this.#audioContext?.state === 'suspended') {
      this.#audioContext.resume()
    }

    if (isLocked) {
      const sched = instance.state.schedule
      sched.paused = true
      sched.enabled = false
      return src
    }

    // Watch schedule changes to hook into the interval scheduler.
    // Skip sources that are managed by the timeline scheduler instead.
    const sched = instance.state.schedule
    const enabledUnwatch = watch(
      () => sched.enabled,
      () => {
        if (!sched.paused && !this.isSourceOnTimeline(sched.id)) {
          this.#scheduler.updateSchedule(instance)
        }
      }
    )

    const paramsUnwatch = watch(
      () => [sched.gapMin, sched.gapMax, sched.activeStart, sched.activeEnd, sched.count, sched.mode],
      () => {
        if (sched.enabled && !sched.paused && !this.isSourceOnTimeline(sched.id)) {
          this.#scheduler.updateSchedule(instance)
        }
      }
    )
    this.#scheduleWatchers.set(sched.id, [enabledUnwatch, paramsUnwatch])

    if (sched.enabled && !sched.paused && !this.isSourceOnTimeline(sched.id)) {
      this.#scheduler.scheduleNewSource(instance)
    }

    return src
  }

  async playSoundSourceImmediately(src) {
    this.#mediaSessionPauseSnapshot = null

    if (!src || !src.instance) {
      console.warn("Tried to autoplay sound source but it was not valid:", src)
      return
    }

    if (src.locked || src.instance.locked) {
      console.info('Sound source is locked for the current plan.')
      return
    }

    if (this.isSourceOnTimeline(src.instance.state.schedule.id)) return

    const audioContext = this.getAudioContext()
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    if (audioContext.state === 'suspended') {
      console.warn('Audio context is still suspended; browser blocked autoplay.')
      return
    }

    const sched = src.instance.state.schedule
    sched.paused = false
    sched.isPlaying = true
    updateSiteAudioPlaybackState()

    await src.instance.play()
    updateSiteAudioPlaybackState()
  }

  /**
   * Remove a `SoundSource` from the engine and clean up its audio nodes.
   *
   * @param {{index:number, src:Object}} payload
   * @returns {?Object} serialized source data for undo
   */
  deleteSoundSource(payload) {
    // Remove a `SoundSource` from the canvas and clean up its audio nodes.
    // The index logic is defensive to handle stale state from undo/redo.

    const expectedInstance = payload.src?.instance ?? null

    let index = Number.isInteger(payload.index) ? payload.index : -1
    const hasCandidateAtIndex = index >= 0 && index < this.soundSources.value.length
    if (hasCandidateAtIndex) {
      const candidate = this.soundSources.value[index]
      if (candidate !== payload.src && candidate?.instance !== expectedInstance) {
        index = -1
      }
    } else {
      index = -1
    }

    if (index === -1 && expectedInstance) {
      index = this.soundSources.value.findIndex(s => s.instance === expectedInstance)
    }

    if (index === -1 && payload.src?.state) {
      index = this.soundSources.value.findIndex(s => s.state === payload.src.state)
    }

    if (index === -1 && Number.isInteger(payload.src?.index)) {
      const fallbackIndex = payload.src.index
      if (fallbackIndex >= 0 && fallbackIndex < this.soundSources.value.length) {
        index = fallbackIndex
      }
    }

    const src = this.soundSources.value[index]
    if (!src) {
      console.warn("Tried to delete sound source but index", payload.index, "was invalid.")
      return {}
    }

    const instance = src.instance ?? expectedInstance ?? null

    const currentlyPaused = src?.state?.schedule?.paused ?? instance?.state?.schedule?.paused ?? false
    const finalVolume = instance?.getVolume?.()
    instance?.dispose?.()
    this.soundSources.value.splice(index, 1)
    // reassign indices so downstream consumers always see the current order
    for (let i = index; i < this.soundSources.value.length; i++) {
      this.soundSources.value[i].index = i
    }
    src.index = index
    payload.index = index

    // clean up scheduler watchers and any scheduled loops
    const schedId = src.state.schedule?.id
    const watchers = this.#scheduleWatchers.get(schedId)
    watchers?.forEach(unwatch => unwatch())
    this.#scheduleWatchers.delete(schedId)
    this.#scheduler.cancelSchedule(src)

    src.state.schedule.paused = currentlyPaused // preserve pause state for undo
    return {
      index,
      state: reactive(Object.assign({}, src.state)),
      audioPath: src.audioPath,
      name: src.name,
      libraryId: src.libraryId,
      bucket: src.bucket,
      path: src.path,
      plan_tier: src.plan_tier,
      base: src.base,
      storageKey: src.storageKey,
      fileId: src.fileId,
      locked: !!(src.locked ?? instance?.locked),
      volume: finalVolume
    }
  }

  connectToReverb(node) {
    // Ensure the convolver node exists then route the provided node through it
    this.getAudioContext()

    if (!this.#convolver || !node) return

    try {
      if (typeof node.connectReverb === 'function') {
        node.connectReverb(this.#convolver)
      } else if (typeof node.connect === 'function') {
        node.connect(this.#convolver)
      }
    } catch (err) {
      console.warn('Failed to connect node to convolver:', err)
    }
  }


  async loadImpulseResponse(irName, url) {
    // Ensure audio context and convolver are ready
    const audioContext = this.getAudioContext()

    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()

    // The engine might have been disposed while the fetch was in-flight.
    if (
      !this.#audioContext ||
      this.#audioContext.state === 'closed' ||
      this.#audioContext !== audioContext
    ) {
      return
    }

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    this.#convolver.buffer = audioBuffer
    this.#currentIRName = irName

    // Reconnect all sources to ensure they use the new impulse
    this.soundSources.value.forEach(s => {
      if (s.instance?.connectReverb) {
        s.instance.connectReverb(this.#convolver)
      }
    })


  }

  playSoundSource(src, { preserveMediaSessionSnapshot = false } = {}) {
    if (!preserveMediaSessionSnapshot) {
      this.#mediaSessionPauseSnapshot = null
    }

    if (!src || !src.instance) {
      console.warn("Tried to play sound source but it was not valid:", src)
      return
    }

    if (src.locked || src.instance.locked) {
      console.info('Sound source is locked for the current plan.')
      return
    }

    // Sources on the timeline are controlled exclusively by TimelineScheduler
    if (this.isSourceOnTimeline(src.instance.state.schedule.id)) return

    const schedId = src.instance.state.schedule.id
    if (this.#scheduler.pauseInfo.has(schedId) && this.#scheduler.pauseInfo.get(schedId).isPaused) {
      this.#scheduler.resumeSource(src.instance)
    } else {
      this.#scheduler.updateSchedule(src.instance)
    }

    updateSiteAudioPlaybackState()
  }

  pauseSoundSource(src, { preserveMediaSessionSnapshot = false } = {}) {
    if (!preserveMediaSessionSnapshot) {
      this.#mediaSessionPauseSnapshot = null
    }

    if (!src || !src.instance) {
      console.warn("Tried to pause sound source but it was not valid:", src)
      return
    }

    // Sources on the timeline are controlled exclusively by TimelineScheduler
    if (this.isSourceOnTimeline(src.instance.state.schedule.id)) return

    this.#scheduler.pauseSource(src.instance);
    src.instance.stop();
    updateSiteAudioPlaybackState()
  }

  async seekSoundSource(src, offsetSeconds, { play = src?.instance?.playing ?? false } = {}) {
    if (!src || !src.instance) {
      console.warn("Tried to seek sound source but it was not valid:", src)
      return
    }

    // Sources on the timeline are controlled exclusively by TimelineScheduler.
    if (this.isSourceOnTimeline(src.instance.state.schedule.id)) return

    return src.instance.seek?.(offsetSeconds, { play })
  }


  /**
   * Start playback of all sound sources and initialise scheduling.
   * If every source is on the timeline, delegates to the timeline scheduler.
   */
  playAll({ preserveMediaSessionSnapshot = false } = {}) {
    if (!preserveMediaSessionSnapshot) {
      this.#mediaSessionPauseSnapshot = null
    }

    if (this.#audioContext?.state === 'suspended') {
      this.#audioContext.resume()
    }

    if (this.allSourcesOnTimeline) {
      // All sources managed by timeline — drive it from here
      if (!this.#timelineScheduler.isRunning.value) {
        this.#timelineScheduler.resume()
      }
    } else {
      // Only play / schedule sources that are NOT on the timeline
      this.soundSources.value.forEach(s => {
        if (s.locked) return
        if (this.isSourceOnTimeline(s.instance?.state?.schedule?.id)) return
        this.playSoundSource(s, { preserveMediaSessionSnapshot: true })
      })
      if (this.#scheduler.roomStartTime === null) {
        this.#scheduler.start()
      } else {
        this.#scheduler.resume()
      }
    }

    updateSiteAudioPlaybackState()
  }


  /**
   * Pause all active sound sources and suspend scheduling.
   * If every source is on the timeline, delegates to the timeline scheduler.
   */
  pauseAll({ preserveMediaSessionSnapshot = false } = {}) {
    if (!preserveMediaSessionSnapshot) {
      this.#mediaSessionPauseSnapshot = null
    }

    const timelineWasRunning = this.#timelineScheduler.isRunning.value

    if (this.allSourcesOnTimeline) {
      this.#timelineScheduler.pause()
    } else {
      if (timelineWasRunning) {
        this.#timelineScheduler.pause()
      }
      this.soundSources.value.forEach(s => {
        if (this.isSourceOnTimeline(s.instance?.state?.schedule?.id)) return
        this.pauseSoundSource(s, { preserveMediaSessionSnapshot: true })
      })
      this.#scheduler.pause()
    }

    updateSiteAudioPlaybackState()
    
  }

  #getSourceScheduleId(src) {
    return src?.instance?.state?.schedule?.id ?? null
  }

  #isNonTimelineSourceActive(src) {
    if (!src?.instance || src.locked || src.instance.locked) return false
    if (this.isSourceOnTimeline(this.#getSourceScheduleId(src))) return false

    const sched = src.instance.state?.schedule
    return Boolean(src.instance.playing || sched?.isPlaying)
  }

  #findSourceByScheduleId(scheduleId) {
    return this.soundSources.value.find(s => this.#getSourceScheduleId(s) === scheduleId)
  }

  isPlayingForMediaSession() {
    return this.#timelineScheduler.isRunning.value ||
      this.soundSources.value.some(s => Boolean(s.instance?.playing || s.instance?.state?.schedule?.isPlaying))
  }

  pauseForMediaSession() {
    const timelineWasRunning = this.#timelineScheduler.isRunning.value
    const sourceIds = this.soundSources.value
      .filter(s => this.#isNonTimelineSourceActive(s))
      .map(s => this.#getSourceScheduleId(s))
      .filter(Boolean)

    if (!timelineWasRunning && sourceIds.length === 0) {
      updateSiteAudioPlaybackState()
      return false
    }

    this.#mediaSessionPauseSnapshot = { timelineWasRunning, sourceIds }

    if (timelineWasRunning) {
      this.#timelineScheduler.pause()
    }

    sourceIds.forEach(sourceId => {
      const src = this.#findSourceByScheduleId(sourceId)
      if (src) {
        this.pauseSoundSource(src, { preserveMediaSessionSnapshot: true })
      }
    })

    updateSiteAudioPlaybackState()
    return true
  }

  async resumeFromMediaSession() {
    const snapshot = this.#mediaSessionPauseSnapshot
    if (!snapshot) {
      updateSiteAudioPlaybackState()
      return false
    }

    if (this.#audioContext?.state === 'suspended') {
      try {
        await this.#audioContext.resume()
      } catch (err) {
        console.warn('Failed to resume audio context for media session:', err)
      }
    }

    let resumedAny = false

    snapshot.sourceIds.forEach(sourceId => {
      const src = this.#findSourceByScheduleId(sourceId)
      if (!src || src.locked || src.instance?.locked) return
      if (this.isSourceOnTimeline(sourceId)) return

      this.playSoundSource(src, { preserveMediaSessionSnapshot: true })
      resumedAny = true
    })

    if (snapshot.timelineWasRunning) {
      this.#timelineScheduler.resume()
      resumedAny = true
    }

    this.#mediaSessionPauseSnapshot = null
    updateSiteAudioPlaybackState()
    return resumedAny
  }

  /**
   * Tear down all audio nodes and close the context.
   */
  dispose() {
    // Tear down all nodes and close the audio context entirely.
    this.pauseAll()
    this.#scheduler.stop()
    this.#timelineScheduler.dispose()
    this.#scheduleWatchers.forEach((unwatchers) => {
      unwatchers.forEach(stop => stop?.())
    })
    this.#scheduleWatchers.clear()
    this.soundSources.value.forEach(s => s.instance.dispose())
    this.soundSources.value.length = 0

    if (this.#unregisterSiteAudioTarget) {
      this.#unregisterSiteAudioTarget()
      this.#unregisterSiteAudioTarget = null
    }
    this.#mediaSessionPauseSnapshot = null
 
    if (this.#convolver) {
      try {
        this.#convolver.disconnect()
      } catch (err) {
        console.warn('Problem disconnecting convolver during dispose:', err)
      }
      // Clearing the buffer releases the underlying audio data reference.
      this.#convolver.buffer = null
      this.#convolver = null
    }

    if (this.#reverbGain) {
      try {
        this.#reverbGain.disconnect()
      } catch (err) {
        console.warn('Problem disconnecting reverb gain during dispose:', err)
      }
      this.#reverbGain = null
    }

    if (this.#masterGain) {
      this.#masterGain.disconnect()
      this.#masterGain = null
    }
 
    if (this.#audioContext) {
      this.#audioContext.close()
      this.#audioContext = null
    }

    this.#currentIRName = null
    this.#uninitializedSoundSources = []
  }

  /**
   * Set the maximum number of sound sources allowed in the room.
   * @param {number} count
   */
  set maxSourceCount(count){
    this.#MAX_SOURCE_COUNT = count
  }
  /** @returns {number} */
  get maxSourceCount() {
    return this.#MAX_SOURCE_COUNT
  }

  /** @returns {boolean} */
  get maxSourceCountReached(){
    return this.soundSourceCount == this.maxSourceCount
  }

  /** @returns {number} */
  get soundSourceCount() {
    return this.soundSources.value.length
  }
  
  get timelineScheduler() {
    return this.#timelineScheduler
  }

  setTimelineEnabled(enabled) {
    const nextEnabled = Boolean(enabled)
    if (this.timeline.enabled === nextEnabled) return

    if (!nextEnabled) {
      this.#timelineScheduler.stop()
    }

    this.timeline.enabled = nextEnabled
  }

  // ── Timeline helpers ───────────────────────────────────────────────

  isSourceOnTimeline(sourceId) {
    if (!this.timeline.enabled) return false
    return this.timeline.clips.some(c => c.sourceId === sourceId)
  }

  get allSourcesOnTimeline() {
    const sources = this.soundSources.value
    if (sources.length === 0) return false
    return sources.every(s => this.isSourceOnTimeline(s.instance?.state?.schedule?.id))
  }

  // ── Timeline management ────────────────────────────────────────────

  #findTimelineSource(sourceId) {
    return this.soundSources.value.find(s => s.instance?.state?.schedule?.id === sourceId)
  }

  #takeSourceOverForTimeline(sourceId) {
    const src = this.#findTimelineSource(sourceId)
    if (!src?.instance) return
    this.#scheduler.cancelSchedule(src.instance)
    src.instance.stop?.()
  }

  #stopTimelineSource(sourceId) {
    const src = this.#findTimelineSource(sourceId)
    src?.instance?.stop?.()
    src?.instance?.pause?.()
  }

  #syncTimelineSchedulerAfterMutation() {
    if (!this.#timelineScheduler.isRunning.value) return
    this.#timelineScheduler.seek(this.#timelineScheduler.currentTime.value)
  }

  addTimelineClip(sourceId, startTime = 0, duration = 5, options = {}) {
    const clip = {
      id: options.id ?? crypto.randomUUID(),
      sourceId,
      startTime,
      duration,
      sourceDuration: options.sourceDuration ?? this.#findTimelineSource(sourceId)?.instance?.duration ?? duration,
    }
    const index = Number.isInteger(options.index)
      ? Math.max(0, Math.min(options.index, this.timeline.clips.length))
      : this.timeline.clips.length
    this.#takeSourceOverForTimeline(sourceId)
    this.timeline.clips.splice(index, 0, clip)
    this.#syncTimelineSchedulerAfterMutation()
    return clip.id
  }

  insertTimelineClip(clip, index = this.timeline.clips.length) {
    if (!clip?.id || this.timeline.clips.some(c => c.id === clip.id)) return
    const safeIndex = Number.isInteger(index)
      ? Math.max(0, Math.min(index, this.timeline.clips.length))
      : this.timeline.clips.length
    this.#takeSourceOverForTimeline(clip.sourceId)
    this.timeline.clips.splice(safeIndex, 0, { ...clip })
    this.#syncTimelineSchedulerAfterMutation()
    return clip.id
  }

  removeTimelineClip(clipId) {
    const idx = this.timeline.clips.findIndex(c => c.id === clipId)
    if (idx === -1) return null
    const [clip] = this.timeline.clips.splice(idx, 1)
    if (!this.timeline.clips.some(c => c.sourceId === clip.sourceId)) {
      this.#stopTimelineSource(clip.sourceId)
    }
    this.#syncTimelineSchedulerAfterMutation()
    return { clip: { ...clip }, index: idx }
  }

  removeSourceFromTimeline(sourceId) {
    const removed = []
    for (let i = this.timeline.clips.length - 1; i >= 0; i--) {
      if (this.timeline.clips[i].sourceId === sourceId) {
        const [clip] = this.timeline.clips.splice(i, 1)
        removed.unshift({ clip: { ...clip }, index: i })
      }
    }
    if (removed.length) {
      this.#stopTimelineSource(sourceId)
      this.#syncTimelineSchedulerAfterMutation()
    }
    return removed
  }

  updateTimelineClip(clipId, patch, { sync = true } = {}) {
    const clip = this.timeline.clips.find(c => c.id === clipId)
    if (clip) {
      Object.assign(clip, patch)
      if (sync) {
        this.#syncTimelineSchedulerAfterMutation()
      }
    }
  }

  setTimelineDuration(seconds) {
    this.timeline.duration = Math.max(10, seconds)
  }

  setTimelineLoop(loop) {
    this.timeline.loop = loop
  }

  playTimeline(fromSeconds) {
    this.#mediaSessionPauseSnapshot = null
    const from = fromSeconds ?? this.#timelineScheduler.currentTime.value
    this.#timelineScheduler.start(from)
    updateSiteAudioPlaybackState()
  }

  pauseTimeline() {
    this.#mediaSessionPauseSnapshot = null
    this.#timelineScheduler.pause()
    updateSiteAudioPlaybackState()
  }

  stopTimeline() {
    this.#mediaSessionPauseSnapshot = null
    this.#timelineScheduler.stop()
    updateSiteAudioPlaybackState()
  }

  seekTimeline(seconds) {
    this.#timelineScheduler.seek(seconds)
  }

  /**
   * Serialise the engine state so it can be saved.
   *
   * @returns {Object}
   */
  toJSON() {
    // Serialize the minimal state required to recreate the engine and all
    // currently loaded sources. This is used when saving a room layout.
    return {
      soundSources: this.soundSources.value.map(src => ({
        
        libraryId: src.libraryId,
        bucket: src.bucket,
        path: src.path,
        plan_tier: src.plan_tier,
        base: src.base,
        storageKey: src.storageKey,
        fileId: src.fileId,
        locked: !!src.locked,
        accessReason: src.accessReason,
        requiredPlan: src.requiredPlan,
        entitlementFeature: src.entitlementFeature,
        canUpgrade: src.canUpgrade,
        name: src.name,
        audioPath: src.audioPath,
        instance: {
          state:{
            x: src.instance.state.x,
            y: src.instance.state.y,
            angle: src.instance.state.angle,
            coneInner: src.instance.state.coneInner,
            coneOuter: src.instance.state.coneOuter,
            surround: src.instance.state.surround ?? false,
            isPlaying: src.instance.playing,
            volume: src.instance?.getVolume?.() ?? 1,
            schedule: src.instance.state.schedule
          }
        },
        state: {
          angle: src.state.angle,
          coneInner: src.state.coneInner,
          coneOuter: src.state.coneOuter,
        },
          index: src.index,
      })),
      masterVolume: this.masterVolume.value,
      reverb: {
        preset: this.#currentIRName ?? null,
      },
      timeline: {
        duration: this.timeline.duration,
        loop: this.timeline.loop,
        clips: this.timeline.clips.map(c => ({ ...c })),
      }
    }
  }

  /**
   * Rehydrate an AudioEngine instance from JSON produced by {@link toJSON}.
   *
   * @param {Object} json
   * @returns {AudioEngine}
   */
  static fromJSON(json) {
    // Rehydrate an AudioEngine instance from data produced by `toJSON`.
    let engine = null;

    if (Array.isArray(json.soundSources)) {
        const uninitializedSoundSources = json.soundSources.map(src => {
          const base = src.base ?? src.plan_tier ?? 'users'
          const storageKey = src.storageKey ?? (src.bucket && src.path ? buildStorageKey(base, src.bucket, src.path) : null)
          const fileId = src.fileId ?? src.libraryId ?? storageKey

          return {
            index: src.index,
            src: {
              libraryId: src.libraryId,
              name: src.name,
              state: src.instance.state,
              audioPath: src.audioPath,
              bucket: src.bucket,
              path: src.path,
              plan_tier: src.plan_tier,
              base,
              storageKey,
              fileId,
              locked: !!src.locked,
              accessReason: src.accessReason,
              requiredPlan: src.requiredPlan,
              entitlementFeature: src.entitlementFeature,
              canUpgrade: src.canUpgrade,
            }
          }
        })
      engine = new AudioEngine(uninitializedSoundSources, json.masterVolume ?? 1, json.timeline ?? null)
      if (json.reverb?.preset) {
        const IR_PRESETS = {
          cathedral: '/impulses/1st_baptist_nashville_far_wide.wav',
          forest: '/impulses/forest.wav',
        }

        const presetName = json.reverb.preset
        const url = IR_PRESETS[presetName]
        if (url) {
          engine.getAudioContext() // ensure nodes exist
          setTimeout(() => {
            engine.loadImpulseResponse(presetName, url)
          }, 0)
        }

      }

      
    } else {
      throw new Error('Invalid JSON format for AudioEngine')
    }

    return engine
  }

}
