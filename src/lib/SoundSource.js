// lib/SoundSource.js

/**
 * Wrapper around a DOM `<audio>` element and the Web Audio nodes used to
 * spatialise it. The `state` object drives position and orientation of the
 * source so the canvas and audio remain in sync.
 */
export default class SoundSource {
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

      // Internal state
      timesPlayed: 0,
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
      .connect(this._pannerNode)
      .connect(masterGain ?? audioContext.destination);

    this._playing = false;
    this._volume = this.state.volume ?? 1; // default to 1 if not set

    if (this.state.isPlaying) { // if sound was playing when saved
      this.play()
    }

  }

  play() {
    this._audioElement.play();
    this.updateAudio();
    this._playing = true;
  }

  stop() {
    this._audioElement.pause();
    this._playing = false;
  }

  get playing() {
    return this._playing;
  }

  setVolume(v) {
    this._volume = v;
    this._audioElement.volume = v;
  }

  getVolume() {
    return this._volume;
  }

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
  
      this._sourceNode = null
      this._gainNode = null
      this._pannerNode = null
  
      this._audioContext = null
      this.state = null
    } catch (err) {
      console.warn('Failed to clean up sound source:', err)
    }
  }
  
}
