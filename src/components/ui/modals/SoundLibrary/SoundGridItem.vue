<template>
  <div
    :class="[
      'relative aspect-square flex flex-col items-center justify-between p-4 rounded-xl bg-[var(--color-surface-muted)] text-text-primary shadow-strong border-border-strong border transition-shadow duration-200',
      highlightClass
    ]"
  >

    <div
      v-if="sound.locked"
      :class="['absolute top-3 right-3 px-2 py-1 text-[10px] font-semibold uppercase rounded tracking-wide', badgeClass]"
    >
      {{ requiredPlanLabel }}
    </div>

    <MarqueeTitle :text="getSourceName(sound.name)" />

    <SoundPreviewCircle
      :soundData="sound"
      :currentlyPlayingId="currentlyPlayingId"
      :locked="previewLocked"
      @updateCurrent="$emit('updateCurrent', $event)"
      @locked="$emit('locked', sound)"
    />

    <BaseButton
      class="load-BaseButton text-xs px-3 py-1 rounded transition-colors mt-2 bg-accent text-[var(--color-text-inverse)] hover:bg-accent-strong border border-border-strong shadow-soft"
      @click="handleToggle"
      :disabled="waiting || sound.send"
    >
      {{ buttonLabel }}
    </BaseButton>
    <BaseButton
      v-if="userSound"
      class="hover:underline !bg-transparent !border-none !text-xs !text-text-primary hover:!text-status-danger"
      @click="$emit('delete', sound)"
    >
      Delete
    </BaseButton>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import SoundPreviewCircle from '@/components/ui/modals/SoundLibrary/SoundPreviewCircle.vue'
import MarqueeTitle from '@/components/ui/text/MarqueeTitle.vue'
import { getSourceName } from '@/composables/useSelectedSource'
import { PLAN_LABELS } from '@/constants/entitlementCopy'
import { getSoundHighlightClass, getPlanBadgeClass } from '@/constants/planThemes'

const props = defineProps({
  sound: Object,
  waiting: Boolean,
  soundLibrarySources: Array,
  currentlyPlayingId: String,
  userSound: Boolean
})

const emit = defineEmits(['toggle', 'updateCurrent', 'delete', 'locked'])

const isLoaded = computed(() => props.soundLibrarySources.find((s) => s.libraryId === props.sound.libraryId))

const normalizedTier = computed(() => {
  const tier = props.sound?.plan_tier ?? props.sound?.base ?? ''
  return typeof tier === 'string' ? tier.toLowerCase() : ''
})

const highlightClass = computed(() => {
  if (!props.sound.locked || props.sound.accessReason !== 'tier') {
    return ''
  }

  return getSoundHighlightClass(normalizedTier.value)
})

const badgeClass = computed(() => {
  if (props.sound.accessReason === 'ownership') {
    return getPlanBadgeClass('free')
  }
  return getPlanBadgeClass(normalizedTier.value)
})

const previewLocked = computed(() => props.sound.accessReason === 'ownership')

const buttonLabel = computed(() => {
  if (isLoaded.value) return 'Remove'
  return props.sound.locked ? 'Unlock' : 'Load'
})

const requiredPlanLabel = computed(() => {
  if (!props.sound.locked) return ''
  if (props.sound.accessReason === 'ownership') {
    return 'Private'
  }
  const label = PLAN_LABELS[props.sound.requiredPlan]
  return label ?? PLAN_LABELS.pro
})

function handleToggle() {
  if (!isLoaded.value && props.sound.locked) {
    emit('locked', props.sound)
    return
  }
  emit('toggle', props.sound)
}
</script>
<style>
.close-button {
  background: transparent;
  border: transparent;
  color: inherit;

}




</style>
