import { computed } from 'vue'

export function useContextMenuLogic(selectedSource, contextMenuRef, actionManager) {
  function showContextMenu(e) {
    e.evt.preventDefault()
    e.evt.stopPropagation()
    if (e.target.getAttr('name') === 'sound-node-part') {
      contextMenuRef.value.show({ x: e.evt.clientX, y: e.evt.clientY })
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
        contextMenuRef.value.visible = false
      },
    },
  ]

  return {
    showContextMenu,
    contextMenuActions,
  }
}

