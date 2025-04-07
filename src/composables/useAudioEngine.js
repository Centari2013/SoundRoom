// src/composables/useAudioEngine.js

import { createSoundSource } from '@/audio/createSoundSource';

export function useAudioEngine({ soundSources, ctxRef, selectedIndex, deletedSources }) {
  let audioContext = null;

const getAudioContext = () => audioContext;

const ensureAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}


  const setupAudioEngine = async () => {
    soundSources.value.forEach((src) => {
      const ctx = ensureAudioContext();
      const instance = createSoundSource({
        audioContext: ctx,
        file: src.audioPath, // just the string path
        position: [src.x, src.y, 0],
        loop: true,
        onload: () => {}
      });
  
      instance.state = {
        x: src.x,
        y: src.y,
        angle: src.angle
      };
  
      instance.draw = () => {
        const { x, y } = instance.state;
        const ctx = ctxRef.value;
        if (!ctx) return;
  
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.fill();
  
        const angleRad = (instance.state.angle * Math.PI) / 180;
        const dx = Math.cos(angleRad) * 14;
        const dy = Math.sin(angleRad) * 14;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + dy);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      };
  
      

      instance.audioElement.play()
  
      src.instance = instance;
    });
  };

  const deleteSoundSource = () => {
    if (selectedIndex.value !== null) {
      const src = soundSources.value[selectedIndex.value]
      const instance = src.instance

      instance.state = {
        x: src.x,
        y: src.y,
        angle: src.angle
      };
      

      instance?.stop?.();
      instance?.dispose?.();

      deletedSources.value.push(src)
      soundSources.value.splice(selectedIndex.value, 1)
      selectedIndex.value = Math.min(selectedIndex.value, soundSources.value.length - 1)
    }
  }

  return {
    setupAudioEngine,
    deleteSoundSource,
    getAudioContext
  }
}
