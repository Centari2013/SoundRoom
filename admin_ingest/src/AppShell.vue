<!--
  Tab shell. Wraps the existing AdminIngest (untouched) and the new
  Library Dashboard + Orphan Check pages. Active tab persists in
  localStorage so reloads land on the same page.
-->
<script setup>
import { onMounted, ref, watch } from 'vue'
import AdminIngest from './AdminIngest.vue'
import SoundDashboard from './SoundDashboard.vue'
import OrphanCheck from './OrphanCheck.vue'

const TAB_STORAGE_KEY = 'soundroom_admin_active_tab_v1'
const TABS = [
  { id: 'ingest', label: 'Ingest' },
  { id: 'dashboard', label: 'Library' },
  { id: 'orphans', label: 'Orphans' },
]
const activeTab = ref('ingest')

onMounted(() => {
  try {
    const saved = localStorage.getItem(TAB_STORAGE_KEY)
    if (saved && TABS.some((t) => t.id === saved)) {
      activeTab.value = saved
    }
  } catch (err) {
    console.warn('[admin] could not read tab from localStorage', err)
  }
})

watch(activeTab, (val) => {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, val)
  } catch (err) {
    console.warn('[admin] could not persist tab', err)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-gray-100">
    <nav class="border-b border-gray-800 bg-gray-900/70 backdrop-blur sticky top-0 z-30">
      <div class="max-w-6xl mx-auto px-6 py-3 flex items-center gap-1">
        <span class="text-sm font-semibold mr-4 text-gray-400">SoundRoom Admin</span>
        <button
          v-for="tab in TABS"
          :key="tab.id"
          type="button"
          class="px-3 py-1.5 rounded-md text-sm transition"
          :class="
            activeTab === tab.id
              ? 'bg-emerald-500 text-black font-semibold'
              : 'text-gray-300 hover:bg-gray-800'
          "
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
    </nav>

    <!-- Keep AdminIngest mounted so its drafts, current index, and
         audio preview state don't reset every time the curator
         switches tabs. The other two pages are cheap enough to remount. -->
    <div :class="{ hidden: activeTab !== 'ingest' }">
      <AdminIngest />
    </div>

    <div v-if="activeTab === 'dashboard'" class="max-w-6xl mx-auto py-10 px-6">
      <SoundDashboard />
    </div>

    <div v-if="activeTab === 'orphans'" class="max-w-6xl mx-auto py-10 px-6">
      <OrphanCheck />
    </div>
  </div>
</template>
