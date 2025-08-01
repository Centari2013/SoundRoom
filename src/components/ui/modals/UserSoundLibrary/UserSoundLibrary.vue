<template>
  <div @click.self="router.push('/')" class="modal-backdrop">
    <div class="modal-panel flex">
      <div class="flex-1 relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-300 dark:border-neutral-800">
          <h2 class="text-2xl font-bold">Your Sounds</h2>
          <BaseButton class="text-sm" @click="router.push('/')">Close</BaseButton>
        </div>
        <div ref="gridScroll" class="mt-5 place-content-start p-6 pt-20 overflow-y-auto h-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <UserSoundGridItem
            v-for="sound in sounds"
            :key="sound.id"
            :sound="sound"
            :currentlyPlayingId="currentlyPlayingId"
            @delete="handleDelete(sound)"
            @updateCurrent="currentlyPlayingId = $event"
          />
          <template v-if="!loading && sounds.length === 0">
            <div class="col-span-full text-center text-neutral-400 mt-32">
              <div class="text-xl font-semibold mb-2">No sounds uploaded</div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import { useAuth } from '@/composables/useAuth'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import UserSoundGridItem from './UserSoundGridItem.vue'

const router = useRouter()
const { user } = useAuth()

const sounds = ref([])
const loading = ref(true)
const currentlyPlayingId = ref(null)

onMounted(async () => {
  if (!user.value) return
  const { data, error } = await supabase
    .from('sound_files')
    .select()
    .eq('owner_id', user.value.id)

  if (!error) {
    sounds.value = data.map(({ id, ...rest }) => ({ id, libraryId: id, ...rest }))
  } else {
    console.error('Failed to list user sounds:', error)
  }
  loading.value = false
})

async function handleDelete(sound) {
  const { error } = await supabase.from('sound_files').delete().eq('id', sound.id)
  if (error) {
    console.error('Failed to remove record:', error)
    return
  }
  await fetch(`/api/delete-file?bucket=${sound.bucket}&path=${encodeURIComponent(sound.path)}`, { method: 'DELETE' })
  sounds.value = sounds.value.filter(s => s.id !== sound.id)
}
</script>
