// lib/SoundSource.js
import { ref, reactive } from 'vue'
import { fetchAudioBlob } from '@/utils/downloadAudio'
/**
 * Wrapper around the Web Audio nodes used to spatialise a decoded audio buffer.
 * The `state` object drives position and orientation of the source so the
 * canvas and audio remain in sync.
 */
export default class SoundSource {
  /** @type {import('./Room').default|null} */
  _room = null
  /**
   * Create a new SoundSource wrapper.
   *
   * @param {Object} options
   * @param {AudioContext} options.audioContext - context used for nodes
   * @param {GainNode} options.masterGain - master gain node
   * @param {string} options.file - URL or blob to load
   * @param {Object} options.state - reactive state object
   */
  constructor({
    audioContext,
    masterGain,
    file,
    state,
    audioCacheManager = null
  }) {
    // `state` holds the spatial position/angle and is kept in sync with the
    // canvas representation.
    this.state = state
    this.state.surround = this.state.surround ?? false
    this.state.schedule = reactive(state.schedule ?? {
      id: crypto.randomUUID(),
      enabled: false,
      mode: 'interval', // "loop", "interval", "count", or "interval+count"

      // Applies to interval-based scheduling
      gapMin: 5,
      gapMax: 10,

      // Applies to time-bound or count-based schedules
      count: 5, // null = unlimited
      activeStart: 0, // time window start (in seconds)
      activeEnd: 300, // time window end

      // Restart behaviour
      restart: false, // force immediate restart when schedule changes

      // Internal state
      timesPlayed: 0,
      isPlaying: true, // whether the sound is currently playing
      lastPlayedAt: null,
      paused: false, // whether scheduling is currently paused
    })

    this._disposed = false // whether this source has been disposed

    this._rad = (deg) => (deg * Math.PI) / 180
    this._scale = 0.01

    this._audioContext = audioContext
    this._audioCacheManager = audioCacheManager

    this._audioDescriptor = typeof file === 'string' ? { audioPath: file } : (file ?? {})
    this._audioPath = this._audioDescriptor.audioPath ?? null
    this._storageKey = this._audioDescriptor.storageKey ?? null
    this._fileId = this._audioDescriptor.fileId ?? this._audioDescriptor.libraryId ?? this._audioPath

    this._audioBuffer = null
    this._activeSource = null
    this._activeSources = new Set()
    this._playbackListeners = new Set()
    this._bufferPromise = null
    this._looping = false

    this._gainNode = this._audioContext.createGain()

    this.earlyReflections = []
    for (let i = 0; i < 2; i++) {
      const delay = this._audioContext.createDelay()
      delay.delayTime.value = 0.005 + i * 0.003 // short slapback

      const gain = this._audioContext.createGain()
      gain.gain.value = 0.2

      const pan = this._audioContext.createStereoPanner()
      pan.pan.value = 0

      // chain: dry gain -> delay -> reflection gain -> pan -> master
      this._gainNode.connect(delay).connect(gain).connect(pan).connect(masterGain)

      this.earlyReflections.push({ delay, gain, pan })
    }

    this._pannerNode = audioContext.createPanner()

    // Configure the panner to simulate distance and directionality.
    const pn = this._pannerNode
    pn.panningModel = 'HRTF'
    pn.distanceModel = 'inverse'
    pn.refDistance = 1
    pn.maxDistance = 10000
    pn.rolloffFactor = 1
    pn.coneInnerAngle = this.state.coneInner
    pn.coneOuterAngle = this.state.coneOuter
    pn.coneOuterGain = 0.2

    this._gainNode.connect(this._pannerNode)

    // Save the final node as outputNode (for reverb and dry path)
    this.outputNode = this._pannerNode

    // Optional: expose the panner node output for reverb routing
    this.reverbSend = audioContext.createGain()
    this.reverbSend.gain.value = 1 // or tweak per-source reverb level

    // Corner muffling effect using lowpass filter
    this.cornerFilter = this._audioContext.createBiquadFilter()
    this.cornerFilter.type = 'lowpass'
    this.cornerFilter.frequency.value = 18000 // high at start (no muffling)

    this.cornerCompressor = this._audioContext.createDynamicsCompressor()
    this.cornerCompressor.threshold.value = -50
    this.cornerCompressor.knee.value = 20
    this.cornerCompressor.ratio.value = 6
    this.cornerCompressor.attack.value = 0.005
    this.cornerCompressor.release.value = 0.1

    // postPannerGain gates the spatial path (normal mode).
    this._postPannerGain = audioContext.createGain()
    this._postPannerGain.gain.value = this.state.surround ? 0 : 1
    this._pannerNode.connect(this._postPannerGain)

    // True 360° surround: 8 PannerNodes evenly distributed at a large fixed radius.
    // rolloffFactor=0 means distance never attenuates them; HRTF gives each a distinct
    // perceived direction so the listener hears the source arriving from all sides at once.
    const SURROUND_COUNT = 8
    const SURROUND_RADIUS = 20 // audio-space units — well beyond the room so angles stay
                               // nearly constant as the listener moves
    this._surroundMixGain = audioContext.createGain()
    this._surroundMixGain.gain.value = this.state.surround ? 1 : 0
    this._surroundPanners = []

    for (let i = 0; i < SURROUND_COUNT; i++) {
      const angle = (i / SURROUND_COUNT) * 2 * Math.PI
      const sp = audioContext.createPanner()
      sp.panningModel = 'HRTF'
      sp.distanceModel = 'inverse'
      sp.rolloffFactor = 0   // constant gain regardless of distance
      sp.refDistance = 1
      sp.coneInnerAngle = 360
      sp.coneOuterAngle = 360
      sp.positionX.value = SURROUND_RADIUS * Math.cos(angle)
      sp.positionY.value = SURROUND_RADIUS * Math.sin(angle)
      sp.positionZ.value = 0

      const spGain = audioContext.createGain()
      spGain.gain.value = 1 / SURROUND_COUNT // normalise summed output

      this._gainNode.connect(spGain)
      spGain.connect(sp)
      sp.connect(this._surroundMixGain)
      this._surroundPanners.push({ panner: sp, gain: spGain })
    }

    // Both paths feed into cornerFilter
    this._postPannerGain.connect(this.cornerFilter)
    this._surroundMixGain.connect(this.cornerFilter)
    this.cornerFilter.connect(this.cornerCompressor)
    this.cornerCompressor.connect(masterGain ?? this._audioContext.destination)

    this.outputNode.connect(this.reverbSend) // split the signal for reverb

    this._playing = ref(false)
    this._volume = this.state.volume ?? 1 // default to 1 if not set
    this._gainNode.gain.value = this._volume
  }

