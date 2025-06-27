import Room from "@/lib/Room";
import Listener from "@/lib/Listener";
import AudioEngine from "@/lib/AudioEngine";
import { setupAudioContext } from "@/composables/useAudioSetup";

import { supabase } from "@/utils/supabase";
import { downloadMultipleAudio } from "@/utils/downloadAudio";

export function useSaveAndLoadRoom({ room, listener, soundLibrarySources, audioEngine, actionManager }) {
  function saveRoomLocal() {
    const roomData = {
      room: room.value.toJSON(),
      listener: listener.value.toJSON(),
      soundLibrarySources: soundLibrarySources.value.map(({ libraryId }) => ({ libraryId })),
      audioEngine: audioEngine.value.toJSON(),
    };
    localStorage.setItem("soundRoomData", JSON.stringify(roomData));
  }

  async function loadRoomLocal() {
    const stored = localStorage.getItem("soundRoomData");
    if (!stored) {
      console.warn("No room data found in local storage.");
      return null;
    }

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

    setupAudioContext(audioEngine, listener)
    console.log("Loaded room data:", roomData);
   
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
    saveRoomLocal,
    loadRoomLocal,
  };
}
