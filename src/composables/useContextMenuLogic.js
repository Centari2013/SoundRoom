import { computed, toRaw, reactive } from 'vue'
import { useRoomStore } from '@/stores/useRoomStore'
import { storeToRefs } from 'pinia'
// Central constant for sound node part identifier
export const SOUND_NODE_PART_NAME = 'sound-node-part'

export function useContextMenuLogic(selectedSource, stageWrapperRef) {
  const roomStore = useRoomStore()
  const { actionManager } = storeToRefs(roomStore)

  function showContextMenu(e) {
    e.evt.preventDefault()
    e.evt.stopPropagation()
    if (e.target.getAttr('name') === SOUND_NODE_PART_NAME) { // if part of a konva SoundSourceNode.vue group
      stageWrapperRef.value.contextMenuRef.show({ x: e.evt.clientX, y: e.evt.clientY }) // show context menu
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
        const {instance, ...rest} = selectedSource.value
        const state = reactive(structuredClone(toRaw(rest.state))) // copy state to new reactive obj
        rest.state = null // nullified to allow cloning
        const src = structuredClone(rest)
        src.state = state
        src.state.x += 5
        src.state.y += 5

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

