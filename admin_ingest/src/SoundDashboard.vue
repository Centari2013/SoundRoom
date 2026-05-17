<!--
  Library dashboard — view, edit, and (carefully) delete sounds.

  Safety properties:
    - Loads sound_files from Supabase using the curator's authenticated
      session. Pure read until the user explicitly clicks Edit/Delete.
    - Edit changes go through /api/admin?action=update-sound which
      whitelists fields server-side; nothing here can mutate
      path/id/size/etc.
    - Delete uses the type-to-confirm modal and the
      /api/admin?action=delete-sound endpoint which double-checks the
      typed name on the server before deleting from R2 + Supabase.
    - No bulk operations. No "delete all" buttons. Every destructive
      action is per-row, confirmed individually.
-->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from './utils/supabaseClient'
import { BUCKET_OPTIONS, SOURCE_OPTIONS, LICENSE_OPTIONS } from './utils/categoryList'
import { deleteSound, updateSound } from './utils/adminApi'
import { PLANS } from '@app/constants/entitlements'
import ConfirmDeleteModal from './ConfirmDeleteModal.vue'

const TIERS = PLANS ?? ['free', 'basic', 'pro']
const KNOWN_BUCKETS = new Set(BUCKET_OPTIONS.map((b) => b.value))

// ─── Health-check thresholds ────────────────────────────────────────
// Tunable in one place. Bumping these lowers/raises how chatty the
// Health panel gets.
const HEALTH = {
  MIN_BUCKET_SIZE: 3, // bucket with fewer sounds = "thin"
  MIN_FREE_PERCENT: 0.15, // <15% free = stingy free experience
  MAX_BUCKET_DOMINANCE: 0.4, // any bucket >40% of catalog = lopsided
  MAX_SOURCE_DOMINANCE: 0.75, // any source >75% of catalog = concentration risk
  THIN_CELL_AT: 2, // matrix cell ≤2 sounds renders amber
}

const sounds = ref([])
const loading = ref(false)
const loadError = ref(null)
const search = ref('')
const bucketFilter = ref('')
const tierFilter = ref('')

const editTarget = ref(null) // shallow-cloned row being edited
const editDraft = ref(null)
const editError = ref(null)
const editSaving = ref(false)

const deleteTarget = ref(null) // the row about to be deleted
const deleteError = ref(null)
const deleting = ref(false)

const toast = ref(null)

async function loadSounds() {
  loading.value = true
  loadError.value = null
  try {
    const { data, error } = await supabase
      .from('sound_files')
      .select('id, name, path, bucket, plan_tier, tags, source, license_type, duration_seconds, size, mime_type, cone_inner, cone_outer, created_at')
      .order('name', { ascending: true })

    if (error) throw error
    sounds.value = data ?? []
  } catch (err) {
    console.error('[dashboard] load failed', err)
    loadError.value = err.message || 'Failed to load sounds.'
  } finally {
    loading.value = false
  }
}

onMounted(loadSounds)

function showToast(message, variant = 'success') {
  toast.value = { id: Date.now(), message, variant }
  setTimeout(() => {
    toast.value = null
  }, 4000)
}

// ── Stats ───────────────────────────────────────────────────────────
const totalCount = computed(() => sounds.value.length)
const totalBytes = computed(() => sounds.value.reduce((sum, s) => sum + (s.size ?? 0), 0))
const totalSeconds = computed(() => sounds.value.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0))

const buckets = computed(() => {
  // Use distinct buckets actually present in data so we catch typos
  // like "atmosphere" vs "atmospheric" rather than hiding them.
  const set = new Set(sounds.value.map((s) => s.bucket || '(none)'))
  return [...set].sort()
})

const tiers = TIERS

const matrix = computed(() => {
  // Returns { [bucket]: { [tier]: count } }
  const m = {}
  for (const bucket of buckets.value) {
    m[bucket] = {}
    for (const tier of tiers) m[bucket][tier] = 0
  }
  for (const s of sounds.value) {
    const b = s.bucket || '(none)'
    const t = s.plan_tier || 'free'
    if (!m[b]) m[b] = {}
    m[b][t] = (m[b][t] ?? 0) + 1
  }
  return m
})

