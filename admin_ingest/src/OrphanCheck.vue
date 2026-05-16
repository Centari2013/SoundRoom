<!--
  Orphan check — compares R2 keys vs sound_files rows and surfaces:
    A) R2 files with no DB row (true orphans, safe to delete)
    B) DB rows whose path doesn't exist in R2 (broken rows — may have
       been deleted out of band; the curator decides if the row goes too)

  Safety:
    - Nothing here runs until the user clicks "Scan".
    - Per-item deletion only. No bulk button.
    - Each deletion uses the type-to-confirm modal AND the server
      double-checks that the R2 key has no matching sound_files row
      before issuing the R2 DELETE.
    - Category B deletions go through the standard admin-delete-sound
      flow (R2 + DB), gated by the same name-confirmation.
-->
<script setup>
import { computed, ref } from 'vue'
import { supabase } from './utils/supabaseClient'
import { listR2Keys, deleteR2Orphan, deleteSound } from './utils/adminApi'
import ConfirmDeleteModal from './ConfirmDeleteModal.vue'
import MassDeleteModal from './MassDeleteModal.vue'

const loading = ref(false)
const error = ref(null)
const lastScanAt = ref(null)

const r2Keys = ref([]) // [{ key, size }] in main bucket
const previewKeys = ref([]) // [{ key, size }] in preview bucket
const dbRows = ref([]) // [{ id, name, path }]
const previewBucketAvailable = ref(true)

const r2OnlyExpanded = ref(true)
const dbOnlyExpanded = ref(true)
const previewOnlyExpanded = ref(true)

// ── Eventual-consistency shield ─────────────────────────────────────
// R2's LIST API is eventually consistent. A key we just DELETE'd can
// still appear in a subsequent LIST for up to a few minutes, even
// though a follow-up HEAD on it returns 404. To avoid the "they keep
// coming back" confusion, we remember keys we've successfully deleted
// in this session and filter them out of the orphan lists until R2's
// listing catches up. Entries auto-expire after RECENT_DELETE_TTL_MS.
const RECENT_DELETE_TTL_MS = 5 * 60 * 1000 // 5 minutes — generous buffer
// shape: Map<key, { deletedAt: number, scope: 'main' | 'preview' }>
const recentlyDeleted = ref(new Map())

function markRecentlyDeleted(key, scope) {
  // Vue reacts on Map identity changes — recreate so computeds re-run.
  const next = new Map(recentlyDeleted.value)
  next.set(key, { deletedAt: Date.now(), scope })
  recentlyDeleted.value = next
}

function pruneRecentlyDeleted() {
  const cutoff = Date.now() - RECENT_DELETE_TTL_MS
  let changed = false
  const next = new Map(recentlyDeleted.value)
  for (const [k, v] of next) {
    if (v.deletedAt < cutoff) {
      next.delete(k)
      changed = true
    }
  }
  if (changed) recentlyDeleted.value = next
}

// Pending delete state — `kind` selects between orphan-R2 and dangling-row.
const pendingDelete = ref(null) // { kind, item, ... }
const deleteError = ref(null)
const deleting = ref(false)

const toast = ref(null)

function showToast(message, variant = 'success') {
  toast.value = { id: Date.now(), message, variant }
  setTimeout(() => {
    toast.value = null
  }, 4500)
}

async function scan() {
  loading.value = true
  error.value = null
  pruneRecentlyDeleted() // drop stale shield entries before each scan
  try {
    // Run all three in parallel. The preview bucket is allowed to fail
    // independently (some deployments may not have it configured); the
    // main bucket + DB scan are required.
    const [r2Result, dbResult, previewResult] = await Promise.all([
      listR2Keys({ bucket: 'main' }),
      supabase.from('sound_files').select('id, name, path'),
      listR2Keys({ bucket: 'preview' }).catch((err) => {
        console.warn('[orphan] preview-bucket scan unavailable', err)
        previewBucketAvailable.value = false
        return null
      }),
    ])

    if (dbResult.error) throw dbResult.error

    r2Keys.value = r2Result.keys ?? []
    dbRows.value = dbResult.data ?? []
    previewKeys.value = previewResult?.keys ?? []
    previewBucketAvailable.value = previewResult !== null
    lastScanAt.value = new Date()
  } catch (err) {
    console.error('[orphan] scan failed', err)
    error.value = err.message || 'Scan failed.'
  } finally {
    loading.value = false
  }
}

