<!-- components/Gate.vue -->
<script setup>
import { useAuth } from '@/composables/useAuth'
import { can } from '@/utils/permissions'
const props = defineProps({ feature: { type: String, required: true } })
const { tier } = useAuth()

/*
<Gate feature="canUpload">
  <Uploader />
  <template #locked>
    <UpgradeTease feature="Uploads" plan="Pro" />
  </template>
</Gate>
*/
</script>

<template>
  <slot v-if="can(tier, props.feature)" />
  <slot name="locked" v-else />
</template>