  async _fetchAudioBlob() {
    if (this._storageKey) {
      return await fetchAudioBlob(this._storageKey)
    }

    if (this._audioPath) {
      const res = await fetch(this._audioPath)
      if (!res.ok) {
        throw new Error(`Failed to fetch audio blob for source (status ${res.status})`)
      }
      return await res.blob()
    }

    throw new Error('No audio source available for sound.')
  }

  async _ensureAudioBuffer() {
    if (this._audioBuffer) return this._audioBuffer

    if (this._bufferPromise) {
      return this._bufferPromise
    }

    this._bufferPromise = (async () => {
      if (
        this._audioCacheManager &&
        this._fileId &&
        this._audioCacheManager.audioContext &&
        typeof this._audioCacheManager.getAudioBuffer === 'function'
      ) {
        const decoded = await this._audioCacheManager.getAudioBuffer(
          this._fileId,
          () => this._fetchAudioBlob()
        )
        this._audioBuffer = decoded
        this._bufferPromise = null
        return decoded
      }

      let blob = null
      if (
        this._audioCacheManager &&
        this._fileId &&
        typeof this._audioCacheManager.getOrFetchBlob === 'function'
      ) {
        blob = await this._audioCacheManager.getOrFetchBlob(this._fileId, async () => {
          return await this._fetchAudioBlob()
        })
      } else {
        blob = await this._fetchAudioBlob()
      }

      if (!blob) {
        throw new Error('Unable to resolve audio data for sound source.')
      }

      const arrayBuffer = await blob.arrayBuffer()
      const decoded = await this._audioContext.decodeAudioData(arrayBuffer.slice(0))
      this._audioBuffer = decoded
      this._bufferPromise = null
      return decoded
    })()

    return this._bufferPromise.catch(err => {
      this._bufferPromise = null
      throw err
    })
  }

  _normalizePlaybackOffset(offset = 0) {
    if (!this._audioBuffer) return 0
    if (!Number.isFinite(offset)) return 0
    return Math.max(0, Math.min(offset, Math.max(0, this._audioBuffer.duration - 0.001)))
  }

