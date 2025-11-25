<template>
  <div class="modal-backdrop z-50" @click.self="$emit('close')">
    <div class="modal-panel max-w-3xl mx-auto p-6 bg-surface-base text-text-primary rounded-xl shadow-lg overflow-y-auto max-h-[90vh] border border-border-subtle">
      <h2 class="text-xl font-bold mb-4">Upload Your Sounds</h2>

      <div class="border border-dashed border-border-subtle rounded-lg p-6 text-center mb-6 bg-surface-base/80">
        <input
          type="file"
          accept="audio/*"
          multiple
          class="hidden"
          ref="fileInput"
          @change="handleFileSelect"
        />
        <BaseButton @click="fileInput.click()">Select Audio Files</BaseButton>
        <p class="text-sm text-text-muted mt-2">Max 10MB per file</p>
      </div>

      <div v-if="files.length > 0" class="space-y-4">
        <div v-for="file in files" :key="file.id" class="bg-surface-base rounded-md p-4 flex flex-col gap-2 border border-border-subtle">
          <div class="flex justify-between items-center">
            <input
              v-model="file.name"
              class="flex-1 p-1 text-base border border-border-subtle rounded-md bg-surface-raised text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
            />
            <BaseButton class="ml-2" @click="autoTag(file)" :disabled="file.tagging">
              <template v-if="file.tagging">
                <LoadingSpinner />
              </template>
              <template v-else>
                Auto-Tag
              </template>
            </BaseButton>

          </div>

          <div class="flex items-center gap-2">
            <audio :src="file.previewUrl" controls class="w-full" />
          </div>
          <div class="h-2 bg-border-subtle rounded overflow-hidden" v-if="uploading">
            <div
              class="h-full bg-status-success transition-all duration-300"
              :style="{ width: `${file.progress}%` }"
            ></div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
          <span
            v-for="(tag, index) in file.tags"
            :key="tag"
            class="flex items-center bg-surface-raised text-xs px-2 rounded text-text-primary border border-border-subtle"
          >
            {{ tag }}
            <label
              type="button"
              class="ml-1 text-text-muted hover:text-status-danger cursor-pointer"
              @click="file.tags.splice(index, 1)"
              aria-label="Remove tag"
            >
            <p class="text-lg">
              ×
            </p>
              
            </label>
          </span>
          <input
            v-model="file.newTag"
            @keydown.enter.prevent="addTag(file)"
            @keydown="','"
            @blur="addTag(file)"
            placeholder="Add tag..."
            class="text-sm p-1 rounded border border-border-subtle bg-surface-raised text-text-primary w-25 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
          />
        </div>

        </div>
      </div>

      <div v-if="files.length" class="mt-6 flex justify-end gap-2">
        <BaseButton @click="$emit('close')" variant="ghost">Cancel</BaseButton>
        <BaseButton @click="uploadAll" :disabled="uploading || isBusy">
          <template v-if="uploading">
            <LoadingSpinner />
          </template>
          <template v-else>
            Upload All
          </template>
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import pLimit from 'p-limit'
import { ref, computed } from 'vue'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner.vue'
import uploadAudio from '@/utils/uploadAudio'
import { getFileDuration, stripExtension } from '@/utils/audioFileUtils'
import { supabase } from '@/utils/supabase'
import { useAuth } from '@/composables/useAuth'
import { classifyAudio, initAudioClassifier } from '@/utils/audioTaggerNamer'
import { requestPreviewGeneration } from '@/utils/previewGeneration'

const emit = defineEmits(['close', 'finished'])

const { user } = useAuth()
const fileInput = ref(null)
const files = ref([])
const uploading = ref(false)
const isBusy = computed(() => {
  return uploading.value || files.value.some(f => f.tagging)
})

function handleFileSelect(e) {
  const selected = Array.from(e.target.files || [])

  for (const f of selected) {
    const id = crypto.randomUUID()
    files.value.push({
      id,
      raw: f,
      name: stripExtension(f.name),
      previewUrl: URL.createObjectURL(f),
      tags: [],
      tagging: false,
      newTag: '',
      progress: 0
    })
  }
  fileInput.value.value = '' // reset input
}

function addTag(file) {
  const newTag = file.newTag.trim().replace(/,+$/, '')
  if (newTag && !file.tags.includes(newTag)) {
    file.tags.push(newTag)
  }
  file.newTag = ''
}


async function autoTag(file) {
  file.tagging = true
  try {
    await initAudioClassifier()
    const tags = await classifyAudio(file.raw)
    file.tags.push(...tags.filter(tag => !file.tags.includes(tag)))
    //file.name = await generateNameFromTags(tags)
  } catch (err) {
    console.error('Auto-tag failed:', err)
  } finally {
    file.tagging = false
  }
}

const limit = pLimit(3) // allow 3 concurrent uploads at once

async function uploadAll() {
  uploading.value = true

  const uploadPromises = files.value.map(file =>
    limit(async () => {
      const { key: storageKey, soundId } = await uploadAudio(file.raw, user.value.id, (percent) => {
        file.progress = percent
      })
      const duration = await getFileDuration(file.raw)

      const { data, error } = await supabase
        .from('sound_files')
        .insert({
          id: soundId,
          path: storageKey,
          name: file.name,
          bucket: user.value.id,
          duration_seconds: duration,
          size: file.raw.size,
          mime_type: file.raw.type,
          tags: file.tags,
          owner_id: user.value.id,
          preview_url: null
        })
        .select('id')
        .single()

      if (error) throw error

      if (data?.id) {
        await requestPreviewGeneration({
          key: storageKey,
          soundId: data.id
        })
      }
    }).catch(err => {
      console.error('Upload failed for', file.name, err)
    })
  )

  await Promise.all(uploadPromises)
  uploading.value = false
  emit('finished')
  emit('close')
}

</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(var(--base-black-rgb), 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal-panel {
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
}
</style>
