<template>
  <!-- Library drawer backdrop -->
  <div
    v-if="mobileSidebarOpen"
    class="fixed inset-0 z-40 bg-black/50"
    @click="$emit('update:mobileSidebarOpen', false)"
    aria-hidden="true"
  />

  <!-- Library drawer: slides in from left, full height -->
  <div
    class="fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ease-in-out"
    :class="mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <SidebarLeft
      :MAX_SOURCES="MAX_SOURCES"
      :handleDragStart="handleDragStart"
      :handleTap="handleTap"
      :listener="listener"
    />
  </div>

  <!-- Save confirmation modal -->
  <YesNoModal
    v-if="showSaveConfirm"
    @close="showSaveConfirm = false"
    :yesFunction="handleSaveOnly"
    :noFunction="() => showSaveConfirm = false"
    message="Would you like to save your room?"
    title="Save Room"
  />

  <!-- New room confirmation modal -->
  <YesNoModal
    v-if="showNewRoomConfirm"
    @close="showNewRoomConfirm = false"
    :yesFunction="handleSaveThenNewRoom"
    :noFunction="handleSkipSaveThenNewRoom"
    :showCancelButton="true"
    message="Would you like to save this room first?"
    title="New Room"
  />

  <!-- ─── Full HUD layout ─────────────────────────────────── -->
  <div class="h-full w-full flex flex-col overflow-hidden">

    <!-- Slim top bar: ☰ library, transport, master volume -->
    <div
      class="flex items-center justify-between px-2 shrink-0 h-10
             bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-subtle)]"
    >
      <!-- Left: library toggle + play/undo/redo -->
      <div class="flex items-center gap-1.5">
        <button
          class="w-9 h-8 flex items-center justify-center rounded
                 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]
                 text-[var(--color-text-primary)] text-base"
          @click="$emit('update:mobileSidebarOpen', !mobileSidebarOpen)"
          aria-label="Toggle sound library"
        >☰</button>

        <button
          class="w-9 h-8 flex items-center justify-center rounded
                 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]
                 text-[var(--color-text-primary)] disabled:opacity-40"
          :disabled="!hasCanvasTransportSources"
          :title="isPlaying ? 'Pause all' : 'Play all'"
          @click="isPlaying ? audioEngine.pauseAll() : audioEngine.playAll()"
        >
          <component :is="isPlaying ? Pause : Play" class="h-4 w-4 fill-[var(--color-text-primary)]" />
        </button>

        <button
          class="w-9 h-8 flex items-center justify-center rounded
                 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]
                 text-[var(--color-text-primary)] disabled:opacity-40"
          :disabled="actionStackEmpty || waiting"
          title="Undo"
          @click="actionManager.undoLastAction"
        >
          <UndoRedo class="h-4 w-4 fill-[var(--color-text-primary)]" />
        </button>

        <button
          class="w-9 h-8 flex items-center justify-center rounded
                 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]
                 text-[var(--color-text-primary)] disabled:opacity-40"
          :disabled="redoStackEmpty || waiting"
          title="Redo"
          @click="actionManager.redoLastAction"
        >
          <UndoRedo class="h-4 w-4 scale-x-[-1] fill-[var(--color-text-primary)]" />
        </button>
      </div>

      <!-- Right: master volume slider -->
      <div class="flex items-center pr-1">
        <VueSlider
          v-model="audioEngine.masterVolume.value"
          :min="0"
          :max="1"
          :interval="0.01"
          :width="90"
          :height="4"
          tooltip="none"
        />
      </div>
    </div>

    <!-- Canvas: fills all remaining height edge-to-edge -->
    <div
      class="flex-1 min-h-0 min-w-0 relative overflow-hidden
             bg-[var(--color-bg-surface)] flex items-center justify-center"
    >
      <div class="pointer-events-none absolute inset-0 canvas-vignette" aria-hidden="true" />
      <MainCanvasStage
        v-bind="{
          handleDrop,
          onKeyDown,
          onKeyUp,
          contextMenuActions,
          showContextMenu,
          selectedIndex,
          handleStageClick,
        }"
        @selectNode="$emit('selectNode', $event)"
      />
      <PulsingOverlay
        v-if="isLoadingRoom || isSavingRoom"
        :text="isLoadingRoom ? 'Loading your room…' : 'Saving your room…'"
      />
    </div>

    <!-- Slim bottom bar: save + new room -->
    <div
      class="flex items-center gap-2 px-2 shrink-0 h-10
             bg-[var(--color-bg-elevated)] border-t border-[var(--color-border-subtle)]"
    >
      <button
        class="px-3 py-1.5 rounded text-sm
               bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]
               text-[var(--color-text-primary)] disabled:opacity-40
               transition focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        :disabled="isSavingRoom || !isRoomSaveable"
        @click="showSaveConfirm = true"
        aria-label="Save room"
      >Save Room</button>

      <button
        class="px-3 py-1.5 rounded text-sm
               bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]
               text-[var(--color-text-primary)] disabled:opacity-40
               transition focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        :disabled="isSavingRoom || isRoomEmpty"
        @click="showNewRoomConfirm = true"
        aria-label="New room"
      >New Room +</button>
    </div>
  </div>

  <!-- Selected-source bottom sheet ─────────────────────────── -->
  <div
    v-if="selectedSource"
    class="fixed inset-0 z-40 bg-black/40"
    @click="$emit('deselect')"
    aria-hidden="true"
  />
  <div
    class="fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out
           max-h-[75vh] overflow-y-auto overscroll-contain
           rounded-t-2xl border-t border-[var(--color-border-subtle)]
           bg-[var(--color-bg-elevated)] shadow-[0_-12px_30px_rgba(0,0,0,0.35)]
           pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    :class="selectedSource ? 'translate-y-0' : 'translate-y-full'"
    role="dialog"
    aria-label="Selected source settings"
  >
    <!-- Grab handle + close -->
    <div class="sticky top-0 flex items-center justify-between px-4 pt-3 pb-2 bg-[var(--color-bg-elevated)]">
      <span
        class="absolute left-1/2 top-1.5 -translate-x-1/2 h-1 w-10 rounded-full bg-[var(--color-border-subtle)]"
        aria-hidden="true"
      />
      <span class="text-sm font-semibold uppercase text-[var(--color-text-muted)]">Source</span>
      <button
        type="button"
        class="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-2xl leading-none px-2"
        aria-label="Close source settings"
        @click="$emit('deselect')"
      >×</button>
    </div>
    <div class="px-4">
      <SelectedSourcePanel :selectedSource="selectedSource" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { useRoomStore } from '@/stores/useRoomStore'
