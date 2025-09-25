export const PLANS = ['free', 'basic', 'pro']

export const ENTITLEMENTS = {
  free: {
    canUpload: false,
    maxSavedRooms: 1,
    timedLoops: false,
    fullPresets: false,
    curatedPacks: false,
    allPacks: false,
    themes: 'none',
    schedulePlayback: false
  },
  basic: {
    canUpload: false,
    maxSavedRooms: 10,
    timedLoops: true,
    fullPresets: true,
    curatedPacks: true,
    allPacks: false,
    themes: 'basic',
    schedulePlayback: false
  },
  pro: {
    canUpload: true,
    maxSavedRooms: Infinity,
    timedLoops: true,
    fullPresets: true,
    curatedPacks: true,
    allPacks: true,
    themes: 'pro',
    schedulePlayback: true
  }
}
