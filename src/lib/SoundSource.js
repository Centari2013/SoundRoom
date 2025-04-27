// lib/SoundSource.js

import { reactive } from "vue";
export default class SoundSource {
  constructor({
    audioContext,
    masterGain,
    file,
    state,
    volume = 1,
    loop = true,
    canvasContext
  }) {
    this.state = state;

    this._rad = (deg) => (deg * Math.PI) / 180;
    this._scale = 0.01;

    this._audioContext = audioContext;
    this._ctx = canvasContext;
    
    this._audioElement = new Audio(file);
    this._audioElement.preload = 'auto';
    this._audioElement.loop = loop;
    this._audioElement.volume = volume;

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
    this._volume = volume;
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
    try {
      if (this._audioElement) {
        this._audioElement.pause()
        if (this._audioElement.src.startsWith('blob:')) {
          URL.revokeObjectURL(this._audioElement.src)
        }
        this._audioElement.src = ''
        this._audioElement.load()
        this._audioElement = null
      }
  
      this._sourceNode?.disconnect()
      this._gainNode?.disconnect()
      this._pannerNode?.disconnect()
  
      this._sourceNode = null
      this._gainNode = null
      this._pannerNode = null
  
      this._ctx = null
      this._audioContext = null
      this.state = null
    } catch (err) {
      console.warn('Failed to clean up sound source:', err)
    }
  }
  
}
