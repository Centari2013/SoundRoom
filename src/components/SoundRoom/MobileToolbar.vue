<template>
  <section class="w-full rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/80 backdrop-blur border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm space-y-4">
    <div class="flex items-center justify-center gap-4 text-neutral-900 dark:text-white">
      <BaseButton
        :disabled="audioEngine.soundSources.value.length === 0"
        @click="isPlaying ? audioEngine.pauseAll() : audioEngine.playAll()"
        class="w-12 h-12 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center"
        :aria-label="isPlaying ? 'Pause playback' : 'Play all sources'"
      >
        <component :is="isPlaying ? Pause : Play" class="h-5 w-5 fill-black dark:fill-white" />
      </BaseButton>

      <BaseButton
        :disabled="actionStackEmpty || waiting"
        @click="actionManager.undoLastAction"
        class="w-12 h-12 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center"
        aria-label="Undo last action"
      >
        <UndoRedo class="h-5 w-5 fill-black dark:fill-white" />
      </BaseButton>

      <BaseButton
        :disabled="redoStackEmpty || waiting"
        @click="actionManager.redoLastAction"
        class="w-12 h-12 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center"
        aria-label="Redo last action"
      >
        <UndoRedo class="h-5 w-5 scale-x-[-1] fill-black dark:fill-white" />
      </BaseButton>
    </div>

    <div class="space-y-2">
      <label class="block text-xs uppercase tracking-wide text-neutral-500">Master Volume</label>
      <VueSlider
        v-model="audioEngine.masterVolume.value"
        :min="0"
        :max="1"
        :interval="0.01"
        :height="4"
        tooltip="none"
        class="w-full"
      />
    </div>
  </section>
</template>

<script setup>
import BaseButton from '@/components/ui/input/BaseButton.vue'
import UndoRedo from '@/assets/icons/undo-redo.svg'
import Pause from '@/assets/icons/pause.svg'
import Play from '@/assets/icons/play.svg'
import VueSlider from 'vue-3-slider-component'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { storeToRefs } from 'pinia'

const engineStore = useAudioEngineStore()
const actionStore = useActionManagerStore()
const { audioEngine, isPlaying } = storeToRefs(engineStore)
const { actionManager, actionStackEmpty, redoStackEmpty, waiting } = storeToRefs(actionStore)
</script>
