export const PLAN_TIERS = Object.freeze(['free', 'basic', 'pro'])

export const FEATURE_DEFINITIONS = Object.freeze([
  {
    key: 'multi-room-saving',
    label: 'Multi-Room Saving',
    flags: {},
    tiers: {
      free: { status: 'limited', detail: 'Save 1 room', limit: 1 },
      basic: { status: 'included', detail: 'Save up to 10 rooms', limit: 10 },
      pro: { status: 'included', detail: 'Unlimited saved rooms', limit: Infinity }
    }
  },
  {
    key: 'custom-uploads',
    label: 'Upload Custom Sounds',
    flags: {},
    tiers: {
      free: { status: 'unavailable', detail: 'Pro unlocks uploads' },
      basic: { status: 'unavailable', detail: 'Pro unlocks uploads' },
      pro: { status: 'included', detail: 'Upload your own audio library' }
    }
  },
  {
    key: 'timed-loops',
    label: 'Timed Loop Controls',
    flags: {},
    tiers: {
      free: { status: 'unavailable', detail: 'Basic unlocks timed loops' },
      basic: { status: 'included', detail: 'Per-source loop timing' },
      pro: { status: 'included', detail: 'Per-source loop timing & chaining' }
    }
  },
  {
    key: 'room-presets',
    label: 'Room Presets (Reverb, etc.)',
    flags: {},
    tiers: {
      free: { status: 'limited', detail: 'Core preset collection' },
      basic: { status: 'included', detail: 'Full preset library' },
      pro: { status: 'included', detail: 'Full preset library' }
    }
  },
  {
    key: 'sound-packs',
    label: 'Sound Packs',
    flags: {},
    tiers: {
      free: { status: 'limited', detail: 'Access to basic library' },
      basic: { status: 'included', detail: 'Curated monthly packs' },
      pro: { status: 'included', detail: 'All packs + early drops' }
    }
  },
  {
    key: 'schedule-playback',
    label: 'Schedule Playback',
    flags: { comingSoon: true },
    tiers: {
      free: { status: 'unavailable', detail: 'Coming soon with Pro' },
      basic: { status: 'unavailable', detail: 'Coming soon with Pro' },
      pro: { status: 'included', detail: 'Early access when it launches' }
    }
  },
  {
    key: 'prebuilt-rooms',
    label: 'Prebuilt Rooms',
    flags: { comingSoon: true },
    tiers: {
      free: { status: 'unavailable', detail: 'Coming soon with Pro' },
      basic: { status: 'included', detail: 'Coming soon with Pro' },
      pro: { status: 'included', detail: 'Early access when it launches' }
    }
  },
  {
    key: 'theme-options',
    label: 'Theme Options',
    flags: { comingSoon: true },
    tiers: {
      free: { status: 'unavailable', detail: 'System Light & Dark modes only' },
      basic: { status: 'included', detail: 'Multiple Light & Dark mode options' },
      pro: { status: 'included', detail: 'Multiple custom theme options' }
    }
  }
])

export const FEATURE_MAP = Object.freeze(
  FEATURE_DEFINITIONS.reduce((acc, feature) => {
    acc[feature.key] = feature
    return acc
  }, {})
)

export const PLAN_DEFINITIONS = Object.freeze([
  {
    id: 'free',
    name: 'Free',
    price: '$0/mo',
    tagline: 'Save your go-to room layout and sync across devices.',
    spotlightKeys: ['multi-room-saving']
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '$5/mo',
    tagline: 'Grow into multi-room mixes with deeper timing control.',
    spotlightKeys: ['multi-room-saving', 'timed-loops', 'sound-packs']
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$10/mo',
    tagline: 'Unlock everything in Basic + uploads, AI tools, and pro scheduling workflows.',
    spotlightKeys: ['custom-uploads', 'schedule-playback', 'theme-options']
  }
])

export const PLAN_ORDER = Object.freeze(PLAN_DEFINITIONS.map(plan => plan.id))