// ── Diff sets ───────────────────────────────────────────────────────
// All orphan computeds pass through `excludeRecentlyDeleted` so a
// just-DELETE'd key doesn't reappear due to R2 LIST eventual
// consistency.
function excludeRecentlyDeleted(items, scope) {
  const map = recentlyDeleted.value
  return items.filter((item) => {
    const entry = map.get(item.key)
    return !entry || entry.scope !== scope
  })
}

// R2 keys (main bucket) with no matching sound_files row.
const r2OnlyKeys = computed(() => {
  const dbPaths = new Set(dbRows.value.map((r) => r.path))
  const raw = r2Keys.value.filter((k) => !dbPaths.has(k.key))
  return excludeRecentlyDeleted(raw, 'main')
})

// DB rows pointing to a path not present in the main R2 bucket.
const dbOnlyRows = computed(() => {
  const r2Set = new Set(r2Keys.value.map((k) => k.key))
  return dbRows.value.filter((r) => !r2Set.has(r.path))
})

// Preview-bucket keys whose embedded soundId doesn't match any live
// sound_files row. Pattern: previews/<uuid>-preview.mp3
const PREVIEW_KEY_RE = /^previews\/([0-9a-fA-F-]+)-preview\.mp3$/
const previewOrphanKeys = computed(() => {
  const liveIds = new Set(dbRows.value.map((r) => r.id))
  const raw = previewKeys.value
    .map((item) => {
      const match = PREVIEW_KEY_RE.exec(item.key)
      return match ? { ...item, soundId: match[1] } : { ...item, soundId: null }
    })
    .filter((item) => {
      // Anything that doesn't match the predictable pattern, OR whose
      // soundId isn't in the live DB, counts as a preview orphan.
      return !item.soundId || !liveIds.has(item.soundId)
    })
  return excludeRecentlyDeleted(raw, 'preview')
})

// Number of items currently being hidden by the eventual-consistency
// shield. Surfaced as a small notice so the user understands why
// their re-scan returned fewer items than expected.
const shieldedCount = computed(() => recentlyDeleted.value.size)

const hasRun = computed(() => lastScanAt.value !== null)
const cleanState = computed(
  () =>
    hasRun.value &&
    r2OnlyKeys.value.length === 0 &&
    dbOnlyRows.value.length === 0 &&
    previewOrphanKeys.value.length === 0
)

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let i = 0
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(1)} ${units[i]}`
}

// ── Delete flows ────────────────────────────────────────────────────
function startOrphanDelete(item) {
  pendingDelete.value = {
    kind: 'r2-orphan',
    bucket: 'main',
    item,
    title: `Delete orphaned R2 file`,
    description:
      `This will permanently remove the R2 object "${item.key}" from the main bucket. ` +
      `No sound_files row references it, so nothing else should break. ` +
      `There is no undo and there are no backups.`,
    expectedConfirmation: item.key,
  }
  deleteError.value = null
}

function startPreviewOrphanDelete(item) {
  pendingDelete.value = {
    kind: 'r2-orphan',
    bucket: 'preview',
    item,
    title: `Delete orphaned preview`,
    description:
      `This will permanently remove the preview file "${item.key}" from the previews bucket. ` +
      (item.soundId
        ? `Its embedded sound id (${item.soundId}) does not match any live sound_files row, so nothing in the app should reference it.`
        : `Its filename doesn't follow the standard previews/<uuid>-preview.mp3 pattern.`) +
      `\n\nThere is no undo.`,
    expectedConfirmation: item.key,
  }
  deleteError.value = null
}