  _startPlayback(offset = 0, {
    notify = true,
    when = 0,
    duration = null,
    stopExisting = true,
    onended = null
  } = {}) {
    if (!this._audioBuffer) {
      throw new Error('Audio buffer not loaded')
    }

    if (stopExisting) {
      this._stopActiveSource({ notify })
    }

    const safeOffset = this._normalizePlaybackOffset(offset)
    const safeWhen = Number.isFinite(when)
      ? Math.max(this._audioContext.currentTime, when)
      : this._audioContext.currentTime
    const safeDuration = Number.isFinite(duration)
      ? Math.max(0, Math.min(duration, Math.max(0, this._audioBuffer.duration - safeOffset)))
      : null

    if (safeDuration !== null && safeDuration <= 0) return null

    const source = this._audioContext.createBufferSource()
    source.buffer = this._audioBuffer
    source.connect(this._gainNode)

    source.onended = () => {
      this._activeSources.delete(source)
      if (this._activeSource === source) {
        this._activeSource = null
      }
      try {
        source.disconnect()
      } catch (err) {
        console.warn('Problem disconnecting ended buffer source:', err)
      }
      if (!this._looping && this._activeSources.size === 0) {
        this._setPlaying(false)
      }
      if (typeof onended === 'function') {
        try {
          onended()
        } catch (err) {
          console.warn('Playback end handler threw:', err)
        }
      }
      this._notifyPlaybackListeners()
    }

    this._activeSource = source
    this._activeSources.add(source)
    this._setPlaying(true)
    if (safeDuration !== null) {
      source.start(safeWhen, safeOffset, safeDuration)
    } else {
      source.start(safeWhen, safeOffset)
    }

    return source
  }

  _stopActiveSource({ notify = true } = {}) {
    if (!this._activeSource && this._activeSources.size === 0) {
      if (notify) {
        this._setPlaying(false)
      }
      return
    }

    const sources = this._activeSources.size > 0
      ? Array.from(this._activeSources)
      : [this._activeSource]
    this._activeSource = null
    this._activeSources.clear()

    sources.forEach(source => {
      if (!source) return
      source.onended = null
      try {
        source.stop()
      } catch (err) {
        // Safari throws if stop called after natural end; ignore.
      }
      try {
        source.disconnect()
      } catch (err) {
        console.warn('Problem disconnecting buffer source:', err)
      }
    })

    if (notify) {
      this._setPlaying(false)
      this._notifyPlaybackListeners()
    }
  }

  _notifyPlaybackListeners() {
    if (this._playbackListeners.size === 0) return
    const listeners = Array.from(this._playbackListeners)
    this._playbackListeners.clear()
    listeners.forEach(listener => {
      try {
        listener()
      } catch (err) {
        console.warn('Playback listener threw:', err)
      }
    })
  }

  oncePlaybackFinished(callback) {
    if (!this._activeSource && !this.playing) {
      callback()
      return
    }
    this._playbackListeners.add(callback)
  }

  _setPlaying(value) {
    if (!this._playing || typeof this._playing !== 'object' || !('value' in this._playing)) {
      this._playing = ref(Boolean(value))
    } else {
      this._playing.value = Boolean(value)
    }
  }

  _setLoopingActive(flag) {
    this._looping = Boolean(flag)
    if (this._looping) {
      this._setPlaying(true)
    } else if (!this._activeSource) {
      this._setPlaying(false)
    }
  }

  setLoopingActive(flag) {
    this._setLoopingActive(flag)
  }

  async loadAudioBuffer() {
    return this._ensureAudioBuffer()
  }

  /**
   * Connect this source's reverb send to the provided convolver.
   * @param {AudioNode} convolver
   */
  connectReverb(convolver) {
    try {
      this.reverbSend.connect(convolver)
    } catch (err) {
      console.warn('Failed to connect reverb send:', err)
    }
  }

  /** Start playback of the audio buffer. */
  async play({ offset = 0 } = {}) {
    await this._ensureAudioBuffer()
    this.playLoaded({ offset })
  }

  playLoaded({ offset = 0 } = {}) {
    this._startPlayback(offset)
    this.updateAudio()
  }

  scheduleLoaded({
    when = this._audioContext.currentTime,
    offset = 0,
    duration = null,
    onended = null
  } = {}) {
    const source = this._startPlayback(offset, {
      when,
      duration,
      notify: false,
      stopExisting: false,
      onended
    })
    this.updateAudio()
    return source
  }

