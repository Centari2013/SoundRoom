import { useRoomStore } from "@/stores/useRoomStore";
import { useListenerStore } from "@/stores/useListenerStore";
import { useAudioEngineStore } from "@/stores/useAudioEngineStore";
import { useAudioCacheStore } from "@/stores/useAudioCacheStore";
import { useActionManagerStore } from "@/stores/useActionManagerStore";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { storeToRefs } from "pinia";
import Room from '@/lib/Room'
import Listener from '@/lib/Listener'
import AudioEngine from '@/lib/AudioEngine'


import { resetRoomState } from "@/utils/resetRoomState";
import { supabase } from "@/utils/supabase";
import { downloadMultipleAudio, buildStorageKey } from "@/utils/downloadAudio";
import { useAuth } from "@/composables/useAuth";
import { ref } from "vue";
import { useEntitlements } from '@/composables/useEntitlements'
import { annotateSoundAccess } from '@/utils/soundEntitlements'
import { filterRoomByAvailableSounds } from '@/utils/soundIntegrity'

const isLoadingRoom = ref(false)
const isSavingRoom = ref(false)

/**
 * Manage saving and loading of rooms from Supabase or local storage.
 * Provides helper functions and reactive flags used across the app.
 *
 * @returns {{
 *   saveRoom: Function,
 *   loadRoom: Function,
 *   deleteRoom: Function,
 *   isLoadingRoom: import('vue').Ref<boolean>,
 *   saveRoomLocal: Function,
 *   loadRoomLocal: Function,
 *   isSavingRoom: import('vue').Ref<boolean>,
 *   updateRoomName: Function
 * }}
 */
