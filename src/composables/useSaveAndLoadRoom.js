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

import { supabase } from "@/utils/supabase";
import { downloadMultipleAudio } from "@/utils/downloadAudio";
import { useAuth } from "@/composables/useAuth";
import { ref } from "vue";

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
  const isLoadingRoom = ref(false);
  const isSavingRoom = ref(false);
  const { user } = useAuth();
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
  const { actionManager } = storeToRefs(actionStore);

  /**
   * Persist the current room to Supabase. Handles insert or update logic
   * depending on whether the room already has an id.
   *
   * @returns {boolean} true when the save operation is initiated
   */
  function saveRoom() {
    isSavingRoom.value = true;
    const roomData = roomStore.getSaveSnapshot();
    // if room.id in room table, update it
    //otherwise, insert a new room
    if (room.value.id) {
      updateRoom(roomData);
    } else {
      insertRoom(roomData);
    }
    setTimeout(() => {
      isSavingRoom.value = false;
    }, 2000);

    return true; // Indicate that the save operation was initiated
  }

  /**
   * Update an existing room entry in Supabase.
   *
   * @param {Object} roomData - serialized room data
   */
  function updateRoom(roomData) {
    supabase
      .from("rooms")
      .update({
        name: room.value.name,
        room_config: roomData,
        thumbnail: canvasStore.getThumbnailURI() // Get the thumbnail URI from the canvas store
      })
      .eq("id", room.value.id)
      .select("id") // Ensure we get the updated ID back
      .then(({ data, error }) => {
        if (error) {
          console.error("Error updating room:", error);
        } else {
          room.value.id = data[0].id; // Update the room ID with the returned ID
          roomStore.commitRoomName(room.value.id, room.value.name)
        }
      });
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
  function insertRoom(roomData) {
    supabase
      .from("rooms")
      .insert({
        owner_id: user.value.id,
        name: room.value.name,
        room_config: roomData,
        thumbnail: canvasStore.getThumbnailURI() // Get the thumbnail URI from the canvas store
      })
      .select("id") // Ensure we get the inserted ID back
      .single() // We expect a single row back
      .then(({ data: id, error }) => {
        if (error) {
          console.error("Error inserting room:", error);
        } else {
          room.value.id = id; // Update the room ID with the returned ID
          roomStore.commitRoomName(room.value.id, room.value.name)
        }
      });
  }

  /**
   * Load a room from Supabase and hydrate stores with the data.
   *
   * @param {number|string} roomId - id of the room to load
   * @returns {Promise<boolean>} whether the load succeeded
   */
  async function loadRoom(roomId) {
    isLoadingRoom.value = true;
    // get room data from supabase
    const { data, error } = await supabase
      .from("rooms")
      .select("room_config, name")
      .eq("id", roomId)
      .single();
    if (error) {
      console.error("Error loading room:", error);
      isLoadingRoom.value = false;
      return false;
    }
    
    const roomData = data.room_config;
    roomData.room.id = roomId; // Set the room ID from the database
    roomData.room.name = data.name; // Set the room name from the database
    const ids = roomData.soundLibrarySources.map(s => s.libraryId);
    const dbSounds = await getSoundsFromDB(ids);
    const downloaded = await downloadMultipleAudio(dbSounds);

    const finalSources = ids.map(id => {
      const audioPath = downloaded.find(p => p.id === id)?.audioPath;
      const soundMatch = dbSounds.find(d => d.id === id);

      const coneInner = roomData.audioEngine.soundSources.find(src => src.libraryId === id)?.state?.coneInner ?? soundMatch?.coneInner ?? 60;
      const coneOuter = roomData.audioEngine.soundSources.find(src => src.libraryId === id)?.state?.coneOuter ?? soundMatch?.coneOuter ?? 180;

      if (!audioPath || !soundMatch) {
        console.warn(`Missing data for libraryId ${id}`);
        return null; // or skip it entirely if you'd prefer
      }

      return {
        libraryId: id,
        audioPath,
        coneInner,
        coneOuter,
        name: soundMatch.name,
        bucket: soundMatch.bucket,
        path: soundMatch.path
      };
    }).filter(Boolean); // remove nulls if any

    soundLibrarySources.value = finalSources;


    roomData.audioEngine.soundSources.forEach(src => {
      const match = finalSources.find(a => a.libraryId === src.libraryId);
      if (match) {
        src.audioPath = match.audioPath;
        src.name = match.name;
      }
    });
    
    actionManager.value.clearHistory();

    audioEngine.value.dispose();
    listener.value.dispose();

    roomStore.loadRoom(roomData.room);
    listenerStore.loadListener(roomData.listener);
    audioEngineStore.loadAudioEngine(roomData.audioEngine);

    audioEngineStore.setupAudioContext();
    
    setTimeout(() => {
      isLoadingRoom.value = false;
    }, 2000);

    return true;
  }

  /**
   * Remove a room from Supabase by id.
   *
   * @param {number|string} roomId - room identifier
   * @returns {Promise<boolean>} true if deletion succeeded
   */
  async function deleteRoom(roomId) {

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
    const { data, error } = await supabase
      .from("sound_files")
      .select()
      .in("id", ids);

    if (error) console.warn("Failed to list files:", error);

    return data;
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
    const stored = localStorage.getItem("tempSoundRoomData");
    if (!stored) {
      console.warn("No room data found in local storage.");
      isLoadingRoom.value = false;
      return
    } else {
      const roomData = JSON.parse(stored);
      const ids = roomData.soundLibrarySources.map(s => s.libraryId);
      const dbSounds = await getSoundsFromDB(ids);
      const downloaded = await downloadMultipleAudio(dbSounds);

      const finalSources = ids.map(id => {
        const audioPath = downloaded.find(p => p.id === id)?.audioPath;
        const soundMatch = dbSounds.find(d => d.id === id);
        const name = soundMatch.name;
        const bucket = soundMatch.bucket;
        const path = soundMatch.path;
        const coneInner = roomData.audioEngine.soundSources.find(src => src.libraryId === id)?.state?.coneInner ?? soundMatch?.coneInner ?? 60;
        const coneOuter = roomData.audioEngine.soundSources.find(src => src.libraryId === id)?.state?.coneOuter ?? soundMatch?.coneOuter ?? 180;
        if (!audioPath) console.warn(`Missing audioPath for libraryId ${id}`);
        return { libraryId: id, audioPath, name, path, bucket, coneInner, coneOuter };
      });

      soundLibrarySources.value = finalSources;

      roomData.audioEngine.soundSources.forEach(src => {
        const match = finalSources.find(a => a.libraryId === src.libraryId);
        if (match) {
          src.audioPath = match.audioPath;
          src.name = match.name;
        }
      });

      actionManager.clearHistory();

      audioEngine.value.dispose();
      listener.value.dispose();

      room.value = Room.fromJSON(roomData.room);
      listener.value = Listener.fromJSON(roomData.listener);
      audioEngine.value = AudioEngine.fromJSON(roomData.audioEngine);

      audioEngineStore.setupAudioContext();
    }
    localStorage.removeItem("tempSoundRoomData");
    setTimeout(() => {
      isLoadingRoom.value = false;
    }, 2000);
  }
  return {
    saveRoom,
    loadRoom,
    deleteRoom,
    isLoadingRoom,
    saveRoomLocal,
    loadRoomLocal,
    isSavingRoom,
    updateRoomName,
  };
}
