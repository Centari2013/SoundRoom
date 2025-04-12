// lib/SoundSource.js
export default class SoundSource {
  constructor({
    audioContext,
    masterGain,
    file,
    position = [0, 0, 0],
    angle = 0,
    coneInner = 360,
    coneOuter = 360,
    volume = 1,
    loop = true,
    canvasContext
  }) {
    this.state = {
      x: position[0],
      y: position[1],
      angle,
      coneInner,
      coneOuter
    };

    this._rad = (deg) => (deg * Math.PI) / 180;
    this._scale = 0.01;

    this._audioContext = audioContext;
    this._ctx = canvasContext;

    this._audioElement = new Audio();
    this._audioElement.src = file;
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
    pn.coneInnerAngle = coneInner;
    pn.coneOuterAngle = coneOuter;
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

  draw() {
    const ctx = this._ctx;
    if (!ctx) return;

    const { x, y, angle, coneInner, coneOuter } = this.state;
    const radAngle = this._rad(angle);
    const coneLength = 50;

    const rad = this._rad;
    const innerRadius = coneLength * 0.6;
    const outerRadius = coneLength;

    // OUTER CONE FADE ZONE — soft blur
    if (coneOuter < 360 && coneOuter > coneInner) {
      ctx.save();

      ctx.shadowColor = 'rgba(255, 100, 100, 0.2)';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, outerRadius, radAngle - rad(coneOuter / 2), radAngle + rad(coneOuter / 2));
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 100, 100, 0.05)';
      ctx.fill();

      ctx.restore();
    }

    // INNER CONE — clean fill, no blur
    if (coneInner < 360) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, coneLength, radAngle - rad(coneInner / 2), radAngle + rad(coneInner / 2));
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 120, 120, 0.2)';
      ctx.fill();
    }

    // Source node (dot)
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#f00';
    ctx.fill();

    // Direction line
    if (coneInner < 360) {
      const dx = Math.cos(radAngle) * 14;
      const dy = Math.sin(radAngle) * 14;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx, y + dy);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Rotation handle
    const handle = this.getRotationHandlePos();
    ctx.beginPath();
    ctx.arc(handle.x, handle.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }

  getRotationHandlePos() {
    const { x, y, angle, coneInner, coneOuter } = this.state;
    const radAngle = this._rad(angle);
    const coneLength = 50;

    // If there's a cone, place handle at tip of the inner cone (or outer)
    if (coneInner < 360 || coneOuter < 360) {
      return {
        x: x + Math.cos(radAngle) * coneLength,
        y: y + Math.sin(radAngle) * coneLength
      };
    }

    // If no cone, place handle a bit away from the circle center
    return {
      x: x + Math.cos(radAngle) * 30,
      y: y + Math.sin(radAngle) * 30
    };
  }

  dispose() {
    try {
      this._audioElement.pause();
      this._audioElement.src = '';
      this._sourceNode.disconnect();
      this._gainNode.disconnect();
      this._pannerNode.disconnect();
    } catch (err) {
      console.warn('Failed to clean up sound source:', err);
    }
  }
}
