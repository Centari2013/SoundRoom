// lib/SoundSource.js
/**
 * Wraps an HTMLAudioElement and connects it to the Web Audio graph with
 * spatialisation support.
 */

export default class SoundSource {
  /**
   * @param {{audioContext: AudioContext, masterGain: GainNode, file: string, state: Object, loop?: boolean}} param0
   */
  constructor({
    audioContext,
    masterGain,
    file,
    state,
    loop = true
  }) {
    this.state = state;

    this._rad = (deg) => (deg * Math.PI) / 180;
    this._scale = 0.01;

    this._audioContext = audioContext;
    
    this._audioElement = new Audio(file);
    this._audioElement.preload = 'auto';
    this._audioElement.loop = loop;
    this._audioElement.volume = this.state.volume ?? 1;

    this._sourceNode = audioContext.createMediaElementSource(this._audioElement);
    this._gainNode = audioContext.createGain();
    this._pannerNode = audioContext.createPanner();

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

  /** Start playback of the audio. */
  play() {
    this._audioElement.play();
    this.updateAudio();
    this._playing = true;
  }

  /** Pause playback of the audio. */
  stop() {
    this._audioElement.pause();
    this._playing = false;
  }

  /** @returns {boolean} */
  get playing() {
    return this._playing;
  }

  /** @param {number} v */
  setVolume(v) {
    this._volume = v;
    this._audioElement.volume = v;
  }

  /** @returns {number} */
  getVolume() {
    return this._volume;
  }

  /** Update panner position/orientation based on current state. */
  updateAudio() {
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
   * Disconnects all nodes and frees references to help garbage collection.
   */
  dispose() {
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