function bucketTotal(bucket) {
  return tiers.reduce((sum, t) => sum + (matrix.value[bucket]?.[t] ?? 0), 0)
}

function tierTotal(tier) {
  return buckets.value.reduce((sum, b) => sum + (matrix.value[b]?.[tier] ?? 0), 0)
}

// ── Health checks ───────────────────────────────────────────────────
// Each check returns one entry per problem. Empty array = clean.
// `severity` controls icon + border color in the UI.
// `affected` (optional) is a list of sound ids — surfaced in the
// expand-on-click drawer so the curator can jump to the offenders.
const healthChecks = computed(() => {
  const checks = []
  const total = totalCount.value
  if (total === 0) return checks

  // R1 — missing license_type
  const missingLicense = sounds.value.filter((s) => !s.license_type)
  if (missingLicense.length > 0) {
    checks.push({
      id: 'missing-license',
      severity: 'error',
      title: `${missingLicense.length} sound${missingLicense.length === 1 ? '' : 's'} missing license`,
      message:
        'Every sound should have a license_type before launch. Open each row, set the field, save.',
      affected: missingLicense.map((s) => ({ id: s.id, name: s.name })),
    })
  }

  // R2 — missing source
  const missingSource = sounds.value.filter((s) => !s.source)
  if (missingSource.length > 0) {
    checks.push({
      id: 'missing-source',
      severity: 'error',
      title: `${missingSource.length} sound${missingSource.length === 1 ? '' : 's'} missing source`,
      message:
        'Source attribution should be filled in (Sonniss / Pixabay / Self-recorded / etc.) for every sound.',
      affected: missingSource.map((s) => ({ id: s.id, name: s.name })),
    })
  }

  // R3 — bucket with sounds but zero free coverage
  const noFreeBuckets = buckets.value.filter((b) => {
    const bucketCount = bucketTotal(b)
    const freeCount = matrix.value[b]?.free ?? 0
    return bucketCount > 0 && freeCount === 0
  })
  if (noFreeBuckets.length > 0) {
    checks.push({
      id: 'no-free-coverage',
      severity: 'warning',
      title: `${noFreeBuckets.length} bucket${noFreeBuckets.length === 1 ? '' : 's'} have no free-tier coverage`,
      message:
        'Free users can browse to these categories but find nothing playable: ' +
        noFreeBuckets.join(', ') +
        '. Add at least one free sound to each.',
    })
  }

  // R4 — thin buckets
  const thinBuckets = buckets.value
    .map((b) => ({ bucket: b, n: bucketTotal(b) }))
    .filter(({ n }) => n > 0 && n < HEALTH.MIN_BUCKET_SIZE)
  if (thinBuckets.length > 0) {
    checks.push({
      id: 'thin-buckets',
      severity: 'warning',
      title: `${thinBuckets.length} bucket${thinBuckets.length === 1 ? '' : 's'} are thin`,
      message:
        `Buckets with fewer than ${HEALTH.MIN_BUCKET_SIZE} sounds feel empty when browsed: ` +
        thinBuckets.map((b) => `${b.bucket} (${b.n})`).join(', ') +
        '.',
    })
  }

  // R5 — bucket name not in canonical category list (typo detector)
  const unknownBuckets = buckets.value.filter(
    (b) => b !== '(none)' && !KNOWN_BUCKETS.has(b)
  )
  if (unknownBuckets.length > 0) {
    checks.push({
      id: 'unknown-bucket',
      severity: 'warning',
      title: `${unknownBuckets.length} unknown bucket name${unknownBuckets.length === 1 ? '' : 's'}`,
      message:
        `Sounds are tagged with bucket values that aren't in the canonical category list: ` +
        unknownBuckets.join(', ') +
        `. Likely typos or legacy. Re-bucket via Edit, or update the canonical list in admin_ingest/src/utils/categoryList.js.`,
    })
  }

  // R6 — overall free percentage too low
  const freeCount = sounds.value.filter((s) => (s.plan_tier ?? 'free') === 'free').length
  const freePercent = freeCount / total
  if (freePercent < HEALTH.MIN_FREE_PERCENT) {
    checks.push({
      id: 'low-free-coverage',
      severity: 'warning',
      title: `Free tier is only ${Math.round(freePercent * 100)}% of catalog`,
      message:
        `Free users see a thin library (${freeCount} of ${total} sounds). ` +
        `Target is at least ${Math.round(HEALTH.MIN_FREE_PERCENT * 100)}%.`,
    })
  }

  // R7 — single bucket dominating the catalog
  const dominantBucket = buckets.value
    .map((b) => ({ bucket: b, n: bucketTotal(b) }))
    .sort((a, b) => b.n - a.n)[0]
  if (dominantBucket && dominantBucket.n / total > HEALTH.MAX_BUCKET_DOMINANCE) {
    const pct = Math.round((dominantBucket.n / total) * 100)
    checks.push({
      id: 'lopsided-buckets',
      severity: 'warning',
      title: `Bucket "${dominantBucket.bucket}" is ${pct}% of catalog`,
      message:
        `One category dominating risks the library feeling one-note. ` +
        `Consider diversifying or splitting "${dominantBucket.bucket}" into sub-categories.`,
    })
  }

  // R8 — single source providing too much (concentration risk)
  const sourceCounts = new Map()
  for (const s of sounds.value) {
    const key = (s.source || '(unknown)').toLowerCase().trim()
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1)
  }
  const dominantSource = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (dominantSource && dominantSource[1] / total > HEALTH.MAX_SOURCE_DOMINANCE) {
    const pct = Math.round((dominantSource[1] / total) * 100)
    checks.push({
      id: 'source-concentration',
      severity: 'info',
      title: `Source "${dominantSource[0]}" provides ${pct}% of catalog`,
      message:
        `If that provider's licensing or catalog changes, a lot of your library is affected. ` +
        `Consider diversifying sources over time.`,
    })
  }

  return checks
})

