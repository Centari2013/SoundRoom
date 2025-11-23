<template>
  <div
    @click.self="router.push('/')"
    class="modal-backdrop"
  >
    <div
      class="modal-panel flex"
    >
      <!-- Left Sidebar -->
      <aside 
        class="w-60 bg-neutral-200 dark:bg-neutral-900 border-r border-neutral-300 dark:border-neutral-800 p-4 space-y-3 overflow-y-auto"
      >
        <h2 class="font-bold text-sm mb-2"></h2>
        <BaseButton
          v-for="b in buttons"
          :key="b.label"
          @click="activeButton = b.label"
          :class="['sound-manager-button', { active: activeButton === b.label }]"
        >
          {{ b.label }}
        </BaseButton>
      </aside>

      <!-- Main Content -->
      <div class="flex-1 relative overflow-hidden">
        <!-- Floating Top Bar -->
        <div
          ref="headerBar"
          class="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-300 dark:border-neutral-800"
        >
          <h2 class="text-2xl font-bold">RoomManager</h2>
          <BaseButton class="text-sm" @click="router.push('/')">Close</BaseButton>
        </div>
        
        <!-- Scrollable Grid -->
        <div
          ref="gridScroll"
          class="relative mt-5 place-content-start p-6 pt-20 overflow-y-auto h-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
        <div v-if="loading" class="absolute top-0 left-0 bottom-0 right-0 mt-15 mb-25">
          <LoadingDiv text="Getting your Rooms..." :duration="1000" @done="loading = false"/>
        </div>
        
        <template v-if="rooms.length > 0 && !loading">
          <RoomCard
            v-for="room in paginatedItems"
            :key="room.id"
            :room="room"
            @load="handleLoadRoom(room.id)"
            @delete="handleDeleteRoom(room.id)"
            @update-name="name => handleUpdateRoomName(room, name)"
          />
        </template>

        <template v-else-if="!loading && rooms.length === 0">
          <div class="col-span-full text-center text-neutral-400 mt-32">
            <div class="text-xl font-semibold mb-2">No rooms yet</div>
            <div class="mb-4">Create your first ambient scene and it’ll show up here.</div>
            <BaseButton @click="createNewRoom">+ Create New Room</BaseButton>
          </div>
        </template>

        </div>
        <!-- Bottom Panel -->
      <PaginationControls
        :loading="loading"
        :currentPage="currentPage"
        :totalPages="totalPages"
        @prev="currentPage--"
        @next="currentPage++"
      />
      </div>
      <!-- Yes/No Modal -->
      <YesNoModal
        v-if="deleteRoomModalVisible"
        :yesFunction="doDeleteRoom"
        :noFunction="() => deleteRoomModalVisible = false"
        message="Are you sure you want to delete this room?"
        title="Delete Room"
        @close="deleteRoomModalVisible = false"
      />
      <YesNoModal
        v-if="saveRoomCheck"
        :yesFunction="doSaveRoom"
        :noFunction="doLoadRoom"
        message="Would you like to save the current room?"
        title="Save Room"
      />
      <PulsingOverlay
        v-if="isLoadingRoom || isSavingRoom"
        :text="isLoadingRoom ? 'Loading your room...' : 'Saving your room...'"
      />

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { supabase } from '@/utils/supabase'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import LoadingDiv from '@/components/ui/loading/LoadingDiv.vue'
import YesNoModal from '@/components/ui/modals/YesNoModal.vue'
import RoomCard from '@/components/ui/modals/RoomManager/RoomCard.vue'
import PaginationControls from '@/components/ui/modals/RoomManager/PaginationControls.vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'
import { useSaveAndLoadRoom } from '@/composables/useSaveAndLoadRoom'
import { useRoomStore } from '@/stores/useRoomStore'
import PulsingOverlay from '@/components/ui/overlays/PulsingOverlay.vue'
import { resetRoomState } from '@/utils/resetRoomState'

const router = useRouter()
const buttons = ref([
  { label: 'Your Rooms', action: () => {} },
])

const roomStore = useRoomStore()
const headerBar = ref(null)
const activeButton = ref(buttons.value[0].label)
const gridScroll = ref(null)
const currentPage = ref(0)
const itemsPerPage = 12 // or 8, 16 depending on grid size

const { loadRoom, deleteRoom, saveRoom, isSavingRoom, isLoadingRoom, updateRoomName } = useSaveAndLoadRoom()

const deleteRoomModalVisible = ref(false)
const saveRoomCheck = ref(false)
const rooms = ref([])
const loading = ref(true)
let roomId = null
const paginatedItems = computed(() => {
  const start = (currentPage.value) * itemsPerPage
  return rooms.value.slice(start, start + itemsPerPage)
})

const totalPages = computed(() =>
  Math.ceil(rooms.value.length / itemsPerPage)
)

watch(currentPage, () => {
  nextTick(() => {
    gridScroll.value?.scrollTo({ top: 0, behavior: 'smooth' })
  })
})

const handleUpdateRoomName = async (room, newName) => {
  const success = await updateRoomName(room.id, newName)
  if (success) {
    room.name = newName
    roomStore.commitRoomName(room.id, newName)
  } else {
    console.error('Failed to update room name')
  }
}

const handleLoadRoom = async (rId) => {
  roomId = rId
  if (!roomStore.isRoomSaveable) {
    
    doLoadRoom(roomId)
    return
  }
  saveRoomCheck.value = true
}

const doLoadRoom = async () => {
  saveRoomCheck.value = false
  const success = await loadRoom(roomId)
  if (success) {
    router.push('/')
  } else {
    console.error('Failed to load room')
  }
}

const doSaveRoom = async () => {
  saveRoomCheck.value = false
  const success = await saveRoom()
  if (success) {
    // Optionally, you can show a success message or update the UI
    
  } else {
    console.error('Failed to save room')
  }
  await doLoadRoom(roomId)
}

const handleDeleteRoom = async (rId) => {
  roomId = rId
  deleteRoomModalVisible.value = true
}

const doDeleteRoom = async () => {
  deleteRoomModalVisible.value = false
  const success = await deleteRoom(roomId)
  if (success) {
    rooms.value = rooms.value.filter(r => r.id !== roomId)
  }
}


onMounted(async () => {
  const { user } = useAuth()
  // Fetch rooms from Supabase
  const { data, error } = await supabase
    .from('rooms')
    .select('id, name, updated_at, thumbnail')
    .eq('owner_id', user.value.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching rooms:', error)
  } else {
    rooms.value = data
  }
})

const createNewRoom = () => {
  resetRoomState()
  router.push('/')
}

</script>

<style scoped>
.marquee-text-text {
  margin-left: 20px;
}

@media (prefers-color-scheme: light) {
  .load-button {
    background-color: var(--sr-white);
  }
}

/* Base button styling */
.sound-manager-button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem; /* text-sm */
  border-radius: 0.375rem; /* rounded */
  transition: background-color 0.2s;
}

/* Hover state */
.sound-manager-button:hover {
  background-color: var(--sr-neutral-200);
}

@media (prefers-color-scheme: dark) {
  .sound-manager-button:hover {
    background-color: var(--sr-outline-strong);
  }
}

/* Active/selected state */
.sound-manager-button.active {
  font-weight: 600;
  background-color: var(--sr-neutral-300);
}

@media (prefers-color-scheme: dark) {
  .sound-manager-button.active {
    background-color: var(--sr-outline-strong);
  }
}
</style>