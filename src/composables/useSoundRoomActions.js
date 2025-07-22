import downloadAudio from '@/utils/downloadAudio'
import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { useListenerStore } from '@/stores/useListenerStore'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { storeToRefs } from 'pinia'
import { toRaw } from 'vue'

let actionsRegistered = false

/**
 * Register all SoundRoom related undoable actions.
 */
export function registerSoundRoomActions() {
  if (actionsRegistered) return
  registerCanvasActions()
  registerDraggableActions()
  registerSchedulingActions()
  actionsRegistered = true
}

/**
 * Unregister previously registered SoundRoom actions.
 */
export function unregisterSoundRoomActions() {
  if (!actionsRegistered) return
  const { actionManager } = storeToRefs(useActionManagerStore())
  actionManager.value.unregisterActionHandlers([
    'add_canvas_sound_source',
    'delete_canvas_sound_source',
    'move_canvas_sound_source',
    'delete_draggable_sound_source',
    'add_draggable_sound_source'
  ])
  actionsRegistered = false
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
  const addSoundSource = (payload) => {
    payload.src.audioPath = soundLibrarySources.value.find(s => s.libraryId === payload.src.libraryId).audioPath
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
    listener.value.updateAudio()
  }

  actionManager.value.registerActionHandlers('add_canvas_sound_source',
    addSoundSource,
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

let MAX_LIB_SOURCES = null

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
    // download blob and re-instate draggable source
    const { blobUrl } = await downloadAudio(
      payload.src.bucket,
      payload.src.path,
      false,
      null,
      payload.src.libraryId
    )
    payload.src.audioPath = blobUrl
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
    console.log('Applying schedule changes:', params);
    for (const key in params) {
      src.instance.state.schedule[key] = params[key];
    }
  };

  const updateSchedule = (payload) => {
    const { src, changedParameters } = payload;
    applyScheduleChanges(src, JSON.parse(JSON.stringify(changedParameters)));
    console.log('Updated schedule:', src.instance.state.schedule);
  };

  const revertSchedule = (payload) => {
    console.log('Reverting schedule changes:', payload);
    const { src, previousParameters } = payload;
    applyScheduleChanges(src, JSON.parse(JSON.stringify(previousParameters)));
    console.log('Reverted schedule:', src.instance.state.schedule);
  };

  actionManager.value.registerActionHandlers(
    'update_sound_source_schedule',
    updateSchedule,
    revertSchedule
  );

  
}
