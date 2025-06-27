import downloadAudio from '@/utils/downloadAudio'

export function registerCanvasActions(audioEngine, actionManager, listener, soundLibrarySources) {
  const moveSoundSource = (src, coords) => {
    src.instance.state.x = coords.x
    src.instance.state.y = coords.y
    src.instance.updateAudio()
    listener.value.updateAudio()
  }
  const addSoundSource = (payload) => {
    payload.src.audioPath = soundLibrarySources.value.find(s => s.libraryId === payload.src.libraryId).audioPath
    audioEngine.value.addSoundSource(payload)
    listener.value.updateAudio()
  }

  const deleteSoundSource = (payload) => {
    payload.src = audioEngine.value.deleteSoundSource(payload)
    listener.value.updateAudio()
  }

  actionManager.registerActionHandlers('add_canvas_sound_source',
    addSoundSource,
    deleteSoundSource
  )

  actionManager.registerActionHandlers('delete_canvas_sound_source',
    deleteSoundSource,
    addSoundSource
  )

  actionManager.registerActionHandlers('move_canvas_sound_source',
    payload => moveSoundSource(audioEngine.value.soundSources.value[payload.index], payload.to),
    payload => moveSoundSource(audioEngine.value.soundSources.value[payload.index], payload.from)
  )
}

let MAX_LIB_SOURCES = null
export function setMaxLibSources(limit){MAX_LIB_SOURCES = limit};
const maxLibSourcesReached = function(soundLibrarySources){
  if (MAX_LIB_SOURCES){
    if (soundLibrarySources.value.length == MAX_LIB_SOURCES){
      window.alert(`Limit of ${MAX_LIB_SOURCES} library source${MAX_LIB_SOURCES == 1 ? '' : 's'} reached.`)
      return true
    }
  }
  return false
}
export function registerDraggableActions(audioEngine, actionManager, soundLibrarySources) {
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


      URL.revokeObjectURL(originalSrc.audioPath)
    }

  
  const addDraggableSoundSource = async (payload) => {
    if (maxLibSourcesReached(soundLibrarySources)) return;
    // download blob and re-instate draggable source
    const { blobUrl } = await downloadAudio(payload.src.bucket, payload.src.path, false)
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

  actionManager.registerActionHandlers('delete_draggable_sound_source',
    payload => deleteDraggableSoundSource(payload),
    async payload => await addDraggableSoundSource(payload)
  )
  
  actionManager.registerActionHandlers('add_draggable_sound_source',
    async payload => await addDraggableSoundSource(payload),
    payload => deleteDraggableSoundSource(payload),
  )
}