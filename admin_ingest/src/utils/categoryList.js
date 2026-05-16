export const BUCKET_OPTIONS = [
  {
    value: 'nature',
    label: 'Nature',
    description: 'Rain, water, fire, birds, wind, forests, storms, insects, foliage, rivers.'
  },
  {
    // Matches the `atmospheric` category id in SoundLibrary.vue. The
    // earlier `atmosphere` spelling caused new uploads to land in a
    // bucket the customer-facing library never rendered.
    value: 'atmospheric',
    label: 'Atmospheric',
    description: 'Ambience, drones, tonal beds, soft textures, abstract pads, whitespace, reverb beds.'
  },
  {
    value: 'tools',
    label: 'Work/Focus',
    description: 'White noise, brown noise, fans, HVAC hums, soft machinery, steady-state loops.'
  },
  {
    value: 'human',
    label: 'Human',
    description: 'Voices, breath, murmurs, crowds, footsteps, typing, cloth movement, people stuff.'
  },
  {
    value: 'musical',
    label: 'Musical',
    description: 'Notes, riffs, loops, pads, chords, percussive hits, tonal accents — anything made with an instrument/synth.'
  },
  {
    value: 'urban-mechanical',
    label: 'Urban/Mechanical',
    description: 'Engines, traffic, metal, clanks, industrial ambience, train sounds, switches, gears.'
  },
  {
    value: 'misc',
    label: 'Misc',
    description: 'Everything weird, unclassifiable, experimental, glitchy, or “what the hell is that?”'
  }
]

// Provenance — where the audio asset came from.
// Stored as plain text in public.sound_files.source. Picking "Other"
// reveals a free-text input in the FileReview form so curators can
// drop in a one-off label without expanding this list.
export const SOURCE_OPTIONS = [
  'Sonniss',
  'Pixabay',
  'ZapSplat',
  'Freesound',
  'Self-recorded',
  'Generated',
  'Unknown',
  'Other'
]

// License coverage for the asset.
// Stored as plain text in public.sound_files.license_type. Same
// "Other" → free-text pattern as SOURCE_OPTIONS.
export const LICENSE_OPTIONS = [
  'Commercial License',
  'Pixabay License',
  'CC0',
  'Creative Commons',
  'Royalty-Free',
  'Unknown',
  'Other'
]
