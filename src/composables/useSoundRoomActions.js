import downloadAudio from '@/utils/downloadAudio'

export function registerCanvasActions(audioEngine, actionManager, listener, soundLibrarySources) {
  const moveSoundSource = (src, coords) => {
    src.instance.state.x = coords.x
    src.instance.state.y = coords.y
    src.instance.updateAudio()
    listener.updateAudio()
  }
  //TODO: fix blob (src.audioPath) on delete and add
  actionManager.registerActionHandlers('add_canvas_sound_source',
    payload => {
      payload.src.audioPath = soundLibrarySources.value.find(s => s.libraryId === payload.src.libraryId).audioPath
      audioEngine.addSoundSource(payload)
      listener.updateAudio()
    },
    payload => {
      audioEngine.deleteSoundSource(payload)
      listener.updateAudio()
    }
  )

  actionManager.registerActionHandlers('delete_canvas_sound_source',
    payload => {
      audioEngine.deleteSoundSource(payload)
      listener.updateAudio()
    },
    payload => {
      audioEngine.addSoundSource(payload)
      listener.updateAudio()
    }
  )

  actionManager.registerActionHandlers('move_canvas_sound_source',
    payload => moveSoundSource(audioEngine.soundSources.value[payload.index], payload.to),
    payload => moveSoundSource(audioEngine.soundSources.value[payload.index], payload.from)
  )
}

export function registerDraggableActions(audioEngine, actionManager, soundLibrarySources) {
  const deleteDraggableSoundSource = (payload) => {
    // Remove from the source list UI
    const i = soundLibrarySources.value.findIndex(s => s.libraryId == payload.src.libraryId)
    payload.src = soundLibrarySources.value[i]
    soundLibrarySources.value.splice(i, 1)
    payload.index = i
  
    // Find all sound sources on the canvas with the same libraryId
    const matches = audioEngine.soundSources.value
      .map((aes, idx) => ({ aes, index: idx }))
      .filter(entry => entry.aes.libraryId === payload.src.libraryId)
  
      payload.soundNodes = []
      // Dispatch an action for each one to ensure undo/redo support
      for (const match of matches.reverse()) {
        // reverse to prevent index shift issues when modifying array
        
        const deletedNode = audioEngine.deleteSoundSource({ index: match.index, src: match.aes })
        payload.soundNodes.push({ index: match.index, src: deletedNode })
      }
  }

  const addDraggableSoundSource = async (payload) => {
    // download blob and renistate draggable source
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
      audioEngine.addSoundSource(s)
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