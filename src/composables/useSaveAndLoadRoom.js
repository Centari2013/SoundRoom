import { useRoomStore } from "@/stores/useRoomStore";
import { storeToRefs } from "pinia";

import { supabase } from "@/utils/supabase";
import { downloadMultipleAudio } from "@/utils/downloadAudio";
import { useAuth } from "@/utils/userAuth";
import { ref } from "vue";

export function useSaveAndLoadRoom() {
  const isLoadingRoom = ref(false);
  const isSavingRoom = ref(false);
  const { user } = useAuth();
  const store = useRoomStore();
  const { room, listener, audioEngine, soundLibrarySources, actionManager } = storeToRefs(store);

  function saveRoom() {
    isSavingRoom.value = true;
    const roomData = {
      room: store.roomToJSON(),
      listener: store.listenerToJSON(),
      soundLibrarySources: store.soundLibrarySourcesToJSON(),
      audioEngine: store.audioEngineToJSON(),
    };
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
  }

  function updateRoom(roomData) {
    supabase
      .from("rooms")
      .update({
        name: room.value.name,
        room_config: roomData,
      })
      .eq("id", room.value.id)
      .then(({ data, error }) => {
        if (error) {
          console.error("Error updating room:", error);
        } else {
          console.log("Room updated successfully:", data);
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
    const { data: roomData, error } = await supabase
      .from("rooms")
      .select("room_config")
      .eq("owner_id", useAuth().user.value.id)
      .eq("id", roomId)
      .single();
    if (error) {
      console.error("Error loading room:", error);
      isLoadingRoom.value = false;
      return;
    }
    console.log("Loaded room data:", roomData);
    return
    const ids = roomData.soundLibrarySources.map(s => s.libraryId);
    const dbSounds = await getSoundsFromDB(ids);
    const downloaded = await downloadMultipleAudio(dbSounds);

    const finalSources = ids.map(id => {
      const audioPath = downloaded.find(p => p.id === id)?.audioPath;
      const soundMatch = dbSounds.find(d => d.id === id);
      const name = soundMatch.name;
      const bucket = soundMatch.bucket;
      const path = soundMatch.path;
      if (!audioPath) console.warn(`Missing audioPath for libraryId ${id}`);
      return { libraryId: id, audioPath, name, path, bucket };
    });

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
  }

  async function getSoundsFromDB(ids) {
    const { data, error } = await supabase
      .from("sound_files")
      .select()
      .in("id", ids);

    if (error) console.warn("Failed to list files:", error);

    return data;
  }

  return {
    saveRoom,
    loadRoom,
    isLoadingRoom,
    isSavingRoom,
  };
}
