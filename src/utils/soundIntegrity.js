import { supabase } from '@/utils/supabase'
import { useAuth } from '@/composables/useAuth'
import { useAudioCacheStore } from '@/stores/useAudioCacheStore'
import { useAudioEngineStore } from '@/stores/useAudioEngineStore'
import { storeToRefs } from 'pinia'

/**
 * Check whether a sound record still exists and is accessible.
 * Missing records imply the upload has been deleted.
 *
 * @param {string} soundId
 * @returns {Promise<boolean>}
 */
export async function isSoundAvailable(soundId) {
  if (!soundId) return false

  const { data, error } = await supabase
    .from('sound_files')
    .select('id')
    .eq('id', soundId)
    .single()

  if (error) {
    console.warn('Unable to verify sound availability:', error)
    return false
  }

  return Boolean(data?.id)
}

/**
 * Remove cached blobs and object URLs associated with a sound.
 *
 * @param {string} urlOrId
 * @returns {Promise<void>}
 */
export async function purgeSoundCache(urlOrId) {
  if (!urlOrId) return

  try {
    const cacheStore = useAudioCacheStore()
    cacheStore?.audioCacheManager?.value?.remove?.(urlOrId)
  } catch (err) {
    console.warn('Failed to purge audio cache entry:', err)
  }

  if (typeof urlOrId === 'string' && urlOrId.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(urlOrId)
    } catch (err) {
      console.warn('Unable to revoke object URL:', err)
    }
  }
}

/**
 * Remove references to a deleted sound from persisted rooms and
 * any currently loaded state.
 *
 * @param {string} soundId
 * @returns {Promise<{ updated: number, removedLocally: number }>} counts of changes applied
 */
export async function removeDeletedSoundFromRooms(soundId) {
  const { user } = useAuth()
  const cacheStore = useAudioCacheStore()
  const engineStore = useAudioEngineStore()
  const { soundLibrarySources } = storeToRefs(cacheStore)
  const { audioEngine } = storeToRefs(engineStore)

  // Clean up active state so the node disappears immediately
  let removedLocally = 0
  const localIndex = soundLibrarySources.value.findIndex(src => src.libraryId === soundId)
  if (localIndex !== -1) {
    soundLibrarySources.value.splice(localIndex, 1)
    removedLocally++
  }

  if (audioEngine.value?.soundSources?.value) {
    const currentSources = audioEngine.value.soundSources.value
    for (let i = currentSources.length - 1; i >= 0; i--) {
      if (currentSources[i]?.libraryId === soundId) {
        audioEngine.value.deleteSoundSource({ index: i, src: currentSources[i] })
        removedLocally++
      }
    }
  }

  // Update any locally cached room draft
  const stored = localStorage.getItem('tempSoundRoomData')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      const { roomData: cleanedDraft, removed } = stripSoundFromRoom(parsed, soundId)
      if (removed > 0) {
        localStorage.setItem('tempSoundRoomData', JSON.stringify(cleanedDraft))
      }
    } catch (err) {
      console.warn('Unable to clean local draft after deletion:', err)
    }
  }

  // If the user is not signed in we cannot touch saved rooms
  if (!user.value?.id) return { updated: 0, removedLocally }

  const { data, error } = await supabase
    .from('rooms')
    .select('id, room_config')
    .eq('owner_id', user.value.id)

  if (error) {
    console.error('Failed to clean rooms after sound deletion:', error)
    return { updated: 0, removedLocally }
  }

  let updated = 0
  const rooms = data ?? []

  for (const room of rooms) {
    const { roomData: cleanedConfig, removed } = stripSoundFromRoom(room.room_config, soundId)
    if (removed > 0) {
      updated++
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ room_config: cleanedConfig })
        .eq('id', room.id)
      if (updateError) {
        console.warn('Unable to update room after removing deleted sound:', updateError)
      }
    }
  }

  return { updated, removedLocally }
}

/**
 * Remove a single sound reference from a room configuration.
 *
 * @param {Object} roomConfig
 * @param {string} soundId
 * @returns {{ roomData: Object, removed: number }}
 */
export function stripSoundFromRoom(roomConfig, soundId) {
  if (!roomConfig || !soundId) {
    return { roomData: roomConfig, removed: 0 }
  }

  const currentLibrary = roomConfig.soundLibrarySources ?? []
  const currentEngineSources = roomConfig.audioEngine?.soundSources ?? []
  const currentTimelineClips = roomConfig.audioEngine?.timeline?.clips ?? []

  const filteredLibrary = currentLibrary.filter(src => src.libraryId !== soundId)
  const filteredEngine = currentEngineSources.filter(src => src.libraryId !== soundId)
  const removedSourceIds = new Set(
    currentEngineSources
      .filter(src => src.libraryId === soundId)
      .map(src => src.instance?.state?.schedule?.id)
      .filter(Boolean)
  )
  const filteredClips = currentTimelineClips.filter(clip => !removedSourceIds.has(clip.sourceId))

  const removed = (currentLibrary.length - filteredLibrary.length)
    + (currentEngineSources.length - filteredEngine.length)
    + (currentTimelineClips.length - filteredClips.length)

  return {
    roomData: {
      ...roomConfig,
      soundLibrarySources: filteredLibrary,
      audioEngine: {
        ...(roomConfig.audioEngine ?? {}),
        soundSources: filteredEngine,
        timeline: {
          ...(roomConfig.audioEngine?.timeline ?? {}),
          clips: filteredClips
        }
      }
    },
    removed
  }
}

/**
 * Filter a room configuration so that only sounds present in `availableIds`
 * remain. This is used when hydrating rooms to drop deleted or missing uploads.
 *
 * @param {Object} roomConfig
 * @param {Set<string>} availableIds
 * @returns {{ roomData: Object, removed: number }}
 */
export function filterRoomByAvailableSounds(roomConfig, availableIds) {
  if (!roomConfig) {
    return { roomData: roomConfig, removed: 0 }
  }

  // When no ids are available we remove all sources to prevent stale nodes
  const allowAll = availableIds && availableIds.size > 0
  const predicate = allowAll
    ? (src) => availableIds.has(src.libraryId)
    : () => false

  const currentLibrary = roomConfig.soundLibrarySources ?? []
  const currentEngineSources = roomConfig.audioEngine?.soundSources ?? []
  const currentTimelineClips = roomConfig.audioEngine?.timeline?.clips ?? []

  const filteredLibrary = currentLibrary.filter(predicate)
  const filteredEngine = currentEngineSources.filter(predicate)
  const retainedSourceIds = new Set(
    filteredEngine
      .map(src => src.instance?.state?.schedule?.id)
      .filter(Boolean)
  )
  const filteredClips = currentTimelineClips.filter(clip => retainedSourceIds.has(clip.sourceId))

  const removed = (currentLibrary.length - filteredLibrary.length)
    + (currentEngineSources.length - filteredEngine.length)
    + (currentTimelineClips.length - filteredClips.length)

  return {
    roomData: {
      ...roomConfig,
      soundLibrarySources: filteredLibrary,
      audioEngine: {
        ...(roomConfig.audioEngine ?? {}),
        soundSources: filteredEngine,
        timeline: {
          ...(roomConfig.audioEngine?.timeline ?? {}),
          clips: filteredClips
        }
      }
    },
    removed
  }
}
