// lib/SoundSource.js

/**
 * Wrapper around a DOM `<audio>` element and the Web Audio nodes used to
 * spatialise it. The `state` object drives position and orientation of the
 * source so the canvas and audio remain in sync.
 */
export default class SoundSource {
  /**
   * Create a new SoundSource wrapper.
   *
   * @param {Object} options
   * @param {AudioContext} options.audioContext - context used for nodes
   * @param {GainNode} options.masterGain - master gain node
   * @param {string} options.file - URL or blob to load
   * @param {Object} options.state - reactive state object
   * @param {boolean} [options.loop=true] - loop playback by default
   */
  constructor({
    audioContext,
    masterGain,
    file,
    state,
    loop = true
  }) {
    // `state` holds the spatial position/angle and is kept in sync with the
    // canvas representation.
    this.state = state;
    this.state.schedule = state.schedule || {
      id: crypto.randomUUID(),
      enabled: false,
      mode: "interval", // "loop", "interval", "count", or "interval+count"

      // Applies to interval-based scheduling
      gapMin: 5,
      gapMax: 10,

      // Applies to time-bound or count-based schedules
      count: 5,           // null = unlimited
      activeStart: 0,     // time window start (in seconds)
      activeEnd: 300,     // time window end

      // Restart behaviour
      restart: false,     // force immediate restart when schedule changes

      // Internal state
      timesPlayed: 0,
      isPlaying: true, // whether the sound is currently playing
      lastPlayedAt: null,
    };


    this._rad = (deg) => (deg * Math.PI) / 180;
    this._scale = 0.01;

    this._audioContext = audioContext;
    
    // A simple <audio> element is used as the source. It's connected into the
    // Web Audio graph so we can apply spatialisation and gain control.
    this._audioElement = new Audio(file);
    this._audioElement.preload = 'auto';
    this._audioElement.loop = loop;
    this._audioElement.volume = this.state.volume ?? 1;

    this._sourceNode = audioContext.createMediaElementSource(this._audioElement);
    this._gainNode = audioContext.createGain();
    this._pannerNode = audioContext.createPanner();

    // Configure the panner to simulate distance and directionality.
    const pn = this._pannerNode;
    pn.panningModel = 'HRTF';
    pn.distanceModel = 'inverse';
    pn.refDistance = 1;
    pn.maxDistance = 10000;
    pn.rolloffFactor = 1;
    pn.coneInnerAngle = this.state.coneInner;
    pn.coneOuterAngle = this.state.coneOuter;
    pn.coneOuterGain = 0.2;

   this._sourceNode
    .connect(this._gainNode)
    .connect(this._pannerNode);

    // Save the final node as outputNode (for reverb and dry path)
    this.outputNode = this._pannerNode

    // Connect dry path directly to master
    this.outputNode.connect(masterGain ?? audioContext.destination);

    // Optional: expose the panner node output for reverb routing
    this.reverbSend = audioContext.createGain()
    this.reverbSend.gain.value = 1 // or tweak per-source reverb level

    this.outputNode.connect(this.reverbSend) // split the signal for reverb

    this._playing = false;
    this._volume = this.state.volume ?? 1; // default to 1 if not set

    if (this.state.isPlaying) { // if sound was playing when saved
      this.play()
    }

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

  /** Start playback of the audio element. */
  play() {
    this._audioElement.play();
    this.updateAudio();
    this._playing = true;
  }

  /** Force playback from the start of the audio file. */
  forcePlayFromStart() {
    this._audioElement.currentTime = 0;
    this._audioElement.play();
    this.updateAudio();
    this._playing = true;
  }

  /** Pause playback of the audio element. */
  stop() {
    this._audioElement.pause();
    this._playing = false;
  }

  /**
   * Whether the sound is currently playing.
   * @returns {boolean}
   */
  get playing() {
    return this._playing;
  }

  /**
   * Set the playback volume for this source.
   * @param {number} v
   */
  setVolume(v) {
    this._volume = v;
    this._audioElement.volume = v;
  }

  /**
   * Retrieve the current playback volume.
   * @returns {number}
   */
  getVolume() {
    return this._volume;
  }

  /**
   * Sync Web Audio panner position and orientation with the state used by the canvas.
   */
  updateAudio() {
    // Sync the Web Audio panner with the state used by the canvas. Both
    // position and orientation are updated each time the source moves.
    const angleRad = this._rad(this.state.angle);
    const x = this.state.x * this._scale;
    const y = this.state.y * this._scale;

    const p = this._pannerNode;
    const ctx = this._audioContext;

    if (p.positionX) {
      p.positionX.setValueAtTime(x, ctx.currentTime);
      p.positionY.setValueAtTime(y, ctx.currentTime);
      p.positionZ.setValueAtTime(0, ctx.currentTime);

      p.orientationX.setValueAtTime(Math.cos(angleRad), ctx.currentTime);
      p.orientationY.setValueAtTime(Math.sin(angleRad), ctx.currentTime);
      p.orientationZ.setValueAtTime(0, ctx.currentTime);
    } else {
      p.setPosition(x, y, 0);
      p.setOrientation(Math.cos(angleRad), Math.sin(angleRad), 0);
    }
  }

  /**
   * Gracefully disconnect and release all Web Audio nodes and associated resources.
   */
  dispose() {
    // Gracefully disconnect and release all Web Audio nodes and the underlying
    // <audio> element when a source is removed from the room.
    try {
      if (this._audioElement) {
        this._audioElement.pause()
        this._audioElement.load()
        this._audioElement = null
      }
  
      this._sourceNode?.disconnect()
      this._gainNode?.disconnect()
      this._pannerNode?.disconnect()
      this.reverbSend?.disconnect()

      this._sourceNode = null
      this._gainNode = null
      this._pannerNode = null
      this.reverbSend = null
  
      this._audioContext = null
      this.state = null
    } catch (err) {
      console.warn('Failed to clean up sound source:', err)
    }
  }
  
}
