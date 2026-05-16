<!--
  Mass-delete confirmation modal.

  Used only for orphan cleanup — each item is verified independently
  by the server, but the bulk button needs a distinct deliberate gate
  so it can't be muscle-memory'd. Three phases:

    1. confirm: user must type `expectedConfirmation` (e.g.
       "delete 12 files"). Cancel button leaves no side effects.
    2. running: parent component is looping over items. Modal shows
       a progress bar + counts + a Cancel button (sets cancelRequested).
    3. done: modal shows summary "Deleted X / N, Y errors" and an
       expandable list of any per-item errors.

  Parent contract:
    - emits 'close' to dismiss (only honored when not running)
    - emits 'confirm' to start the run
    - emits 'cancel' to request stop mid-run
    - parent passes phase, progress, errors back via props
-->
<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  // The user has to type this string exactly to enable Start.
  expectedConfirmation: { type: String, required: true },
  // Lifecycle phase the parent reports back: 'confirm' | 'running' | 'done'
  phase: { type: String, default: 'confirm' },
  // Live progress numbers while running.
  total: { type: Number, default: 0 },
  completed: { type: Number, default: 0 },
  errors: { type: Array, default: () => [] }, // [{ id, message }]
  startLabel: { type: String, default: 'Delete all' },
})

const emit = defineEmits(['close', 'confirm', 'cancel'])

const typed = ref('')
const errorsExpanded = ref(false)

watch(
  () => props.expectedConfirmation,
  () => {
    typed.value = ''
  }
)

const matches = computed(() => typed.value === props.expectedConfirmation)

const percent = computed(() => {
  if (!props.total) return 0
  return Math.round((props.completed / props.total) * 100)
})

const successCount = computed(() => Math.max(0, props.completed - props.errors.length))

function close() {
  if (props.phase === 'running') return
  emit('close')
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    @click.self="close"
  >
    <div class="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl space-y-4">
      <header>
        <h3 class="text-lg font-semibold text-gray-100">{{ title }}</h3>
      </header>

      <!-- Phase 1: confirm -->
      <template v-if="phase === 'confirm'">
        <p class="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
          {{ description }}
        </p>
        <div class="rounded-md border border-red-500/30 bg-red-500/5 p-3 space-y-2">
          <p class="text-xs text-gray-300">
            To confirm, type
            <code class="px-1.5 py-0.5 rounded bg-gray-800 text-red-300 text-[12px] font-mono">{{ expectedConfirmation }}</code>
            below.
          </p>
          <input
            v-model="typed"
            type="text"
            autofocus
            class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 font-mono focus:(outline-none ring-2 ring-red-500/50)"
            placeholder="Type to confirm"
          />
        </div>
        <footer class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-sm text-gray-200 hover:bg-gray-700"
            @click="close"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-md bg-red-500 text-black text-sm font-semibold hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!matches"
            @click="emit('confirm')"
          >
            {{ startLabel }}
          </button>
        </footer>
      </template>

      <!-- Phase 2: running -->
      <template v-else-if="phase === 'running'">
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm text-gray-300">
            <span>Deleting…</span>
            <span class="font-mono">{{ completed }} / {{ total }}</span>
          </div>
          <div class="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
            <div
              class="h-full bg-red-500 transition-all"
              :style="{ width: `${percent}%` }"
            ></div>
          </div>
          <p v-if="errors.length" class="text-xs text-amber-300">
            {{ errors.length }} error{{ errors.length === 1 ? '' : 's' }} so far — full details when done.
          </p>
        </div>

        <footer class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-sm text-gray-200 hover:bg-gray-700"
            @click="emit('cancel')"
          >
            Stop after current
          </button>
        </footer>
      </template>

      <!-- Phase 3: done -->
      <template v-else>
        <div class="space-y-3">
          <p class="text-sm text-gray-200">
            Done.
            <span class="font-semibold text-emerald-300">{{ successCount }}</span>
            of <span class="font-mono">{{ total }}</span> deleted successfully.
            <span v-if="errors.length" class="text-red-300">
              {{ errors.length }} failed.
            </span>
          </p>

          <div v-if="errors.length" class="rounded-md border border-red-500/30 bg-red-500/5">
            <button
              type="button"
              class="w-full text-left px-3 py-2 text-xs text-red-200 hover:bg-red-500/10"
              @click="errorsExpanded = !errorsExpanded"
            >
              {{ errorsExpanded ? '▾' : '▸' }} Show errors ({{ errors.length }})
            </button>
            <ul v-if="errorsExpanded" class="px-3 pb-2 space-y-1 max-h-48 overflow-y-auto">
              <li
                v-for="(err, idx) in errors"
                :key="idx"
                class="text-[11px] font-mono text-red-200/90 border-t border-red-500/20 pt-1 first:border-t-0 first:pt-0"
              >
                <span class="text-red-100">{{ err.id }}</span>:
                <span class="text-red-200/80">{{ err.message }}</span>
              </li>
            </ul>
          </div>
        </div>

        <footer class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400"
            @click="emit('close')"
          >
            Close
          </button>
        </footer>
      </template>
    </div>
  </div>
</template>
