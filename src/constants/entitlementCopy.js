export const PLAN_LABELS = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro'
}

export const ENTITLEMENT_COPY = {
  canUpload: {
    featureName: 'Uploads',
    action: 'upload your own sounds'
  },
  timedLoops: {
    featureName: 'Timed Loops',
    action: 'use timed loops to automate transitions'
  },
  curatedPacks: {
    featureName: 'Curated Packs',
    action: 'access our curated sound packs'
  },
  allPacks: {
    featureName: 'All Packs',
    action: 'browse the full pack library'
  },
  themes: {
    featureName: 'Themes',
    action: 'switch between premium themes'
  },
  schedulePlayback: {
    featureName: 'Scheduling',
    action: 'schedule automatic playback'
  },
  timelineScheduler: {
    featureName: 'Timeline Sequencer',
    action: 'arrange sounds on a timeline'
  },
  maxSavedRooms: {
    featureName: 'Saved Rooms',
    action: 'save more rooms'
  }
}

/**
 * Provide a sensible fallback for unknown entitlement keys.
 */
export function getEntitlementCopy(feature) {
  return ENTITLEMENT_COPY[feature] ?? {
    featureName: 'Premium Feature',
    action: 'unlock this feature'
  }
}
