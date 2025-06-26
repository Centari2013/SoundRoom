
export function saveRoomLocal(room, listener, soundLibrarySources, audioEngine) {
  // Save room data to local storage
  const roomData = {
    room: room.toJSON(), 
    listener: listener.toJSON(), 
    soundLibrarySources: soundLibrarySources.map(source => source.libraryId),
    audioEngine: audioEngine.toJSON(),
  };

  localStorage.setItem('soundRoomData', JSON.stringify(roomData));
  const testData = JSON.parse(localStorage.getItem('soundRoomData')); // For debugging purposes
  console.log('Saved room data:', testData);
  return true; // Indicating success
}

export function saveRoomDownload(){
  
}

export function saveRoomDatabase(){
  // auth ? save (and return true): prompt sign up ( return false )
}