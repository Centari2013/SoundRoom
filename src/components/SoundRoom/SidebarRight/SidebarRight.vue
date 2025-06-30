<template>
  <aside
    class="flex flex-col h-full bg-neutral-100 dark:bg-neutral-900 border-l border-neutral-300 dark:border-neutral-800 p-4 space-y-4"
    role="region"
    aria-labelledby="selected-sound-panel-label"
  >
    <h2 id="selected-sound-panel-label" class="sr-only">
      Selected Sound Settings Panel
    </h2>

    <SelectedSourcePanel v-bind="{ selectedSource }" />

    <div class="mt-auto">
      <RouterLink
        to="/room-manager"
        class="w-full mb-2"
        aria-label="Open Room Manager"
      >
        <BaseButton class="w-full">
          RoomManager
        </BaseButton>
      </RouterLink>
    </div>
    
  </aside>
</template>


<script setup>
import { ref } from 'vue'

import SelectedSourcePanel from '@/components/SoundRoom/SidebarRight/SelectedSourcePanel.vue'
import BaseButton from '@/components/ui/input/BaseButton.vue';
defineProps(['selectedSource'])

const openRoomManager = ref(false)

</script>