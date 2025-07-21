// lib/SoundSource.js
import { ref } from 'vue'
/**
 * Wrapper around a DOM `<audio>` element and the Web Audio nodes used to
 * spatialise it. The `state` object drives position and orientation of the
 * source so the canvas and audio remain in sync.
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
    state
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
      paused: false, // whether scheduling is currently paused
    };


    this._rad = (deg) => (deg * Math.PI) / 180;
    this._scale = 0.01;

    this._audioContext = audioContext;
    
    // A simple <audio> element is used as the source. It's connected into the
    // Web Audio graph so we can apply spatialisation and gain control.
    this._audioElement = new Audio(file);
    this._audioElement.preload = 'auto';
    this._audioElement.loop = false;
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

    this._playing = ref(this.state.schedule.isPlaying ?? true);
    this._volume = this.state.volume ?? 1; // default to 1 if not set

    this._audioElement.addEventListener('play', this._onPlay);
    this._audioElement.addEventListener('pause', this._onPause);
    this._audioElement.addEventListener('ended', this._onEnded);



  }
  
  _onPlay = () => {
    this._playing.value = true;
  };

  _onPause = () => {
    this._playing.value = false;
  };

  _onEnded = () => {
        // When looping is enabled the media element will fire an `ended` event
    // before immediately restarting playback. In that case we should keep the
    // internal playing state set to `true` so UI play/pause controls remain
    // accurate.
    if (!this._audioElement.loop) {
      this._playing.value = false;
    }
  };

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
  }

  /** Force playback from the start of the audio file. */
  forcePlayFromStart() {
    this._audioElement.currentTime = 0;
    this._audioElement.play();
    this.updateAudio();
  }

  /** Pause playback of the audio element. */
  stop() {
    this._audioElement.pause();
  }

  /**
   * Whether the sound is currently playing.
   * @returns {boolean}
  */
  get playing() {
    const sched = this.state.schedule;
    return !sched.paused;
    
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

    p.positionX.setValueAtTime(x, ctx.currentTime);
    p.positionY.setValueAtTime(y, ctx.currentTime);
    p.positionZ.setValueAtTime(0, ctx.currentTime);

    p.orientationX.setValueAtTime(Math.cos(angleRad), ctx.currentTime);
    p.orientationY.setValueAtTime(Math.sin(angleRad), ctx.currentTime);
    p.orientationZ.setValueAtTime(0, ctx.currentTime);

    this._room ?? this.updateRoomInteraction(this._room);
  }


  /**
   * Adjust source properties based on proximity to room walls and corners.
   * @param {import('./Room').default} room
   */
  updateRoomInteraction(room) {
    if (!room) return;

    const { x, y } = this.state;
    const roomWidth = room.width;
    const roomHeight = room.height;

    // Distance to each wall
    const distLeft = x;
    const distRight = roomWidth - x;
    const distTop = y;
    const distBottom = roomHeight - y;

    // Nearest wall
    const minWallDist = Math.min(distLeft, distRight, distTop, distBottom);

    // Distance to corners
    const distTopLeft = Math.hypot(x, y);
    const distTopRight = Math.hypot(roomWidth - x, y);
    const distBottomLeft = Math.hypot(x, roomHeight - y);
    const distBottomRight = Math.hypot(roomWidth - x, roomHeight - y);
    const minCornerDist = Math.min(distTopLeft, distTopRight, distBottomLeft, distBottomRight);

    // Normalize to 0–1 where 0 = touching, 1 = far
    const normWall = Math.min(minWallDist / 100, 1);
    const normCorner = Math.min(minCornerDist / 150, 1);

    // Simulate some corner muffling or reverb boost
    const cornerGain = 1 - normCorner;
    const wallGain = 1 - normWall;

    // Example usage: reduce gain near corners, increase reverbSend near corners
    this._gainNode.gain.setValueAtTime(0.5 + 0.5 * wallGain, this._audioContext.currentTime);
    this.reverbSend.gain.setValueAtTime(0.2 + 0.8 * cornerGain, this._audioContext.currentTime);
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
    // Gracefully disconnect and release all Web Audio nodes and the underlying
    // <audio> element when a source is removed from the room.
    try {
      if (this._audioElement) {
        this._audioElement.pause()
        this._audioElement.load()
        this._audioElement?.removeEventListener('play', this._onPlay);
        this._audioElement?.removeEventListener('pause', this._onPause);
        this._audioElement?.removeEventListener('ended', this._onEnded);

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