  async seek(offset = 0, { play = this.playing } = {}) {
    await this._ensureAudioBuffer()
    const safeOffset = this._normalizePlaybackOffset(offset)

    if (!play) {
      this._stopActiveSource()
      return safeOffset
    }

    this.playLoaded({ offset: safeOffset })
    return safeOffset
  }

  /** Force playback from the start of the audio file. */
  async forcePlayFromStart() {
    await this.play()
  }

  /** Pause/stop playback of the audio buffer. */
  stop() {
    this._stopActiveSource()
    this._setLoopingActive(false)
  }

  async playAndWait() {
    await this._ensureAudioBuffer()
    // Ensure any existing playback is stopped and listeners are flushed before starting a new wait.
    this._stopActiveSource({ notify: true })
    return new Promise((resolve, reject) => {
      const listener = () => resolve()
      this._playbackListeners.add(listener)
      try {
        this._startPlayback(0, { notify: false })
        this.updateAudio()
      } catch (err) {
        this._playbackListeners.delete(listener)
        reject(err)
      }
    })
  }

  /**
   * Whether the sound is currently playing.
   * @returns {boolean}
  */
  get playing() {
    const active = (() => {
      if (this._playing && typeof this._playing === 'object' && 'value' in this._playing) {
        return Boolean(this._playing.value)
      }
      return Boolean(this._playing)
    })()

    return active || this._looping
  }

  get duration() {
    return this._audioBuffer?.duration ?? null
  }

  /**
   * Set the playback volume for this source.
   * @param {number} v
   */
  setVolume(v) {
    const fallbackVolume = Number.isFinite(this._volume) ? Math.max(0, this._volume) : 1
    const volume = Number.isFinite(v) ? Math.max(0, v) : fallbackVolume

    this._volume = volume
    if (this.state) {
      this.state.volume = volume
    }

    if (!this._audioContext) return

    if (this._room) {
      this.updateRoomInteraction(this._room)
      return
    }

    const currentTime = this._audioContext.currentTime
    if (this._gainNode) {
      this._gainNode.gain.setValueAtTime(volume, currentTime)
    }
    if (this.reverbSend) {
      this.reverbSend.gain.setValueAtTime(volume, currentTime)
    }
    this.earlyReflections?.forEach(ref => {
      ref.gain?.gain?.setValueAtTime(volume, currentTime)
    })
  }

  /**
   * Retrieve the current playback volume.
   * @returns {number}
   */
  getVolume() {
    return this._volume;
  }

  /**
   * Switch between spatialised (single panner) and true 360° surround (8-panner ring) routing.
   * @param {boolean} enabled
   */
  applySurroundMode(enabled) {
    if (!this._postPannerGain || !this._surroundMixGain || !this._audioContext) return
    const ct = this._audioContext.currentTime
    if (enabled) {
      this._postPannerGain.gain.setValueAtTime(0, ct)
      this._surroundMixGain.gain.setValueAtTime(1, ct)
    } else {
      this._postPannerGain.gain.setValueAtTime(1, ct)
      this._surroundMixGain.gain.setValueAtTime(0, ct)
    }
  }

  /**
   * Sync Web Audio panner position and orientation with the state used by the canvas.
   */
  updateAudio() {
    if (!this._audioContext) return
    // Sync the Web Audio panner with the state used by the canvas. Both
    // position and orientation are updated each time the source moves.
    const angleRad = this._rad(this.state.angle);
    const x = this.state.x * this._scale;
    const y = this.state.y * this._scale;

    const p = this._pannerNode;
    const ctx = this._audioContext;

    p.positionX.setValueAtTime(x, ctx.currentTime);
    p.positionY.setValueAtTime(y, ctx.currentTime);
    p.positionZ.setValueAtTime(0, ctx.currentTime);

    p.orientationX.setValueAtTime(Math.cos(angleRad), ctx.currentTime);
    p.orientationY.setValueAtTime(Math.sin(angleRad), ctx.currentTime);
    p.orientationZ.setValueAtTime(0, ctx.currentTime);

    this.applySurroundMode(this.state.surround)

    if (this._room) {
      this.updateRoomInteraction(this._room);
    }

  }


