<!-- ModalWrapper.vue -->
<template>
  <portal to="modal">
    <div class="modal-wrapper">
      <div class="modal w-full h-full">
        <component :is="ResolvedComponent" v-bind="$attrs" class="w-full" />
      </div>
    </div>
  </portal>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue'
const props = defineProps(['component'])

const ResolvedComponent = computed(() =>
  defineAsyncComponent(props.component)
)
</script>

<style scoped>
.modal-wrapper {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.modal {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 12px;
  padding: 2rem;
  max-width: 100vw;
}
</style>
