import downloadAudio, { buildStorageKey } from '@/utils/downloadAudio'
import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { useListenerStore } from '@/stores/useListenerStore'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { storeToRefs } from 'pinia'
import { isSoundAvailable } from '@/utils/soundIntegrity'

let actionsRegistered = false
let registeredActionManager = null

const LOCKED_PLACEHOLDER_AUDIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='

const getLockedPlaceholderAudio = (libraryId) => `${LOCKED_PLACEHOLDER_AUDIO}#locked-${libraryId ?? 'source'}`

/**
 * Register all SoundRoom related undoable actions.
 */
export function registerSoundRoomActions() {
  const { actionManager } = storeToRefs(useActionManagerStore())

  if (actionsRegistered && registeredActionManager === actionManager.value) {
    return
  }

  registerCanvasActions()
  registerDraggableActions()
  registerSchedulingActions()
  actionsRegistered = true
  registeredActionManager = actionManager.value
}

/**
 * Unregister previously registered SoundRoom actions.
 */
export function unregisterSoundRoomActions() {
  if (!actionsRegistered) return
  const { actionManager } = storeToRefs(useActionManagerStore())
  const manager = registeredActionManager ?? actionManager.value

  manager.unregisterActionHandlers([
    'add_canvas_sound_source',
    'delete_canvas_sound_source',
    'move_canvas_sound_source',
    'delete_draggable_sound_source',
    'add_draggable_sound_source'
  ])
  actionsRegistered = false
  registeredActionManager = null
}

/**
 * Setup undoable actions for sources that appear on the canvas.
 */
function registerCanvasActions() {
  const { audioEngine } = storeToRefs(useAudioEngineStore())
  const { actionManager } = storeToRefs(useActionManagerStore())
  const { listener } = storeToRefs(useListenerStore())
  const { soundLibrarySources } = storeToRefs(useAudioCacheStore())
  /**
   * Move a sound source on the canvas and update audio.
   *
   * @param {Object} src - sound source instance
   * @param {{x: number, y: number}} coords - new coordinates
   */
  const moveSoundSource = (src, coords) => {
    if (src?.locked) return
    src.instance.state.x = coords.x
    src.instance.state.y = coords.y
    src.instance.updateAudio()
    listener.value.updateAudio()
  }
  /**
   * Add a sound source to the audio engine and refresh listener audio.
   *
   * @param {Object} payload - action payload
   */
  const addSoundSource = async (payload) => {
    if (payload?.src?.locked && !payload?.allowLocked) {
      console.info('Sound source is locked for the current plan.')
      return
    }
    const libraryId = payload?.src?.libraryId
    if (libraryId && !soundLibrarySources.value.find(s => s.libraryId === libraryId)) {
      const available = await isSoundAvailable(libraryId)
      if (!available) {
        console.warn(`Skipping add for deleted sound ${libraryId}`)
        return
      }
    }
    const libraryEntry = soundLibrarySources.value.find(s => s.libraryId === payload.src.libraryId)
    if (libraryEntry) {
      payload.src.audioPath = libraryEntry.audioPath
      payload.src.bucket = payload.src.bucket ?? libraryEntry.bucket
      payload.src.path = payload.src.path ?? libraryEntry.path
      payload.src.plan_tier = payload.src.plan_tier ?? libraryEntry.plan_tier
      payload.src.base = payload.src.base ?? libraryEntry.base ?? libraryEntry.plan_tier ?? 'users'
    }
    const storageKey = payload.src.storageKey ?? (payload.src.bucket && payload.src.path
      ? buildStorageKey(payload.src.base ?? 'users', payload.src.bucket, payload.src.path)
      : null)
    payload.src.storageKey = storageKey
    payload.src.fileId = payload.src.fileId ?? payload.src.libraryId ?? storageKey ?? payload.src.audioPath ?? null
    audioEngine.value.addSoundSource(payload)
    listener.value.updateAudio()
  }

  /**
   * Remove a sound source from the audio engine.
   *
   * @param {Object} payload - action payload
   */
  const deleteSoundSource = (payload) => {
    payload.src = audioEngine.value.deleteSoundSource(payload)
    payload.allowLocked = true
    listener.value.updateAudio()
  }

  actionManager.value.registerActionHandlers('add_canvas_sound_source',
    async payload => await addSoundSource(payload),
    deleteSoundSource
  )

  actionManager.value.registerActionHandlers('delete_canvas_sound_source',
    deleteSoundSource,
    addSoundSource
  )

  actionManager.value.registerActionHandlers('move_canvas_sound_source',
    payload => moveSoundSource(audioEngine.value.soundSources.value[payload.index], payload.to),
    payload => moveSoundSource(audioEngine.value.soundSources.value[payload.index], payload.from)
  )
}

let MAX_LIB_SOURCES = 20

/**
 * Limit how many library sources can be added to a room.
 *
 * @param {number} limit - maximum count
 */
export function setMaxLibSources(limit){MAX_LIB_SOURCES = limit};
/**
 * Helper to check if the configured library source limit has been reached.
 *
 * @param {import('vue').Ref<Array>} soundLibrarySources - reactive list of sources
 * @returns {boolean}
 */
const maxLibSourcesReached = function(soundLibrarySources){
  if (MAX_LIB_SOURCES){
    if (soundLibrarySources.value.length == MAX_LIB_SOURCES){
      window.alert(`Limit of ${MAX_LIB_SOURCES} library source${MAX_LIB_SOURCES == 1 ? '' : 's'} reached.`)
      return true
    }
  }
  return false
}
/**
 * Setup undoable actions for the draggable sound source list.
 */