const healthSummary = computed(() => {
  const counts = { error: 0, warning: 0, info: 0 }
  for (const c of healthChecks.value) {
    counts[c.severity] = (counts[c.severity] ?? 0) + 1
  }
  return counts
})

const expandedHealthCheck = ref(null)
function toggleHealthCheck(id) {
  expandedHealthCheck.value = expandedHealthCheck.value === id ? null : id
}

// ── Matrix cell coloring ────────────────────────────────────────────
function cellClass(bucket, tier) {
  const n = matrix.value[bucket]?.[tier] ?? 0
  if (n === 0) return 'text-gray-600' // empty — muted
  if (n <= HEALTH.THIN_CELL_AT) return 'text-amber-300' // thin — warn
  return 'text-gray-100' // healthy
}

// ── Filtering ───────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return sounds.value.filter((s) => {
    if (bucketFilter.value && s.bucket !== bucketFilter.value) return false
    if (tierFilter.value && s.plan_tier !== tierFilter.value) return false
    if (!q) return true
    const tags = Array.isArray(s.tags) ? s.tags.join(' ').toLowerCase() : ''
    return (
      s.name?.toLowerCase().includes(q) ||
      s.path?.toLowerCase().includes(q) ||
      tags.includes(q)
    )
  })
})

function selectBucketTier(bucket, tier) {
  bucketFilter.value = bucket === '(none)' ? '' : bucket
  tierFilter.value = tier
}

function clearFilters() {
  search.value = ''
  bucketFilter.value = ''
  tierFilter.value = ''
}

// ── Formatting helpers ──────────────────────────────────────────────
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