import { useAuth } from '@/composables/useAuth'
import { resetRoomState } from '@/utils/resetRoomState'

import SidebarLeft from '@/components/SoundRoom/SidebarLeft/SidebarLeft.vue'
import MainCanvasStage from '@/components/SoundRoom/MainCanvasStage/MainCanvasStage.vue'
import SelectedSourcePanel from '@/components/SoundRoom/SidebarRight/SelectedSourcePanel.vue'
import PulsingOverlay from '@/components/ui/overlays/PulsingOverlay.vue'
import YesNoModal from '@/components/ui/modals/YesNoModal.vue'
import VueSlider from 'vue-3-slider-component'

import UndoRedo from '@/assets/icons/undo-redo.svg'
import Pause from '@/assets/icons/pause.svg'
import Play from '@/assets/icons/play.svg'

// ─── Props ──────────────────────────────────────────────────────────────────

const props = defineProps({
  // drawer state (v-model)
  mobileSidebarOpen: { type: Boolean, required: true },

  // SidebarLeft
  MAX_SOURCES: { type: Number, required: true },
  handleDragStart: { type: Function, required: true },
  handleTap:       { type: Function, required: true },
  listener:        { type: Object,   required: true },

  // MainCanvasStage
  handleDrop:       { type: Function, required: true },
  onKeyDown:        { type: Function, required: true },
  onKeyUp:          { type: Function, required: true },
  contextMenuActions: { type: Object,   default: null },
  showContextMenu:    { type: Function, default: null },
  selectedIndex:      { type: Number,   default: null },
  handleStageClick:   { type: Function, required: true },

  // Selected source (for bottom sheet)
  selectedSource: { type: Object, default: null },

  // Loading / saving
  isLoadingRoom: { type: Boolean, default: false },
  isSavingRoom:  { type: Boolean, default: false },
  saveRoom:      { type: Function, required: true },
})

const emit = defineEmits(['update:mobileSidebarOpen', 'selectNode', 'deselect'])

// ─── Stores ─────────────────────────────────────────────────────────────────

const router = useRouter()
const { isAuthenticated } = useAuth()

const engineStore = useAudioEngineStore()
const actionStore = useActionManagerStore()
const roomStore   = useRoomStore()

const { audioEngine, isPlaying, hasCanvasTransportSources } = storeToRefs(engineStore)
const { actionManager, actionStackEmpty, redoStackEmpty, waiting } = storeToRefs(actionStore)
const { isRoomSaveable, isRoomEmpty } = storeToRefs(roomStore)

// ─── Save / New room ────────────────────────────────────────────────────────

const showSaveConfirm    = ref(false)
const showNewRoomConfirm = ref(false)

async function handleSaveOnly() {
  if (!isAuthenticated.value) {
    showSaveConfirm.value = false
    router.push({ name: 'login' })
    return
  }
  try {
    await props.saveRoom()
  } catch (e) {
    console.error('Error saving room:', e)
  } finally {
    showSaveConfirm.value = false
  }
}

async function handleSaveThenNewRoom() {
  if (!isAuthenticated.value) {
    showNewRoomConfirm.value = false
    router.push({ name: 'login' })
    return
  }
  try {
    const saved = await props.saveRoom()
    if (saved) {
      resetRoomState()
      router.push({ name: 'app' })
    }
  } catch (e) {
    console.error('Error saving before new room:', e)
  } finally {
    showNewRoomConfirm.value = false
  }
}

function handleSkipSaveThenNewRoom() {
  resetRoomState()
  router.push({ name: 'app' })
  showNewRoomConfirm.value = false
}
</script>