function registerDraggableActions() {
  const { audioEngine } = storeToRefs(useAudioEngineStore())
  const { actionManager } = storeToRefs(useActionManagerStore())
  const cacheStore = useAudioCacheStore()
  const { soundLibrarySources } = storeToRefs(cacheStore)

  /**
   * Remove a sound source from the draggable list and store the state so it can be re-added.
   *
   * @param {Object} payload
   */
  const deleteDraggableSoundSource = (payload) => {
      const originalSrc = payload.src // 🔐 store it safely

      // Remove from the source list UI
      const i = soundLibrarySources.value.findIndex(s => s.libraryId == originalSrc.libraryId)
      if (i !== -1) {
        soundLibrarySources.value.splice(i, 1)
        payload.index = i
      }


      // Find all sound sources on the canvas with the same libraryId
      const sources = audioEngine.value.soundSources.value
      const matchingIndices = []

      // Find matching indices FIRST, in reverse
      for (let i = sources.length - 1; i >= 0; i--) {
        if (sources[i]?.libraryId === payload.src.libraryId) {
          matchingIndices.push(i)
        }
      }

      payload.soundNodes = []

      for (const idx of matchingIndices) {
        const srcToDelete = audioEngine.value.soundSources.value[idx]
        if (srcToDelete) {
          const deletedNode = audioEngine.value.deleteSoundSource({ index: idx, src: srcToDelete })
          payload.soundNodes.push({ index: idx, src: deletedNode })
        }
      }

    }

  
  /**
   * Add a sound source back to the draggable list and recreate any canvas nodes.
   *
   * @param {Object} payload
   */
  const addDraggableSoundSource = async (payload) => {
    if (maxLibSourcesReached(soundLibrarySources)) return;

    const isLocked = Boolean(payload?.src?.locked)

    if (!isLocked && payload?.src?.libraryId) {
      const available = await isSoundAvailable(payload.src.libraryId)
      if (!available) {
        console.warn(`Cannot restore deleted sound ${payload.src.libraryId}`)
        return
      }
    }

    // If the source was locked (or we already have a blob URL), reuse the
    // existing audio path to avoid fetching gated content during undo.
    let blobUrl = payload.src.audioPath

    if (!blobUrl) {
      if (isLocked) {
        blobUrl = getLockedPlaceholderAudio(payload.src.libraryId)
      } else {
        try {
          const downloadResult = await downloadAudio(
            payload.src.bucket,
            payload.src.path,
            payload.src.plan_tier ?? 'users',
            false,
            null,
            payload.src.libraryId
          )
          blobUrl = downloadResult.blobUrl
        } catch (err) {
          console.warn(`Unable to restore audio for sound ${payload.src.libraryId}:`, err)
          return
        }
      }
    }

    payload.src.audioPath = blobUrl
    const base = payload.src.base ?? payload.src.plan_tier ?? 'users'
    const storageKey = payload.src.storageKey ?? buildStorageKey(base, payload.src.bucket, payload.src.path)
    payload.src.base = base
    payload.src.storageKey = storageKey
    payload.src.fileId = payload.src.libraryId ?? storageKey
    const exists = soundLibrarySources.value.find(s => s.libraryId === payload.src.libraryId)
    if (!exists) {
      if (payload.index != null && payload.index !== -1) {
        soundLibrarySources.value.splice(payload.index, 0, payload.src)
      } else {
        soundLibrarySources.value.push(payload.src)
      }
    }

    // recreate old sound nodes with new blob
    payload.soundNodes?.forEach(s => {
      s.src.audioPath = blobUrl
      s.src.locked = s.src.locked ?? payload.src.locked
      s.src.base = s.src.base ?? payload.src.base
      s.src.plan_tier = s.src.plan_tier ?? payload.src.plan_tier
      s.src.bucket = s.src.bucket ?? payload.src.bucket
      s.src.path = s.src.path ?? payload.src.path
      const derivedStorage = s.src.storageKey ?? (s.src.bucket && s.src.path
        ? buildStorageKey(s.src.base ?? payload.src.base ?? 'users', s.src.bucket, s.src.path)
        : null)
      s.src.storageKey = derivedStorage
      s.src.fileId = s.src.fileId ?? s.src.libraryId ?? derivedStorage ?? s.src.audioPath ?? null
      audioEngine.value.addSoundSource(s)
    });
  }

  actionManager.value.registerActionHandlers('delete_draggable_sound_source',
    payload => deleteDraggableSoundSource(payload),
    async payload => await addDraggableSoundSource(payload)
  )
  
  actionManager.value.registerActionHandlers('add_draggable_sound_source',
    async payload => await addDraggableSoundSource(payload),
    payload => deleteDraggableSoundSource(payload),
  )
}

/**
 * Setup undoable actions for the draggable sound source list.
 */
function registerSchedulingActions() {
  const { actionManager } = storeToRefs(useActionManagerStore())

  const applyScheduleChanges = (src, params) => {
    if (src?.locked) return
    for (const key in params) {
      src.instance.state.schedule[key] = params[key];
    }
  };

  const updateSchedule = (payload) => {
    if (payload?.src?.locked) return
    const { src, changedParameters } = payload;
    applyScheduleChanges(src, JSON.parse(JSON.stringify(changedParameters)));
  };

  const revertSchedule = (payload) => {
    const { src, previousParameters } = payload;
    applyScheduleChanges(src, JSON.parse(JSON.stringify(previousParameters)));
  };

  actionManager.value.registerActionHandlers(
    'update_sound_source_schedule',
    updateSchedule,
    revertSchedule
  );

  
}
