export const PLANS = ['free', 'basic', 'pro']

// ─── Entitlement schema notes ──────────────────────────────────────────
// curatedPacks / allPacks: placeholders for a future sound-pack
//   feature. Today the actual sound-access gating uses plan-rank
//   comparison in evaluateSoundAccess(); the booleans themselves are
//   never read by canAccess(). The keys remain so the
//   SOUND_TIER_FEATURE map in soundEntitlements.js can map a sound's
//   plan_tier to an entitlement copy string for the upsell modal.
//
// themes: theme switching is Pro-only. ThemeSelector.vue checks
//   canAccess('themes') and shows an upgrade card for free / basic.
//   Per-theme required_plan still works as a finer-grained gate, but
//   in practice everyone who reaches the picker is already Pro.
//
// maxUploadBytes: intentionally NOT defined here. The 10GB cap is
//   hardcoded server-side (api/get-upload-url.js). Decoupled by
//   design — surface the limit to users in UI copy, not in the
//   entitlements file.
// ──────────────────────────────────────────────────────────────────────

export const ENTITLEMENTS = {
  free: {
    canUpload: false,
    maxSavedRooms: 2,
    // Basic auto-repeat is core product behavior (every canvas source
    // loops by default). The paid-tier scheduling value lives in
    // `schedulePlayback` (Count / Interval+Count modes) and
    // `timelineScheduler`, not in whether sources can loop at all.
    timedLoops: true,
    curatedPacks: false,
    allPacks: false,
    themes: false,
    schedulePlayback: false
  },
  basic: {
    canUpload: false,
    maxSavedRooms: 10,
    timedLoops: true,
    curatedPacks: true,
    allPacks: false,
    themes: false,
    // Count / Interval+Count scheduling modes live at the Basic tier —
    // it's the enthusiast-tier "fine control" feature. Pro's scheduling
    // differentiator is the timelineScheduler.
    schedulePlayback: true
  },
  pro: {
    canUpload: true,
    maxSavedRooms: Infinity,
    timedLoops: true,
    curatedPacks: true,
    allPacks: true,
    themes: true,
    schedulePlayback: true,
    timelineScheduler: true
  }
}