export function useSaveAndLoadRoom() {
  const { user, tier } = useAuth();
  const roomStore = useRoomStore();
  const listenerStore = useListenerStore();
  const audioEngineStore = useAudioEngineStore();
  const cacheStore = useAudioCacheStore();
  const actionStore = useActionManagerStore();
  const canvasStore = useCanvasStore();
  const { room } = storeToRefs(roomStore);
  const { listener } = storeToRefs(listenerStore);
  const { audioEngine } = storeToRefs(audioEngineStore);
  const { soundLibrarySources } = storeToRefs(cacheStore);
  const { requireWithinLimit, canAccess } = useEntitlements()

  function stopAllAudioForRoomChange() {
    try {
      audioEngineStore.resetAudioEngine()
    } catch (error) {
      console.warn('Failed to clear previous audio runtime before room transition:', error)
    }
  }

  function applyTimelineAccess(roomData) {
    const timeline = roomData?.audioEngine?.timeline
    if (!timeline) return roomData

    timeline.enabled = canAccess('timelineScheduler')
    return roomData
  }

  /**
   * Persist the current room to Supabase. Handles insert or update logic
   * depending on whether the room already has an id.
   *
   * @returns {boolean} true when the save operation is initiated
   */
  async function saveRoom() {
    if (!user.value?.id) {
      console.warn('Attempted to save a room without an authenticated user.')
      return false
    }

    const isExistingRoom = Boolean(room.value.id)

    if (!isExistingRoom) {
      const withinLimit = await ensureSaveLimit()
      if (!withinLimit) return false
    }

    isSavingRoom.value = true
    const roomData = roomStore.getSaveSnapshot()

    try {
      if (isExistingRoom) {
        return await updateRoom(roomData)
      }
      return await insertRoom(roomData)
    } finally {
      setTimeout(() => {
        isSavingRoom.value = false
      }, 2000)
    }
  }

  /**
   * Update an existing room entry in Supabase.
   *
   * @param {Object} roomData - serialized room data
   */
  async function updateRoom(roomData) {
    const { data, error } = await supabase
      .from('rooms')
      .update({
        name: room.value.name.value,
        room_config: roomData,
        thumbnail: canvasStore.getThumbnailURI()
      })
      .eq('id', room.value.id)
      .select('id')
      .single()

    if (error) {
      console.error('Error updating room:', error)
      return false
    }

    room.value.id = data.id
    roomStore.commitRoomName(room.value.id, room.value.name)

    return true
  }

  /**
   * Update the name of a room in Supabase.
   *
   * @param {number|string} roomId - id of the room to update
   * @param {string} name - new room name
   * @returns {Promise<boolean>} resolves to true if successful
   */
  async function updateRoomName(roomId, name) {
    const { error } = await supabase
      .from("rooms")
      .update({ name })
      .eq("id", roomId)

    if (error) {
      console.error("Error updating room:", error)
      return false
    }

    roomStore.commitRoomName(roomId, name)

    return true
  }


  /**
   * Insert a new room entry in Supabase.
   *
   * @param {Object} roomData - serialized room data
   */
  async function insertRoom(roomData) {
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        owner_id: user.value.id,
        name: room.value.name.value,
        room_config: roomData,
        thumbnail: canvasStore.getThumbnailURI()
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error inserting room:', error)
      return false
    }

    room.value.id = data.id
    roomStore.commitRoomName(room.value.id, room.value.name)

    return true
  }
  
  async function ensureSaveLimit() {
    const count = await fetchSavedRoomCount()
    return requireWithinLimit('maxSavedRooms', count, {
      title: 'Saved room limit reached'
    })
  }

  async function fetchSavedRoomCount() {
    const { count, error } = await supabase
      .from('rooms')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.value.id)

    if (error) {
      console.error('Error counting rooms:', error)
      return 0
    }

    return count ?? 0
  }

  /**
   * Get room data from Supabase by id.
   * @returns {<Object>} room data object
   * @throws {Error} if room not found or other error occurs
   */
  async function getRoomDataById(roomId=null) {
    if (roomId){
      return await supabase
      .from("rooms")
      .select("id, room_config, name")
      .eq("id", roomId)
      .single();
    } else {
      return await supabase
      .from("rooms")
      .select("id, room_config, name")
      .eq("owner_id", user.value.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    }

  }

  /**
   * Load most recent room for the authenticated user.
   * If no room is found, it will return false.
   */
  async function loadMostRecentRoom() {
    return await loadRoom();
  }

  /**
   * Load a room from Supabase and hydrate stores with the data.
   *
   * @param {number|string} roomId - id of the room to load
   * @returns {Promise<boolean>} whether the load succeeded
   */
  async function loadRoom(roomId=null) {
    if (!roomId && !user.value?.id) {
      console.warn("Cannot load most recent room without an authenticated user.")
      return false
    }

    isLoadingRoom.value = true;
    canvasStore.resetRenderedSoundSourceCount()
    stopAllAudioForRoomChange()
    // get room data from supabase
    const { data, error } = await getRoomDataById(roomId);
    if (!data) {
      console.warn("No room data found.");
      isLoadingRoom.value = false;
      return false;
    }
    if (error) {
      console.error("Error loading room:", error);
      isLoadingRoom.value = false;
      return false;
    }
    
    let roomData = data.room_config;
    const resolvedRoomId = data?.id ?? (roomId ?? roomData?.room?.id ?? null);
    roomData.room.id = resolvedRoomId; // Set the room ID from the database
    roomData.room.name = data.name; // Set the room name from the database
    const ids = roomData?.soundLibrarySources?.map(s => s.libraryId) ?? [];
    const { annotated: dbSounds, accessible: accessibleSounds, lockedIds, missingIds } = await getSoundsFromDB(ids);
    const accessContext = {
      userTier: tier.value,
      userId: user.value?.id,
      canUpload: canAccess('canUpload')
    }
    const { successes: downloaded, failedIds } = await downloadMultipleAudio(accessibleSounds);

    const downloadedMap = new Map(downloaded.map(entry => [entry.id, entry.audioPath]));
    const availableIds = new Set([...downloaded.map(entry => entry.id), ...lockedIds]);
    const { roomData: cleanedRoom, removed } = filterRoomByAvailableSounds(roomData, availableIds)
    roomData = cleanedRoom

    const finalSources = roomData.soundLibrarySources.map(({ libraryId }) => {
      const soundMatch = dbSounds.find(d => d.id === libraryId);
      const annotatedAccess = soundMatch ? soundMatch : null
      const audioPath = annotatedAccess?.locked ? null : downloadedMap.get(libraryId);

      const coneInner = roomData.audioEngine.soundSources.find(src => src.libraryId === libraryId)?.state?.coneInner ?? soundMatch?.coneInner ?? 60;
      const coneOuter = roomData.audioEngine.soundSources.find(src => src.libraryId === libraryId)?.state?.coneOuter ?? soundMatch?.coneOuter ?? 180;

      if ((!audioPath && !soundMatch?.locked) || !soundMatch) {
        console.warn(`Missing data for libraryId ${libraryId}`);
        return null; // or skip it entirely if you'd prefer
      }

      const planTier = soundMatch?.plan_tier
      const base = soundMatch?.base ?? planTier ?? 'users'
      const storageKey = soundMatch?.bucket && soundMatch?.path
        ? buildStorageKey(base, soundMatch.bucket, soundMatch.path)
        : null

      const nextSource = {
        libraryId,
        audioPath,
        coneInner,
        coneOuter,
        name: soundMatch.name,
        bucket: soundMatch.bucket,
        path: soundMatch.path,
        plan_tier: planTier,
        base,
        storageKey,
        fileId: libraryId ?? storageKey
      }

      applyAccessMetadata(nextSource, annotatedAccess, accessContext)

      return nextSource
    }).filter(Boolean); // remove nulls if any
    soundLibrarySources.value = finalSources;

    const missingUploadCount = missingIds.length + failedIds.length
    if (lockedIds.length > 0) {
      console.info(`Kept ${lockedIds.length} locked sound(s) visible while loading room.`)
    }
    if (removed > 0 && missingUploadCount === 0 && lockedIds.length === 0) {
      console.info(`Removed ${removed} unavailable sound source(s) while loading room.`)
    }
    if (missingUploadCount > 0) {
      window.alert('1 or more sources were removed because the upload no longer exists.')
    }


    roomData.audioEngine.soundSources.forEach(src => {
      const match = finalSources.find(a => String(a.libraryId) === String(src.libraryId));
      if (match) {
        src.audioPath = match.audioPath;
        src.name = match.name;
        src.bucket = match.bucket;
        src.path = match.path;
        src.plan_tier = match.plan_tier;
        src.base = match.base;
        src.storageKey = match.storageKey;
        src.fileId = match.fileId;
        applyAccessMetadata(src, match, accessContext)
      } else {
        applyAccessMetadata(src, null, accessContext)
      }
    });
    
    //resetRoomState();

    roomStore.loadRoom(roomData.room);
    if (!room.value.id) {
      room.value.id = resolvedRoomId;
    }
    listenerStore.loadListener(roomData.listener);
    applyTimelineAccess(roomData)
    audioEngineStore.loadAudioEngine(roomData.audioEngine);

    try {
      await setupLoadedRoomAudio()
    } finally {
      isLoadingRoom.value = false;
    }

    return true;
  }

  /**
   * Remove a room from Supabase by id.
   *
   * @param {number|string} roomId - room identifier
   * @returns {Promise<boolean>} true if deletion succeeded
   */
  async function deleteRoom(roomId) {
    if (String(room.value?.id ?? '') === String(roomId ?? '')) {
      stopAllAudioForRoomChange()
      resetRoomState()
    }

    const { error, statusText } = await supabase
      .from("rooms")
      .delete()
      .eq("id", roomId)

    if (error) {
      console.error("Error deleting room:", error);
      return false
    } 
    
    return true;
  }

  /**
   * Fetch sound file metadata for a set of library ids.
   *
   * @param {Array<number|string>} ids - ids to fetch
   * @returns {Promise<Array>} list of sound records
   */
  async function getSoundsFromDB(ids) {
    if (!ids?.length) return { annotated: [], accessible: [], lockedIds: [], missingIds: [] }

    const { data, error } = await supabase
      .from("sound_files")
      .select()
      .in("id", ids);

    if (error) {
      console.warn("Failed to list files:", error);
      return { annotated: [], accessible: [], lockedIds: [], missingIds: ids }
    }

    const context = {
      userTier: tier.value,
      userId: user.value?.id,
      canUpload: canAccess('canUpload')
    }

    const annotated = (data ?? []).map(sound => annotateSoundAccess(sound, context))
    const lockedEntries = annotated.filter(sound => sound.locked)
    const accessible = annotated.filter(sound => !sound.locked)
    const missingIds = ids.filter(id => !annotated.find(sound => sound.id === id))

    if (lockedEntries.length > 0) {
      console.info(`Preserved ${lockedEntries.length} locked sound(s) due to plan entitlements.`)
    }

    return { annotated, accessible, lockedIds: lockedEntries.map(sound => sound.id), missingIds }
  }

  function applyAccessMetadata(source, annotatedSound, context) {
    const access = annotatedSound ? annotatedSound : annotateSoundAccess(source, context)

    source.locked = !!access.locked
    source.accessReason = access.accessReason
    source.requiredPlan = access.requiredPlan
    source.entitlementFeature = access.entitlementFeature
    source.canUpgrade = access.canUpgrade
    source.base = source.base ?? access.base ?? source.plan_tier ?? 'users'
  }

  async function setupLoadedRoomAudio() {
    audioEngineStore.setupAudioContext({ deferScheduling: true })
    const preloadResult = await audioEngineStore.preloadAudioBuffers()

    if (preloadResult?.failed?.length) {
      console.warn(
        `Loaded room with ${preloadResult.failed.length} sound source(s) that could not be preloaded.`
      )
    }

    const expectedCanvasSources = audioEngine.value?.soundSources?.value?.length ?? 0
    const canvasReady = await canvasStore.waitForRenderedSoundSources(expectedCanvasSources)
    if (!canvasReady) return preloadResult

    audioEngineStore.startDeferredScheduling()
    return preloadResult
  }

  /**
   * Persist the current room to browser localStorage for offline usage.
   */
  function saveRoomLocal() {
    isSavingRoom.value = true;
    const roomData = roomStore.getSaveSnapshot();
    localStorage.setItem("tempSoundRoomData", JSON.stringify(roomData));
    setTimeout(() => {
      isSavingRoom.value = false;
    }, 2000);
  }

  /**
   * Load the room configuration from localStorage if present.
   * @returns {Promise<void>}
   */
  async function loadRoomLocal() {
    isLoadingRoom.value = true;
    canvasStore.resetRenderedSoundSourceCount()
    stopAllAudioForRoomChange()
    const stored = localStorage.getItem("tempSoundRoomData");
    if (!stored) {
      console.warn("No room data found in local storage.");
      isLoadingRoom.value = false;
      return false
    } else {
      let roomData = JSON.parse(stored);
      const ids = roomData.soundLibrarySources.map(s => s.libraryId);
      const { annotated: dbSounds, accessible: accessibleSounds, lockedIds, missingIds } = await getSoundsFromDB(ids);
      const accessContext = {
        userTier: tier.value,
        userId: user.value?.id,
        canUpload: canAccess('canUpload')
      }
      const { successes: downloaded, failedIds } = await downloadMultipleAudio(accessibleSounds);

      const downloadedMap = new Map(downloaded.map(entry => [entry.id, entry.audioPath]));
      const availableIds = new Set([...downloaded.map(entry => entry.id), ...lockedIds]);
      const { roomData: cleanedRoom, removed } = filterRoomByAvailableSounds(roomData, availableIds)
      roomData = cleanedRoom

      const finalSources = roomData.soundLibrarySources.map(({ libraryId }) => {
        const soundMatch = dbSounds.find(d => d.id === libraryId);
        const annotatedAccess = soundMatch ? soundMatch : null
        const audioPath = annotatedAccess?.locked ? null : downloadedMap.get(libraryId);
        const name = soundMatch?.name;
        const bucket = soundMatch?.bucket;
        const path = soundMatch?.path;
        const planTier = soundMatch?.plan_tier;
        const base = soundMatch?.base ?? planTier ?? 'users';
        const storageKey = bucket && path ? buildStorageKey(base, bucket, path) : null;
        const coneInner = roomData.audioEngine.soundSources.find(src => src.libraryId === libraryId)?.state?.coneInner ?? soundMatch?.coneInner ?? 60;
        const coneOuter = roomData.audioEngine.soundSources.find(src => src.libraryId === libraryId)?.state?.coneOuter ?? soundMatch?.coneOuter ?? 180;
        if ((!audioPath && !soundMatch?.locked) || !soundMatch) console.warn(`Missing audioPath for libraryId ${libraryId}`);
        if ((!audioPath && !soundMatch?.locked) || !soundMatch) return null
        const nextSource = {
          libraryId,
          audioPath,
          name,
          path,
          bucket,
          coneInner,
          coneOuter,
          plan_tier: planTier,
          base,
          storageKey,
          fileId: libraryId ?? storageKey,
        }

        applyAccessMetadata(nextSource, annotatedAccess, accessContext)

        return nextSource;
      }).filter(Boolean);

      soundLibrarySources.value = finalSources;

      const missingUploadCount = missingIds.length + failedIds.length
      if (lockedIds.length > 0) {
        console.info(`Kept ${lockedIds.length} locked sound(s) visible while loading room.`)
      }
      if (removed > 0 && missingUploadCount === 0 && lockedIds.length === 0) {
        console.info(`Removed ${removed} unavailable sound source(s) while loading room.`)
      }
      if (missingUploadCount > 0) {
        window.alert('1 or more sources were removed because the upload no longer exists.')
      }

      roomData.audioEngine.soundSources.forEach(src => {
        const match = finalSources.find(a => String(a.libraryId) === String(src.libraryId));
        if (match) {
          src.audioPath = match.audioPath;
          src.name = match.name;
          src.bucket = match.bucket;
          src.path = match.path;
          src.plan_tier = match.plan_tier;
          src.base = match.base;
          src.storageKey = match.storageKey;
          src.fileId = match.fileId;
          applyAccessMetadata(src, match, accessContext)
        } else {
          applyAccessMetadata(src, null, accessContext)
        }
      });

      resetRoomState();

      room.value = Room.fromJSON(roomData.room);
      listener.value = Listener.fromJSON(roomData.listener);
      applyTimelineAccess(roomData)
      audioEngine.value = AudioEngine.fromJSON(roomData.audioEngine);

      await setupLoadedRoomAudio()
    }
    localStorage.removeItem("tempSoundRoomData");
    isLoadingRoom.value = false;

    return true
  }
  return {
    saveRoom,
    loadRoom,
    loadMostRecentRoom,
    deleteRoom,
    isLoadingRoom,
    saveRoomLocal,
    loadRoomLocal,
    isSavingRoom,
    updateRoomName,
  };
}