  /**
   * Adjust source properties based on proximity to room walls and corners.
   * @param {import('./Room').default} room
   */
  updateRoomInteraction(room) {
    if (!room || !this._audioContext) return;

    const { x, y } = this.state;
    const roomWidth = room.width;
    const roomHeight = room.height;

    const distLeft = x;
    const distRight = roomWidth - x;
    const distTop = y;
    const distBottom = roomHeight - y;
    const minWallDist = Math.min(distLeft, distRight, distTop, distBottom);

    const distTopLeft = Math.hypot(x, y);
    const distTopRight = Math.hypot(roomWidth - x, y);
    const distBottomLeft = Math.hypot(x, roomHeight - y);
    const distBottomRight = Math.hypot(roomWidth - x, roomHeight - y);
    const minCornerDist = Math.min(distTopLeft, distTopRight, distBottomLeft, distBottomRight);

    const normWall = Math.min(minWallDist / 100, 1);
    const normCorner = Math.min(minCornerDist / 150, 1);

    const wallGain = 1 - normWall;
    const cornerGain = 1 - normCorner;
    const userVolume = Number.isFinite(this._volume) ? Math.max(0, this._volume) : 1;
    const currentTime = this._audioContext.currentTime;

    // dry gain scales down near boundaries but reaches 1.0 when unobstructed
    const dryGainBase = 0.2 + 0.8 * normWall * normCorner;
    const dryGain = dryGainBase * userVolume;
    this._gainNode?.gain.setValueAtTime(dryGain, currentTime);

    // reverb send increases slightly near corners
    const reverbSendBase = 0.3 + 0.5 * cornerGain;
    this.reverbSend?.gain.setValueAtTime(reverbSendBase * userVolume, currentTime);

    // lowpass filter transitions back to the full 18 kHz when far from corners
    const muffledFreq = 800 + (18000 - 800) * normCorner;
    this.cornerFilter?.frequency.setTargetAtTime(muffledFreq, currentTime, 0.01);

    // early reflections subtle gain & pan toward nearest wall
    const horizPan = distLeft < distRight ? -wallGain : wallGain;
    this.earlyReflections.forEach(ref => {
      const reflectionGainBase = 0.05 + 0.2 * wallGain;
      ref.gain?.gain?.setValueAtTime(reflectionGainBase * userVolume, currentTime);
      ref.pan?.pan?.setValueAtTime(horizPan, currentTime);
    });
  }



  /**
   * Provide a reference to the room this source belongs to.
   * @param {import('./Room').default} room
   */
  setRoom(room) {
    this._room = room
  }

  /**
   * Optional hook for responding to room size changes.
   * Currently a no-op but reserved for future use.
   * @param {number} _width
   * @param {number} _height
   */
  onRoomResize(_width, _height) {
    // placeholder
  }

  /**
   * Gracefully disconnect and release all Web Audio nodes and associated resources.
   */
  dispose() {
    this._disposed = true;
    this._setLoopingActive(false)

    // Gracefully disconnect and release all Web Audio nodes when a source is
    // removed from the room.
    try {
      this._stopActiveSource({ notify: true })

      this.earlyReflections.forEach(ref => {
        try { ref.delay.disconnect() } catch (_) {}
        try { ref.gain.disconnect() } catch (_) {}
        try { ref.pan.disconnect() } catch (_) {}
      })
      this.earlyReflections = []

      try { this._gainNode?.disconnect() } catch (_) {}
      try { this._pannerNode?.disconnect() } catch (_) {}
      try { this._postPannerGain?.disconnect() } catch (_) {}
      this._surroundPanners?.forEach(({ panner, gain }) => {
        try { gain.disconnect() } catch (_) {}
        try { panner.disconnect() } catch (_) {}
      })
      this._surroundPanners = []
      try { this._surroundMixGain?.disconnect() } catch (_) {}
      try { this.cornerFilter?.disconnect() } catch (_) {}
      try { this.cornerCompressor?.disconnect() } catch (_) {}
      try { this.reverbSend?.disconnect() } catch (_) {}

      this._gainNode = null
      this._pannerNode = null
      this._postPannerGain = null
      this._surroundMixGain = null
      this.cornerFilter = null
      this.cornerCompressor = null
      this.reverbSend = null
      this.outputNode = null

      this._audioBuffer = null
      this._audioDescriptor = null
      this._audioCacheManager = null
      this._playbackListeners = new Set()
      this._activeSources = new Set()
      this._activeSource = null
      this._playing = ref(false)
      this._bufferPromise = null

      this._audioContext = null
      this.state = null
    } catch (err) {
      console.warn('Failed to clean up sound source:', err)
    }
  }
  
}