function startDanglingRowDelete(row) {
  pendingDelete.value = {
    kind: 'dangling-row',
    item: row,
    title: `Delete dangling row "${row.name}"`,
    description:
      `This will delete the sound_files row "${row.name}" (id ${row.id}). ` +
      `The R2 object at "${row.path}" does not exist (already missing), so ` +
      `the R2 DELETE will be a no-op. There is no undo.`,
    expectedConfirmation: row.name,
  }
  deleteError.value = null
}

function cancelDelete() {
  pendingDelete.value = null
  deleteError.value = null
}

// ── Mass delete (orphans only) ──────────────────────────────────────
// Loops over the existing per-item endpoint sequentially. The server
// re-verifies orphan status on every request — if a row references a
// key in the middle of the run, that single delete is rejected and we
// move on. Nothing about the per-item safety changes.
const massState = ref(null)
// shape: { kind, items, phase, completed, errors[], cancelRequested, title, description, expectedConfirmation }

function startMassDelete({ kind, items, label }) {
  if (!items.length) return
  const count = items.length
  const expected = `delete ${count} ${label}`
  massState.value = {
    kind, // 'r2-main' | 'r2-preview' | 'dangling-row'
    items: [...items], // snapshot — scan results may mutate, we want a stable list
    phase: 'confirm',
    total: count,
    completed: 0,
    errors: [],
    cancelRequested: false,
    title: `Delete ${count} ${label}`,
    description:
      `This will delete ${count} ${label} one at a time. ` +
      `Each delete is independently re-checked on the server — if a file became referenced ` +
      `between scan and click, that single delete is rejected and the rest continue.\n\n` +
      `There is no undo.`,
    expectedConfirmation: expected,
    startLabel: `Delete ${count} ${label}`,
  }
}

function startMassMainOrphans() {
  startMassDelete({
    kind: 'r2-main',
    items: r2OnlyKeys.value,
    label: r2OnlyKeys.value.length === 1 ? 'file' : 'files',
  })
}

function startMassPreviewOrphans() {
  startMassDelete({
    kind: 'r2-preview',
    items: previewOrphanKeys.value,
    label: previewOrphanKeys.value.length === 1 ? 'preview' : 'previews',
  })
}

function startMassDanglingRows() {
  startMassDelete({
    kind: 'dangling-row',
    items: dbOnlyRows.value,
    label: dbOnlyRows.value.length === 1 ? 'row' : 'rows',
  })
}

function cancelMassDelete() {
  if (!massState.value) return
  if (massState.value.phase === 'running') {
    // Mid-run: tell the loop to stop after the current iteration. The
    // loop will transition to 'done' when it exits cleanly.
    massState.value.cancelRequested = true
    return
  }
  massState.value = null
}

async function runMassDelete() {
  const ms = massState.value
  if (!ms || ms.phase !== 'confirm') return
  ms.phase = 'running'
  ms.completed = 0
  ms.errors = []
  ms.cancelRequested = false

  for (const item of ms.items) {
    if (ms.cancelRequested) break

    try {
      if (ms.kind === 'r2-main') {
        await deleteR2Orphan({
          key: item.key,
          confirmKey: item.key,
          bucket: 'main',
        })
        markRecentlyDeleted(item.key, 'main')
        r2Keys.value = r2Keys.value.filter((k) => k.key !== item.key)
      } else if (ms.kind === 'r2-preview') {
        await deleteR2Orphan({
          key: item.key,
          confirmKey: item.key,
          bucket: 'preview',
        })
        markRecentlyDeleted(item.key, 'preview')
        previewKeys.value = previewKeys.value.filter((k) => k.key !== item.key)
      } else if (ms.kind === 'dangling-row') {
        await deleteSound({ id: item.id, confirmName: item.name })
        dbRows.value = dbRows.value.filter((r) => r.id !== item.id)
      }
    } catch (err) {
      console.error('[orphan] mass-delete item failed', { kind: ms.kind, item, err })
      ms.errors.push({
        id: item.key ?? item.id ?? '(unknown)',
        message: err?.message || 'Failed',
      })
    } finally {
      ms.completed += 1
    }
  }

  ms.phase = 'done'

  const summary =
    ms.errors.length === 0
      ? `Deleted ${ms.completed} item${ms.completed === 1 ? '' : 's'}.`
      : `Deleted ${ms.completed - ms.errors.length} item(s), ${ms.errors.length} failed.`
  showToast(summary, ms.errors.length ? 'error' : 'success')
}

