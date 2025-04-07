export function createSoundSource({
  audioContext,
  file,
  position = [0, 0, 0],
  angle = 0,
  coneInner = 360,
  coneOuter = 360,
  loop = true,
  onload = () => {},
}) {
  const audioElement = new Audio();
  audioElement.src = file;
  audioElement.preload = 'auto';
  audioElement.loop = loop;
  audioElement.volume = 1.0;

  const sourceNode = audioContext.createMediaElementSource(audioElement);
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 2.0;

  const pannerNode = audioContext.createPanner();

  pannerNode.panningModel = 'HRTF';
  pannerNode.distanceModel = 'inverse';
  pannerNode.refDistance = 1;
  pannerNode.maxDistance = 10000;
  pannerNode.rolloffFactor = 1;
  pannerNode.coneInnerAngle = coneInner;
  pannerNode.coneOuterAngle = coneOuter;
  pannerNode.coneOuterGain = 0.2;

  const state = {
    x: position[0],
    y: position[1],
    angle
  };

  const scale = 0.01;

  const updateAudio = () => {
    const scale = 0.01
    const rad = (state.angle * Math.PI) / 180
    pannerNode.setPosition(state.x * scale, state.y * scale, 0)
    pannerNode.setOrientation(Math.cos(rad), Math.sin(rad), 0)

  };

  const draw = () => {
    const { x, y } = state;
    const ctx = ctxRef?.value;
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.fill();

    const angleRad = (state.angle * Math.PI) / 180;
    const dx = Math.cos(angleRad) * 14;
    const dy = Math.sin(angleRad) * 14;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  sourceNode.connect(gainNode).connect(pannerNode).connect(audioContext.destination);
  onload();

  audioElement.play();

  return {
    audioElement,
    sourceNode,
    gainNode,
    pannerNode,
    state,
    updateAudio,
    draw,
    stop: () => audioElement.pause(),
    dispose: () => {
      audioElement.pause();
      audioElement.src = '';
      sourceNode.disconnect();
      gainNode.disconnect();
      pannerNode.disconnect();
    }
  };
}