function formatDuration(seconds) {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Edit flow ───────────────────────────────────────────────────────
function openEdit(sound) {
  editTarget.value = sound
  editError.value = null
  editDraft.value = {
    name: sound.name ?? '',
    bucket: sound.bucket ?? '',
    plan_tier: sound.plan_tier ?? 'free',
    tags: Array.isArray(sound.tags) ? sound.tags.join(', ') : '',
    source: sound.source ?? '',
    license_type: sound.license_type ?? '',
    cone_inner: sound.cone_inner ?? 30,
    cone_outer: sound.cone_outer ?? 60,
  }
}

function cancelEdit() {
  editTarget.value = null
  editDraft.value = null
  editError.value = null
}

async function saveEdit() {
  if (!editTarget.value || !editDraft.value || editSaving.value) return
  editSaving.value = true
  editError.value = null
  try {
    const draft = editDraft.value
    const patch = {
      name: draft.name.trim(),
      bucket: draft.bucket.trim(),
      plan_tier: draft.plan_tier,
      tags: draft.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      source: draft.source.trim() || null,
      license_type: draft.license_type.trim() || null,
      cone_inner: Number(draft.cone_inner),
      cone_outer: Number(draft.cone_outer),
    }
    const { sound } = await updateSound({ id: editTarget.value.id, patch })

    // Update the local row in place so the table refreshes without
    // a full reload.
    const idx = sounds.value.findIndex((s) => s.id === editTarget.value.id)
    if (idx !== -1) sounds.value[idx] = { ...sounds.value[idx], ...sound }

    showToast(`Updated "${sound.name}".`)
    cancelEdit()
  } catch (err) {
    console.error('[dashboard] edit failed', err)
    editError.value = err.message || 'Update failed.'
  } finally {
    editSaving.value = false
  }
}

// ── Delete flow ─────────────────────────────────────────────────────
function openDelete(sound) {
  deleteTarget.value = sound
  deleteError.value = null
}

function cancelDelete() {
  deleteTarget.value = null
  deleteError.value = null
}

async function confirmDelete() {
  if (!deleteTarget.value || deleting.value) return
  deleting.value = true
  deleteError.value = null
  try {
    const target = deleteTarget.value
    await deleteSound({ id: target.id, confirmName: target.name })
    sounds.value = sounds.value.filter((s) => s.id !== target.id)
    showToast(`Deleted "${target.name}" from R2 + Supabase.`)
    cancelDelete()
  } catch (err) {
    console.error('[dashboard] delete failed', err)
    deleteError.value = err.message || 'Delete failed.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- Top summary -->
    <header class="space-y-2">
      <h2 class="text-2xl font-semibold">Library Dashboard</h2>
      <p class="text-sm text-gray-400">
        View the spread across categories and tiers. Edit metadata or delete sounds — every destructive action requires you to retype the sound's name.
      </p>
    </header>

    <!-- Stats row -->
    <section class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <p class="text-xs uppercase tracking-wide text-gray-500">Total sounds</p>
        <p class="mt-2 text-2xl font-semibold">{{ totalCount }}</p>
      </div>
      <div class="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <p class="text-xs uppercase tracking-wide text-gray-500">Total size</p>
        <p class="mt-2 text-2xl font-semibold">{{ formatBytes(totalBytes) }}</p>
      </div>
      <div class="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <p class="text-xs uppercase tracking-wide text-gray-500">Total duration</p>
        <p class="mt-2 text-2xl font-semibold">{{ formatDuration(totalSeconds) }}</p>
      </div>
    </section>

    <!-- Bucket × Tier matrix -->
    <section class="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 space-y-4">
      <h3 class="text-lg font-semibold">Spread (bucket × tier)</h3>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-gray-400">
              <th class="text-left py-2 pr-4 font-medium">Bucket</th>
              <th v-for="tier in tiers" :key="tier" class="text-right py-2 px-3 font-medium capitalize">
                {{ tier }}
              </th>
              <th class="text-right py-2 pl-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800/80">
            <tr v-for="bucket in buckets" :key="bucket" class="hover:bg-gray-800/40">
              <td class="py-2 pr-4 font-medium">{{ bucket }}</td>
              <td
                v-for="tier in tiers"
                :key="tier"
                class="py-2 px-3 text-right"
              >
                <button
                  type="button"
                  class="hover:underline disabled:no-underline"
                  :class="cellClass(bucket, tier)"
                  :disabled="(matrix[bucket]?.[tier] ?? 0) === 0"
                  :title="
                    (matrix[bucket]?.[tier] ?? 0) === 0
                      ? 'No sounds for this bucket × tier combination'
                      : (matrix[bucket]?.[tier] ?? 0) <= HEALTH.THIN_CELL_AT
                        ? 'Thin coverage — consider adding more sounds here'
                        : ''
                  "
                  @click="selectBucketTier(bucket, tier)"
                >
                  {{ matrix[bucket]?.[tier] ?? 0 }}
                </button>
              </td>
              <td class="py-2 pl-3 text-right text-gray-300 font-semibold">{{ bucketTotal(bucket) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-gray-800 text-gray-300">
              <td class="py-2 pr-4 font-semibold">Total</td>
              <td v-for="tier in tiers" :key="tier" class="py-2 px-3 text-right font-semibold">
                {{ tierTotal(tier) }}
              </td>
              <td class="py-2 pl-3 text-right font-bold">{{ totalCount }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <!-- Health checks -->
    <section
      class="rounded-2xl border p-6 space-y-4"
      :class="
        healthChecks.length === 0
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-gray-800 bg-gray-900/60'
      "
    >
      <header class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 class="text-lg font-semibold">Health checks</h3>
          <p class="text-xs text-gray-400 mt-1">
            Curation guardrails. Errors should be cleared before launch; warnings are
            judgment calls.
          </p>
        </div>
        <div v-if="healthChecks.length" class="text-xs font-mono text-gray-300 flex gap-3">
          <span v-if="healthSummary.error" class="text-red-300">{{ healthSummary.error }} error{{ healthSummary.error === 1 ? '' : 's' }}</span>
          <span v-if="healthSummary.warning" class="text-amber-300">{{ healthSummary.warning }} warning{{ healthSummary.warning === 1 ? '' : 's' }}</span>
          <span v-if="healthSummary.info" class="text-sky-300">{{ healthSummary.info }} info</span>
        </div>
      </header>

      <p v-if="healthChecks.length === 0" class="text-sm text-emerald-300">
        ✓ All checks pass. Nothing to fix on the curation side.
      </p>

      <ul v-else class="space-y-2">
        <li
          v-for="check in healthChecks"
          :key="check.id"
          class="rounded-lg border p-3"
          :class="{
            'border-red-500/40 bg-red-500/5': check.severity === 'error',
            'border-amber-500/40 bg-amber-500/5': check.severity === 'warning',
            'border-sky-500/40 bg-sky-500/5': check.severity === 'info',
          }"
        >
          <div class="flex items-start gap-3">
            <span
              class="mt-0.5 text-base"
              :class="{
                'text-red-300': check.severity === 'error',
                'text-amber-300': check.severity === 'warning',
                'text-sky-300': check.severity === 'info',
              }"
              aria-hidden="true"
            >
              {{ check.severity === 'error' ? '✕' : check.severity === 'warning' ? '!' : 'ⓘ' }}
            </span>
            <div class="flex-1 space-y-1">
              <p
                class="text-sm font-semibold"
                :class="{
                  'text-red-200': check.severity === 'error',
                  'text-amber-200': check.severity === 'warning',
                  'text-sky-200': check.severity === 'info',
                }"
              >
                {{ check.title }}
              </p>
              <p class="text-xs text-gray-300 leading-relaxed">{{ check.message }}</p>
              <button
                v-if="check.affected && check.affected.length"
                type="button"
                class="text-xs text-gray-400 hover:text-gray-200 underline"
                @click="toggleHealthCheck(check.id)"
              >
                {{ expandedHealthCheck === check.id ? 'Hide' : 'Show' }}
                {{ check.affected.length }} affected sound{{ check.affected.length === 1 ? '' : 's' }}
              </button>
              <ul
                v-if="expandedHealthCheck === check.id && check.affected"
                class="mt-1 ml-3 text-xs text-gray-400 space-y-0.5 max-h-40 overflow-y-auto"
              >
                <li v-for="entry in check.affected" :key="entry.id" class="font-mono">
                  {{ entry.name }}
                  <span class="text-gray-600">·</span>
                  <span class="text-gray-600">{{ entry.id.slice(0, 8) }}…</span>
                </li>
              </ul>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <!-- Filters + list -->
    <section class="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 class="text-lg font-semibold">Sounds</h3>
        <div class="flex flex-wrap gap-2 items-center">
          <input
            v-model="search"
            type="text"
            placeholder="Search name, path, or tags…"
            class="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm w-56"
          />
          <select v-model="bucketFilter" class="bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-sm">
            <option value="">All buckets</option>
            <option v-for="bucket in buckets" :key="bucket" :value="bucket === '(none)' ? '' : bucket">
              {{ bucket }}
            </option>
          </select>
          <select v-model="tierFilter" class="bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-sm">
            <option value="">All tiers</option>
            <option v-for="tier in tiers" :key="tier" :value="tier">{{ tier }}</option>
          </select>
          <button
            v-if="search || bucketFilter || tierFilter"
            type="button"
            class="text-xs text-gray-400 hover:text-gray-200 underline"
            @click="clearFilters"
          >
            Clear filters
          </button>
        </div>
      </div>

      <p v-if="loading" class="text-sm text-gray-400">Loading…</p>
      <p v-if="loadError" class="text-sm text-red-300">{{ loadError }}</p>

      <div v-if="!loading && !loadError" class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-gray-400 border-b border-gray-800">
              <th class="text-left py-2 pr-3 font-medium">Name</th>
              <th class="text-left py-2 pr-3 font-medium">Bucket</th>
              <th class="text-left py-2 pr-3 font-medium">Tier</th>
              <th class="text-left py-2 pr-3 font-medium">Source</th>
              <th class="text-left py-2 pr-3 font-medium">License</th>
              <th class="text-right py-2 pr-3 font-medium">Dur</th>
              <th class="text-right py-2 pr-3 font-medium">Size</th>
              <th class="text-right py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800/60">
            <tr v-for="s in filtered" :key="s.id" class="hover:bg-gray-800/30">
              <td class="py-2 pr-3 max-w-[18ch] truncate" :title="s.name">{{ s.name }}</td>
              <td class="py-2 pr-3">{{ s.bucket }}</td>
              <td class="py-2 pr-3 capitalize">{{ s.plan_tier }}</td>
              <td class="py-2 pr-3 text-gray-400">{{ s.source || '—' }}</td>
              <td class="py-2 pr-3 text-gray-400">{{ s.license_type || '—' }}</td>
              <td class="py-2 pr-3 text-right text-gray-400">{{ formatDuration(s.duration_seconds) }}</td>
              <td class="py-2 pr-3 text-right text-gray-400">{{ formatBytes(s.size) }}</td>
              <td class="py-2 text-right">
                <button
                  type="button"
                  class="px-2 py-1 text-xs rounded bg-gray-800 border border-gray-700 hover:bg-gray-700 mr-1"
                  @click="openEdit(s)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="px-2 py-1 text-xs rounded bg-red-500/10 border border-red-500/40 text-red-300 hover:bg-red-500/20"
                  @click="openDelete(s)"
                >
                  Delete
                </button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="8" class="py-6 text-center text-gray-500">No sounds match the current filters.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Edit modal -->
    <div
      v-if="editTarget && editDraft"
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      @click.self="!editSaving && cancelEdit()"
    >
      <div class="w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <header class="space-y-1">
          <h3 class="text-lg font-semibold">Edit metadata</h3>
          <p class="text-xs text-gray-500">{{ editTarget.path }} · id {{ editTarget.id }}</p>
        </header>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-1 text-xs text-gray-400">
            <span>Display Name</span>
            <input
              v-model="editDraft.name"
              type="text"
              class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-100"
            />
          </label>
          <label class="space-y-1 text-xs text-gray-400">
            <span>Bucket</span>
            <select
              v-model="editDraft.bucket"
              class="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-100"
            >
              <option value="">— select —</option>
              <option v-for="b in BUCKET_OPTIONS" :key="b.value" :value="b.value">{{ b.label }}</option>
              <option v-if="editDraft.bucket && !BUCKET_OPTIONS.some(b => b.value === editDraft.bucket)" :value="editDraft.bucket">
                {{ editDraft.bucket }} (existing)
              </option>
            </select>
          </label>
          <label class="space-y-1 text-xs text-gray-400">
            <span>Plan Tier</span>
            <select
              v-model="editDraft.plan_tier"
              class="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-100"
            >
              <option v-for="t in tiers" :key="t" :value="t">{{ t }}</option>
            </select>
          </label>
          <label class="space-y-1 text-xs text-gray-400">
            <span>Source</span>
            <select
              v-model="editDraft.source"
              class="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-100"
            >
              <option value="">— unspecified —</option>
              <option v-for="opt in SOURCE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
              <option v-if="editDraft.source && !SOURCE_OPTIONS.includes(editDraft.source)" :value="editDraft.source">
                {{ editDraft.source }} (existing)
              </option>
            </select>
          </label>
          <label class="space-y-1 text-xs text-gray-400">
            <span>License</span>
            <select
              v-model="editDraft.license_type"
              class="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-100"
            >
              <option value="">— unspecified —</option>
              <option v-for="opt in LICENSE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
              <option v-if="editDraft.license_type && !LICENSE_OPTIONS.includes(editDraft.license_type)" :value="editDraft.license_type">
                {{ editDraft.license_type }} (existing)
              </option>
            </select>
          </label>
          <label class="space-y-1 text-xs text-gray-400 sm:col-span-2">
            <span>Tags (comma separated)</span>
            <input
              v-model="editDraft.tags"
              type="text"
              class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-100"
            />
          </label>
          <label class="space-y-1 text-xs text-gray-400">
            <span>Cone Inner (°)</span>
            <input
              v-model.number="editDraft.cone_inner"
              type="number"
              min="0"
              max="360"
              step="1"
              class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-100"
            />
          </label>
          <label class="space-y-1 text-xs text-gray-400">
            <span>Cone Outer (°)</span>
            <input
              v-model.number="editDraft.cone_outer"
              type="number"
              min="0"
              max="360"
              step="1"
              class="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-100"
            />
          </label>
        </div>

        <p v-if="editError" class="text-sm text-red-300">{{ editError }}</p>

        <footer class="flex items-center justify-end gap-3 pt-2 border-t border-gray-800">
          <button
            type="button"
            class="px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-sm text-gray-200 hover:bg-gray-700"
            :disabled="editSaving"
            @click="cancelEdit"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 disabled:opacity-40"
            :disabled="editSaving"
            @click="saveEdit"
          >
            {{ editSaving ? 'Saving…' : 'Save changes' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- Delete modal -->
    <ConfirmDeleteModal
      v-if="deleteTarget"
      :title="`Delete &quot;${deleteTarget.name}&quot;`"
      :description="`This will permanently remove the R2 object at ${deleteTarget.path} AND the sound_files row for &quot;${deleteTarget.name}&quot;. There is no undo and there are no backups.`"
      :expected-confirmation="deleteTarget.name"
      confirm-label="Delete sound"
      :busy="deleting"
      :error="deleteError"
      @close="cancelDelete"
      @confirm="confirmDelete"
    />

    <!-- Toast -->
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
