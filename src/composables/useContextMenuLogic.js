import { computed, reactive } from 'vue'
import { useActionManagerStore } from '@/stores/useActionManagerStore'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { useCanvasStore } from '@/stores/useCanvasStore'
import { storeToRefs } from 'pinia'
// Central constant for sound node part identifier
export const SOUND_NODE_PART_NAME = 'sound-node-part'

/**
 * Provide context menu behaviour for sound source nodes on the canvas.
 *
 * @param {import('vue').Ref<Object|null>} selectedSource - currently selected source
 * @returns {{showContextMenu: Function, contextMenuActions: Array}}
 */
export function useContextMenuLogic(selectedSource) {
  const actionStore = useActionManagerStore()
  const audioEngineStore = useAudioEngineStore()
  const { actionManager } = storeToRefs(actionStore)
  const canvasStore = useCanvasStore()
  /**
   * Display the context menu when the user right-clicks a sound node.
   *
   * @param {import('vue').KonvaEventObject<MouseEvent>} e - Konva event wrapper
   */
  function showContextMenu(e) {
    e.evt.preventDefault()
    e.evt.stopPropagation()
    if (e.target.getAttr('name') === SOUND_NODE_PART_NAME) { // if part of a konva SoundSourceNode.vue group
      canvasStore.contextMenuRef?.value?.show({ x: e.evt.clientX, y: e.evt.clientY }) // show context menu
    }
  }

  const contextMenuActions = [
    {
      label: computed(() =>
        selectedSource.value?.instance.playing ? 'Pause' : 'Play'
      ),
      function: () => {
        const src = selectedSource.value;
        src.playing ? audioEngineStore.pauseSoundSource(src) : audioEngineStore.playSoundSource(src);
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

