<!-- ModalWrapper.vue -->
<template>
  <portal to="modal">
    <div class="modal-wrapper">
      <div class="overlay" @click="$router.push('/')"></div>
      <div class="modal">
        <component :is="component" v-bind="$attrs" />
      </div>
    </div>
  </portal>
</template>

<script setup>
defineProps(['component'])
</script>

<style scoped>
.modal-wrapper {
  position: fixed;
  inset: 0;
  z-index: 1000;
}
.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
}
.modal {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 90vw;
}
</style>
