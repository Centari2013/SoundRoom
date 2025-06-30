import Room from "@/lib/Room";
import Listener from "@/lib/Listener";
import AudioEngine from "@/lib/AudioEngine";
import { setupAudioContext } from "@/composables/useAudioSetup";

import { supabase } from "@/utils/supabase";
import { downloadMultipleAudio } from "@/utils/downloadAudio";
import { useAuth } from "@/utils/userAuth";
import { ref } from "vue";

export function useSaveAndLoadRoom({ room, listener, soundLibrarySources, audioEngine, actionManager }) {
  const isLoadingRoom = ref(false);
  const isSavingRoom = ref(false);
  const { user } = useAuth();

  function saveRoom() {
    isSavingRoom.value = true;
    const roomData = {
      room: room.value.toJSON(),
      listener: listener.value.toJSON(),
      soundLibrarySources: soundLibrarySources.value.map(({ libraryId }) => ({ libraryId })),
      audioEngine: audioEngine.value.toJSON(),
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
      .then(({ data, error }) => {
        if (error) {
          console.error("Error inserting room:", error);
        } else {
          console.log("Room inserted successfully:", data);
          room.value.id = data[0].id; // Update the room ID with the returned ID
        }
      });
  }

  async function loadRoom() {
    isLoadingRoom.value = true;
    const stored = localStorage.getItem("soundRoomData");
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

      actionManager.clearHistory();

      audioEngine.value.dispose();
      listener.value.dispose();

      room.value = Room.fromJSON(roomData.room);
      listener.value = Listener.fromJSON(roomData.listener);
      audioEngine.value = AudioEngine.fromJSON(roomData.audioEngine);

      setupAudioContext(audioEngine, listener);
    }
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
