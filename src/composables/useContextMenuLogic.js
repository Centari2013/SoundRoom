import { computed, reactive } from 'vue'
import { useRoomStore } from '@/stores/useRoomStore'
import { useCanvasStore } from '@/stores/useCanvasStore'
import { storeToRefs } from 'pinia'
// Central constant for sound node part identifier
export const SOUND_NODE_PART_NAME = 'sound-node-part'

export function useContextMenuLogic(selectedSource) {
  const roomStore = useRoomStore()
  const { actionManager } = storeToRefs(roomStore)
  const canvasStore = useCanvasStore()
  function showContextMenu(e) {
    e.evt.preventDefault()
    e.evt.stopPropagation()
    if (e.target.getAttr('name') === SOUND_NODE_PART_NAME) { // if part of a konva SoundSourceNode.vue group
      canvasStore.stageDivRef.contextMenuRef.show({ x: e.evt.clientX, y: e.evt.clientY }) // show context menu
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
        actionManager.value.doAction('delete_canvas_sound_source', {
          index: selectedSource.value.index,
          src: selectedSource.value,
        })
      }
    },
    {
      label: 'Duplicate',
      function: () => {
        const src = {
          // shallow copy of simple fields
          audioPath: selectedSource.value.audioPath,
          name: selectedSource.value.name,
          libraryId: selectedSource.value.libraryId,
          // copy reactive state manually
          state: reactive({
            x: selectedSource.value.state.x + 5,
            y: selectedSource.value.state.y + 5,
            angle: selectedSource.value.state.angle,
            coneInner: selectedSource.value.state.coneInner,
            coneOuter: selectedSource.value.state.coneOuter,
          })
        }

        actionManager.value.doAction('add_canvas_sound_source', {
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

