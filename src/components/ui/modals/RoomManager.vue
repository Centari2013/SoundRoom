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
          class="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-300 dark:border-neutral-800"
        >
          <h2 class="text-2xl font-bold">RoomManager</h2>
          <BaseButton class="text-sm" @click="router.push('/')">Close</BaseButton>
        </div>
        
        <!-- Scrollable Grid -->
        <div
          ref="gridScroll"
          class="mt-5 place-content-start p-6 pt-20 overflow-y-auto h-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
         <template v-if="rooms.length > 0">
          <div
            v-for="room in paginatedItems"
            :key="room.id"
            class="room-row p-4 border border-neutral-700 rounded-lg shadow-sm hover:bg-neutral-800 transition"
          >
            <div class="room-name font-medium truncate">{{ room.name || 'Untitled Room' }}</div>
            <div class="room-meta text-xs text-neutral-400">{{ formatDate(room.updated_at) }}</div>
            <div class="room-actions mt-3 flex gap-2">
              <BaseButton @click="loadRoom(room)">Load</BaseButton>
              <BaseButton @click="deleteRoom(room)">Delete</BaseButton>
            </div>
          </div>
          

        </template>

        <template v-else>
          <div class="col-span-full text-center text-neutral-400 mt-32">
            <div class="text-xl font-semibold mb-2">No rooms yet</div>
            <div class="mb-4">Create your first ambient scene and it’ll show up here.</div>
            <BaseButton @click="createNewRoom">+ Create New Room</BaseButton>
          </div>
        </template>

        </div>
        <!-- Bottom Panel -->
      <div
        v-if="true"
        class="absolute flex bottom-0 left-0 right-0 p-4 bg-white dark:bg-neutral-950 border-t border-neutral-300 dark:border-neutral-800"
      >
        <div class="flex justify-start items-center w-1/4">
          <label class="text-sm cursor-pointer">
            Upload your own sound
            <input
              type="file"
              accept="audio/*"
              class="hidden"
              @change="handleUpload"
            />
          </label>
        </div>
        <div class="flex items-center justify-center w-1/2  space-x-3">
          <BaseButton
            class="px-3 py-1"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            ← Prev
          </BaseButton>
          <span>Page {{ currentPage }} of {{ totalPages }}</span>
          <BaseButton
            class="px-3 py-1"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            Next →
          </BaseButton>
        </div>
        <span class="w-1/4"></span>
      </div>
      </div>

      
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { supabase } from '@/utils/supabase'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import { useAuth } from '@/composables/useAuth'
import { formatDate } from '@/utils/dateUtils'
import { useRouter } from 'vue-router'

const router = useRouter()
const buttons = ref([
  { label: 'Your Rooms', action: () => {} },
])

const activeButton = ref(buttons.value[0].label)
const gridScroll = ref(null)
const currentPage = ref(1)
const itemsPerPage = 12 // or 8, 16 depending on grid size

// Temporary example: replace with fetched rooms
const rooms = ref(
  Array.from({ length: 28 }, (_, i) => ({
    id: i + 1,
    name: `Ambient Scene ${i + 1}`,
    updated_at: new Date(Date.now() - i * 1000 * 60 * 60 * 5).toISOString(), // every 5 hrs older
  }))
)


const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
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


onMounted(async () => {
  const { user } = useAuth()
  // Fetch rooms from Supabase
  const { data, error } = await supabase
    .from('rooms')
    .select('id, name, updated_at')
    .eq('owner_id', user.value.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching rooms:', error)
  } else {
    //rooms.value = data
  }
})

const createNewRoom = () => {
}

</script>

<style scoped>
.marquee-text-text {
  margin-left: 20px;
}

@media (prefers-color-scheme: light) {
  .load-button {
    background-color: #ffffff;
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
  background-color: #e5e5e5; /* neutral-200 */
}

@media (prefers-color-scheme: dark) {
  .sound-manager-button:hover {
    background-color: #1f2937; /* neutral-800 */
  }
}

/* Active/selected state */
.sound-manager-button.active {
  font-weight: 600;
  background-color: #d4d4d4; /* neutral-200 */
}

@media (prefers-color-scheme: dark) {
  .sound-manager-button.active {
    background-color: #1f2937; /* neutral-800 */
  }
}
</style>