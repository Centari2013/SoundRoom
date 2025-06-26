<template>
  <div
    v-if="visible"
    ref="menu"
    :style="{
      position: 'fixed',
      top: `${pos.y}px`,
      left: `${pos.x}px`,
    }"
    class="context-menu bg-white dark:bg-neutral-800 rounded shadow p-2 text-sm border border-neutral-300 dark:border-neutral-700"
  >
    <ul class="space-y-1">
      <li
        v-for="f in functionList"
        :key="f.label"
        @click="() => handleClick(f.function)"
        class="px-2 py-1 rounded cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
      >
        {{ f.label }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  functionList: Array, // [{label: 'foo', function: bar}, ...]
});

const visible = ref(false);
const pos = ref({ x: 0, y: 0 });
const menu = ref(null);

const show = (newPos) => {
  pos.value = newPos;
  visible.value = true;
};

function hide() {
  visible.value = false;
}

function handleClick(fn) {
  fn();
  hide();
}

function onGlobalClick(e) {
  if (
    visible.value // menu is visible
    && menu.value // menu is instantiated
    && !menu.value.contains(e.target) // SoundSourceNode etc. not under mouse
  ) {
    hide();
  }
}

onMounted(() => {
  document.addEventListener('click', onGlobalClick);
  document.addEventListener('contextmenu', onGlobalClick);
});

onUnmounted(() => {
  document.removeEventListener('click', onGlobalClick);
  document.removeEventListener('contextmenu', onGlobalClick);
});

defineExpose({
  visible,
  show
});
</script>

<style scoped>
.context-menu {
  min-width: 100px;
  z-index: 999999 !important;
  position: fixed !important;
  display: block !important;
}

</style>
