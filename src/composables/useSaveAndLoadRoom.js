import { useRoomStore } from "@/stores/useRoomStore";
import { storeToRefs } from "pinia";

import { supabase } from "@/utils/supabase";
import { downloadMultipleAudio } from "@/utils/downloadAudio";
import { useAuth } from "@/composables/useAuth";
import { ref } from "vue";

export function useSaveAndLoadRoom() {
  const isLoadingRoom = ref(false);
  const isSavingRoom = ref(false);
  const { user } = useAuth();
  const store = useRoomStore();
  const { room, listener, audioEngine, soundLibrarySources, actionManager } = storeToRefs(store);

  function saveRoom() {
    isSavingRoom.value = true;
    const roomData = store.getSaveSnapshot();
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

  function updateRoom(roomData) {
    supabase
      .from("rooms")
      .update({
        name: room.value.name,
        room_config: roomData,
      })
      .eq("id", room.value.id)
      .select("id") // Ensure we get the updated ID back
      .then(({ data, error }) => {
        if (error) {
          console.error("Error updating room:", error);
        } else {
          room.value.id = data[0].id; // Update the room ID with the returned ID
        }
      });
  }

  function insertRoom(roomData) {
    supabase
      .from("rooms")
      .insert({
        owner_id: user.value.id,
        name: room.value.name,
        room_config: roomData
      })
      .select("id") // Ensure we get the inserted ID back
      .single() // We expect a single row back
      .then(({ data: id, error }) => {
        if (error) {
          console.error("Error inserting room:", error);
        } else {
          room.value.id = id; // Update the room ID with the returned ID
        }
      });
  }

  async function loadRoom(roomId) {
    isLoadingRoom.value = true;
    // get room data from supabase
    const { data, error } = await supabase
      .from("rooms")
      .select("room_config")
      .eq("id", roomId)
      .single();
    if (error) {
      console.error("Error loading room:", error);
      isLoadingRoom.value = false;
      return false;
    }
    const roomData = data.room_config;
    roomData.room.id = roomId; // Set the room ID from the database
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

    store.loadRoom(roomData.room);
    store.loadListener(roomData.listener);
    store.loadAudioEngine(roomData.audioEngine);
    
    store.setupAudioContext(audioEngine, listener);
    
    setTimeout(() => {
      isLoadingRoom.value = false;
    }, 2000);

    return true;
  }

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

  async function getSoundsFromDB(ids) {
    const { data, error } = await supabase
      .from("sound_files")
      .select()
      .in("id", ids);

    if (error) console.warn("Failed to list files:", error);

    return data;
  }
  function saveRoomLocal() {
    isSavingRoom.value = true;
    const roomData = store.getSaveSnapshot();
    localStorage.setItem("tempSoundRoomData", JSON.stringify(roomData));
    setTimeout(() => {
      isSavingRoom.value = false;
    }, 2000);
  }

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

      store.setupAudioContext();
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
  };
}
