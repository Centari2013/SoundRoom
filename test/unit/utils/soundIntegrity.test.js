import { describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase', () => ({ supabase: {} }))
vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ user: { value: null } }) }))
vi.mock('@/stores/useAudioCacheStore', () => ({ useAudioCacheStore: () => ({}) }))
vi.mock('@/stores/useAudioEngineStore', () => ({ useAudioEngineStore: () => ({}) }))
vi.mock('pinia', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, storeToRefs: (store) => store }
})

const { filterRoomByAvailableSounds, stripSoundFromRoom } = await import('@/utils/soundIntegrity')

function roomConfig() {
  return {
    soundLibrarySources: [
      { libraryId: 'keep' },
      { libraryId: 'remove' },
    ],
    audioEngine: {
      soundSources: [
        { libraryId: 'keep', instance: { state: { schedule: { id: 'clip-keep' } } } },
        { libraryId: 'remove', instance: { state: { schedule: { id: 'clip-remove' } } } },
      ],
      timeline: {
        clips: [
          { id: 'a', sourceId: 'clip-keep' },
          { id: 'b', sourceId: 'clip-remove' },
        ],
      },
    },
  }
}

describe('soundIntegrity', () => {
  it('removes deleted sounds from library, engine, and dependent timeline clips', () => {
    const { roomData, removed } = stripSoundFromRoom(roomConfig(), 'remove')

    expect(removed).toBe(3)
    expect(roomData.soundLibrarySources).toEqual([{ libraryId: 'keep' }])
    expect(roomData.audioEngine.soundSources).toHaveLength(1)
    expect(roomData.audioEngine.timeline.clips).toEqual([{ id: 'a', sourceId: 'clip-keep' }])
  })

  it('keeps only available sounds and timeline clips tied to retained sources', () => {
    const { roomData, removed } = filterRoomByAvailableSounds(roomConfig(), new Set(['keep']))

    expect(removed).toBe(3)
    expect(roomData.soundLibrarySources.map(src => src.libraryId)).toEqual(['keep'])
    expect(roomData.audioEngine.soundSources.map(src => src.libraryId)).toEqual(['keep'])
    expect(roomData.audioEngine.timeline.clips.map(clip => clip.sourceId)).toEqual(['clip-keep'])
  })

  it('removes all sounds when no availability set is populated', () => {
    const { roomData, removed } = filterRoomByAvailableSounds(roomConfig(), new Set())

    expect(removed).toBe(6)
    expect(roomData.soundLibrarySources).toEqual([])
    expect(roomData.audioEngine.soundSources).toEqual([])
    expect(roomData.audioEngine.timeline.clips).toEqual([])
  })
})
