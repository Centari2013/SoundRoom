import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia, storeToRefs } from 'pinia'
import { useActionManagerStore } from '../../src/stores/useActionManagerStore.js'
import { useVolumeSlider } from '../../src/composables/useVolumeSlider.js'

let store
let selected
let actionRef

beforeEach(() => {
  setActivePinia(createPinia())
  store = useActionManagerStore()
  actionRef = storeToRefs(store).actionManager
  selected = ref({
    index: 0,
    instance: {
      _volume: 0.5,
      setVolume: vi.fn(function (v) { this._volume = v }),
      getVolume: vi.fn(function () { return this._volume })
    }
  })
})

describe('useVolumeSlider', () => {
  it('updates volume and registers action', async () => {
    const { onStart, onChange, onEnd } = useVolumeSlider(selected)
    onStart()
    onChange(0.8)
    expect(selected.value.instance.setVolume).toHaveBeenCalledWith(0.8)
    const spy = vi.spyOn(actionRef.value, 'doAction')
    onEnd()
    await nextTick()
    expect(spy).toHaveBeenCalledWith('set_sound_source_volume', expect.any(Object))
    const payload = spy.mock.calls[0][1]
    expect(payload.from).toBe(0.5)
    expect(payload.to).toBe(0.8)
  })
})
