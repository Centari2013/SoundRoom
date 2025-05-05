import { computed, toRaw, reactive } from 'vue'

export function useContextMenuLogic(selectedSource, stageWrapperRef, actionManager) {
  function showContextMenu(e) {
    e.evt.preventDefault()
    e.evt.stopPropagation()
    if (e.target.getAttr('name') === 'sound-node-part') {
      stageWrapperRef.value.contextMenuRef.show({ x: e.evt.clientX, y: e.evt.clientY })
    }
  }

  const contextMenuActions = [
    {
      label: computed(() =>
        selectedSource.value?.instance.playing ? 'Pause' : 'Play'
      ),
      function: () => {
        const inst = selectedSource.value.instance
        inst.playing ? inst.stop() : inst.play()
      },
    },
    {
      label: 'Delete',
      function: () => {
        actionManager.doAction('delete_canvas_sound_source', {
          index: selectedSource.value.index,
          src: selectedSource.value,
        })
        //stageWrapperRef.value.contextMenuRef.visible = false
      }
    },
    {
      label: 'Duplicate',
      function: () => {
        const {instance, ...rest} = selectedSource.value
        const state = reactive(structuredClone(toRaw(rest.state))) // copt state to new reactive obj
        rest.state = null // nullified to allow cloning
        const src = structuredClone(rest)
        src.state = state
        src.state.x += 5
        src.state.y += 5
        
        actionManager.doAction('add_canvas_sound_source', {
          index: null,
          src
        })
      }
    }
  ]

  return {
    showContextMenu,
    contextMenuActions,
  }
}

