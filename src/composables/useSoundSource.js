import { ref } from 'vue'

export function useSoundSource({
  audioContext,
  file,
  position = [0, 0, 0],
  angle = 0,
  coneInner = 360,
  coneOuter = 360,
  loop = true,
  ctx
}) {
  const state = {
    x: position[0],
    y: position[1],
    angle,
    coneInner,
    coneOuter
  }

  const rad = (deg) => (deg * Math.PI) / 180
  const scale = 0.01

  const audioElement = new Audio()
  audioElement.src = file
  audioElement.preload = 'auto'
  audioElement.loop = loop
  audioElement.volume = 1.0

  const sourceNode = audioContext.createMediaElementSource(audioElement)
  const gainNode = audioContext.createGain()
  const pannerNode = audioContext.createPanner()

  pannerNode.panningModel = 'HRTF'
  pannerNode.distanceModel = 'inverse'
  pannerNode.refDistance = 1
  pannerNode.maxDistance = 10000
  pannerNode.rolloffFactor = 1
  pannerNode.coneInnerAngle = coneInner
  pannerNode.coneOuterAngle = coneOuter
  pannerNode.coneOuterGain = 0.2

  sourceNode.connect(gainNode).connect(pannerNode).connect(audioContext.destination)

  const updateAudio = () => {
    const radAngle = rad(state.angle)
    const x = state.x * scale
    const y = state.y * scale

    if (pannerNode.positionX) {
      pannerNode.positionX.setValueAtTime(x, audioContext.currentTime)
      pannerNode.positionY.setValueAtTime(y, audioContext.currentTime)
      pannerNode.positionZ.setValueAtTime(0, audioContext.currentTime)

      pannerNode.orientationX.setValueAtTime(Math.cos(radAngle), audioContext.currentTime)
      pannerNode.orientationY.setValueAtTime(Math.sin(radAngle), audioContext.currentTime)
      pannerNode.orientationZ.setValueAtTime(0, audioContext.currentTime)
    } else {
      pannerNode.setPosition(x, y, 0)
      pannerNode.setOrientation(Math.cos(radAngle), Math.sin(radAngle), 0)
    }
  }

  const draw = () => {
    const { x, y, angle, coneInner, coneOuter } = state;
    const radAngle = rad(angle);
    const coneLength = 80;
  
    if (!ctx) return;
  
    // Outer cone (soft)
    if (coneOuter < 360) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(radAngle - rad(coneOuter / 2)) * coneLength,
        y + Math.sin(radAngle - rad(coneOuter / 2)) * coneLength
      );
      ctx.lineTo(
        x + Math.cos(radAngle + rad(coneOuter / 2)) * coneLength,
        y + Math.sin(radAngle + rad(coneOuter / 2)) * coneLength
      );
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.fill();
    }
  
    // Inner cone (hard)
    if (coneInner < 360) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(radAngle - rad(coneInner / 2)) * coneLength,
        y + Math.sin(radAngle - rad(coneInner / 2)) * coneLength
      );
      ctx.lineTo(
        x + Math.cos(radAngle + rad(coneInner / 2)) * coneLength,
        y + Math.sin(radAngle + rad(coneInner / 2)) * coneLength
      );
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
      ctx.fill();
    }
  
    // Core circle
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#f00';
    ctx.fill();
  
    // Direction line
    if (coneInner < 360){
      const dx = Math.cos(radAngle) * 14;
      const dy = Math.sin(radAngle) * 14;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx, y + dy);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
  };

  let playing = ref(false);

  const play = () =>{
    audioElement.play()
    updateAudio()
    playing.value = true
  }

  const stop = () => {
    audioElement.pause()
    playing.value = false
  }

  // TODO: add volume controls

  return {
    sourceNode,
    gainNode,
    pannerNode,
    state,
    updateAudio,
    draw,
    playing,
    play,
    stop,
    dispose: () => {
      try {
        audioElement.pause()
        audioElement.src = ''
        sourceNode.disconnect()
        gainNode.disconnect()
        pannerNode.disconnect()
      } catch (err) {
        console.warn('Media element cleanup failed:', err)
      }
    }
  }
}