async function confirmPendingDelete() {
  if (!pendingDelete.value || deleting.value) return
  deleting.value = true
  deleteError.value = null
  const pending = pendingDelete.value

  try {
    if (pending.kind === 'r2-orphan') {
      const result = await deleteR2Orphan({
        key: pending.item.key,
        confirmKey: pending.item.key,
        bucket: pending.bucket ?? 'main',
      })
      const diag = result?.diag
      // Sanity log so the user can see what R2 actually returned.
      if (diag) {
        console.info('[orphan-delete] R2 diag', diag)
      }
      const scope = (pending.bucket ?? 'main') === 'preview' ? 'preview' : 'main'
      markRecentlyDeleted(pending.item.key, scope)
      if (scope === 'preview') {
        previewKeys.value = previewKeys.value.filter((k) => k.key !== pending.item.key)
        showToast(
          diag
            ? `Deleted preview (R2 ${diag.r2DeleteStatus}, HEAD ${diag.postDeleteHeadStatus}): ${pending.item.key}`
            : `Deleted orphaned preview: ${pending.item.key}`
        )
      } else {
        r2Keys.value = r2Keys.value.filter((k) => k.key !== pending.item.key)
        showToast(
          diag
            ? `Deleted file (R2 ${diag.r2DeleteStatus}, HEAD ${diag.postDeleteHeadStatus}): ${pending.item.key}`
            : `Deleted orphaned R2 file: ${pending.item.key}`
        )
      }
    } else if (pending.kind === 'dangling-row') {
      await deleteSound({
        id: pending.item.id,
        confirmName: pending.item.name,
      })
      dbRows.value = dbRows.value.filter((r) => r.id !== pending.item.id)
      showToast(`Deleted dangling row: ${pending.item.name}`)
    }
    cancelDelete()
  } catch (err) {
    console.error('[orphan] delete failed', err)
    deleteError.value = err.message || 'Delete failed.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="space-y-2">
      <h2 class="text-2xl font-semibold">Orphan Check</h2>
      <p class="text-sm text-gray-400 max-w-2xl leading-relaxed">
        Compares every object in your R2 bucket against the
        <code class="text-gray-300">sound_files</code> table. Nothing deletes automatically — each
        orphan must be confirmed individually by typing its key or name.
      </p>
    </header>

    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold hover:bg-emerald-400 disabled:opacity-40"
        :disabled="loading"
        @click="scan"
      >
        {{ loading ? 'Scanning…' : hasRun ? 'Re-scan' : 'Scan for orphans' }}
      </button>
      <p v-if="lastScanAt" class="text-xs text-gray-500">
        Last scan: {{ lastScanAt.toLocaleTimeString() }} · {{ r2Keys.length }} R2 keys · {{ dbRows.length }} DB rows
      </p>
    </div>

    <p v-if="error" class="text-sm text-red-300">{{ error }}</p>

    <p
      v-if="shieldedCount > 0"
      class="text-xs text-gray-400 italic"
      title="R2's LIST endpoint is eventually consistent — keys we just DELETE'd can still appear in a fresh scan for a few minutes. They're hidden here so the list reflects reality."
    >
      🛡 {{ shieldedCount }} recently-deleted key{{ shieldedCount === 1 ? '' : 's' }} hidden — R2 LIST is eventually consistent and may still report them for ~5 min.
    </p>

    <p v-if="hasRun && cleanState" class="text-sm text-emerald-300">
      ✓ Clean. Every R2 file has a matching DB row and every DB row points to a real R2 file.
    </p>

    <!-- A) R2 files with no DB row -->
    <section
      v-if="hasRun && r2OnlyKeys.length"
      class="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 space-y-3"
    >
      <header class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-red-200">
            R2 files with no DB row ({{ r2OnlyKeys.length }})
          </h3>
          <p class="text-xs text-gray-400 mt-1">
            These cloud files are not referenced by any sound_files row. Safe candidates for cleanup.
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <button
            type="button"
            class="px-3 py-1.5 text-xs rounded bg-red-500/15 border border-red-500/50 text-red-200 hover:bg-red-500/25"
            @click="startMassMainOrphans"
          >
            Delete all ({{ r2OnlyKeys.length }})
          </button>
          <button
            type="button"
            class="text-xs text-gray-400 hover:text-gray-200 underline"
            @click="r2OnlyExpanded = !r2OnlyExpanded"
          >
            {{ r2OnlyExpanded ? 'Collapse' : 'Expand' }}
          </button>
        </div>
      </header>

      <div v-if="r2OnlyExpanded" class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-gray-400 border-b border-gray-800">
              <th class="text-left py-2 pr-3 font-medium">R2 key</th>
              <th class="text-right py-2 pr-3 font-medium">Size</th>
              <th class="text-right py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800/60">
            <tr v-for="item in r2OnlyKeys" :key="item.key" class="hover:bg-gray-800/30">
              <td class="py-2 pr-3 font-mono text-xs">{{ item.key }}</td>
              <td class="py-2 pr-3 text-right text-gray-400">{{ formatBytes(item.size) }}</td>
              <td class="py-2 text-right">
                <button
                  type="button"
                  class="px-2 py-1 text-xs rounded bg-red-500/10 border border-red-500/40 text-red-300 hover:bg-red-500/20"
                  @click="startOrphanDelete(item)"
                >
                  Delete from R2
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- B) DB rows pointing to missing R2 files -->
    <section
      v-if="hasRun && dbOnlyRows.length"
      class="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-3"
    >
      <header class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-amber-200">
            DB rows with no R2 file ({{ dbOnlyRows.length }})
          </h3>
          <p class="text-xs text-gray-400 mt-1">
            These sound_files rows point at R2 keys that don't exist. The audio is gone but the catalog still references it — the app will fail to play these.
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <button
            type="button"
            class="px-3 py-1.5 text-xs rounded bg-amber-500/15 border border-amber-500/50 text-amber-200 hover:bg-amber-500/25"
            @click="startMassDanglingRows"
          >
            Delete all ({{ dbOnlyRows.length }})
          </button>
          <button
            type="button"
            class="text-xs text-gray-400 hover:text-gray-200 underline"
            @click="dbOnlyExpanded = !dbOnlyExpanded"
          >
            {{ dbOnlyExpanded ? 'Collapse' : 'Expand' }}
          </button>
        </div>
      </header>

      <div v-if="dbOnlyExpanded" class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-gray-400 border-b border-gray-800">
              <th class="text-left py-2 pr-3 font-medium">Name</th>
              <th class="text-left py-2 pr-3 font-medium">Missing path</th>
              <th class="text-right py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800/60">
            <tr v-for="row in dbOnlyRows" :key="row.id" class="hover:bg-gray-800/30">
              <td class="py-2 pr-3">{{ row.name }}</td>
              <td class="py-2 pr-3 font-mono text-xs">{{ row.path }}</td>
              <td class="py-2 text-right">
                <button
                  type="button"
                  class="px-2 py-1 text-xs rounded bg-red-500/10 border border-red-500/40 text-red-300 hover:bg-red-500/20"
                  @click="startDanglingRowDelete(row)"
                >
                  Delete row
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- C) Preview-bucket files with no live sound_files row -->
    <section
      v-if="hasRun && previewOrphanKeys.length"
      class="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 space-y-3"
    >
      <header class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-red-200">
            Preview files with no live sound ({{ previewOrphanKeys.length }})
          </h3>
          <p class="text-xs text-gray-400 mt-1">
            Files in the previews bucket whose embedded sound id doesn't match any current
            <code class="text-gray-300">sound_files</code> row. Safe candidates for cleanup.
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <button
            type="button"
            class="px-3 py-1.5 text-xs rounded bg-red-500/15 border border-red-500/50 text-red-200 hover:bg-red-500/25"
            @click="startMassPreviewOrphans"
          >
            Delete all ({{ previewOrphanKeys.length }})
          </button>
          <button
            type="button"
            class="text-xs text-gray-400 hover:text-gray-200 underline"
            @click="previewOnlyExpanded = !previewOnlyExpanded"
          >
            {{ previewOnlyExpanded ? 'Collapse' : 'Expand' }}
          </button>
        </div>
      </header>

      <div v-if="previewOnlyExpanded" class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-gray-400 border-b border-gray-800">
              <th class="text-left py-2 pr-3 font-medium">Preview key</th>
              <th class="text-left py-2 pr-3 font-medium">Derived sound id</th>
              <th class="text-right py-2 pr-3 font-medium">Size</th>
              <th class="text-right py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800/60">
            <tr v-for="item in previewOrphanKeys" :key="item.key" class="hover:bg-gray-800/30">
              <td class="py-2 pr-3 font-mono text-xs">{{ item.key }}</td>
              <td class="py-2 pr-3 font-mono text-xs text-gray-400">
                {{ item.soundId || '(not a standard preview filename)' }}
              </td>
              <td class="py-2 pr-3 text-right text-gray-400">{{ formatBytes(item.size) }}</td>
              <td class="py-2 text-right">
                <button
                  type="button"
                  class="px-2 py-1 text-xs rounded bg-red-500/10 border border-red-500/40 text-red-300 hover:bg-red-500/20"
                  @click="startPreviewOrphanDelete(item)"
                >
                  Delete preview
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p
      v-if="hasRun && !previewBucketAvailable"
      class="text-xs text-amber-300"
    >
      ⚠ Preview bucket was unreachable. Set <code class="text-gray-200">R2_PREVIEW_BUCKET_NAME</code> on the server to include previews in the scan.
    </p>

    <!-- Pre-scan empty state -->
    <div
      v-if="!hasRun && !loading"
      class="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-10 text-center"
    >
      <p class="text-gray-300 font-medium mb-1">Run a scan to compare R2 + Supabase</p>
      <p class="text-sm text-gray-500">
        Nothing deletes until you click into individual items and type to confirm.
      </p>
    </div>

    <ConfirmDeleteModal
      v-if="pendingDelete"
      :title="pendingDelete.title"
      :description="pendingDelete.description"
      :expected-confirmation="pendingDelete.expectedConfirmation"
      confirm-label="Delete"
      :busy="deleting"
      :error="deleteError"
      @close="cancelDelete"
      @confirm="confirmPendingDelete"
    />

    <MassDeleteModal
      v-if="massState"
      :title="massState.title"
      :description="massState.description"
      :expected-confirmation="massState.expectedConfirmation"
      :start-label="massState.startLabel"
      :phase="massState.phase"
      :total="massState.total"
      :completed="massState.completed"
      :errors="massState.errors"
      @close="massState = null"
      @confirm="runMassDelete"
      @cancel="cancelMassDelete"
    />

    <transition name="fade">
      <div
        v-if="toast"
        class="fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-xl backdrop-blur-sm text-black z-50"
        :class="toast.variant === 'error' ? 'bg-red-500/90' : 'bg-emerald-500/90'"
      >
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
