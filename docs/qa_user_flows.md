# SoundRoom QA User Flows

The following end-to-end user flows focus on realistic behaviors in SoundRoom. Each flow includes steps, expected behavior, likely bugs, and regression risks to guide manual QA.

## 1. New user onboarding and welcome overlay
- **Steps**
  1. Land on root URL as a logged-out visitor.
  2. Observe the welcome overlay; start the onboarding tour.
  3. Advance through each tour step that highlights the left library sidebar, canvas, and right controls sidebar.
  4. Dismiss the tour and confirm normal UI interactivity resumes.
- **Expected behavior**
  - Overlay appears only on first visit or until dismissed; focus is trapped; background non-interactive.
  - Tour steps highlight correct UI regions; progress persists between steps.
  - Dismissing tour re-enables canvas drag/drop and sidebars.
- **Possible bugs**
  - Overlay not shown for first-time visitors; focus leakage allowing clicks behind modal; route-based modal not updating URL.
  - Tour step mismatch with elements (e.g., incorrect selectors) or broken step order.
  - Keyboard navigation blocked after dismissal.
- **Regression risks**
  - Changes to routing or modal mounting breaking tour visibility.
  - CSS or layout updates misaligning highlighted regions.

## 2. Sign up and email-based login via Supabase
- **Steps**
  1. Open authentication modal route (e.g., "/auth").
  2. Submit email/password for new account; verify email flow or magic link if applicable.
  3. Log in with the created credentials.
  4. Confirm user avatar/menu updates and access to account settings.
- **Expected behavior**
  - Form validates required fields; Supabase error surfaces on duplicate or weak passwords.
  - Successful signup triggers confirmation instructions or auto-login.
  - Auth state persists across reloads; protected routes redirect to canvas when authenticated.
- **Possible bugs**
  - Auth modal route not updating history or failing on back navigation.
  - Tokens not persisted; session lost on refresh.
  - Error messages generic or missing; rate limiting not enforced.
- **Regression risks**
  - Supabase SDK version changes affecting session handling.
  - CSP or cookie configuration changes breaking cross-site auth.

## 3. Upgrade to paid tier via Stripe checkout
- **Steps**
  1. From account menu, choose upgrade; ensure redirect to Stripe Checkout.
  2. Complete purchase with test card; return to SoundRoom.
  3. Confirm paid tier status reflected in UI (badges, unlocked features).
  4. Open Stripe customer portal link to manage subscription; return back.
- **Expected behavior**
  - Checkout opens in new tab or same tab with correct price; post-payment webhook/state updates user tier.
  - Paid-only features (e.g., higher upload limits) become available immediately after return.
  - Portal opens with authenticated session and returns without losing app state.
- **Possible bugs**
  - Missing webhook processing or client polling leading to stale tier.
  - Portal redirect clears local session; UI still shows free tier.
  - Upgrade button enabled when already paid; double charges.
- **Regression risks**
  - Pricing ID changes not reflected in frontend.
  - Error handling on checkout failures regressing with new Stripe SDK versions.

## 4. Upload audio file and preview generation (Cloudflare R2)
- **Steps**
  1. Logged-in user opens left library sidebar upload control.
  2. Select supported audio file; start upload.
  3. Wait for progress completion and auto-generated preview file.
  4. Verify new asset appears in library with waveform/metadata.
- **Expected behavior**
  - Client validates file type/size; upload progress updates; retries on transient failures.
  - Backend generates preview; library item shows playable preview once ready.
  - Errors surface with actionable messages; uploads respect tier limits.
- **Possible bugs**
  - Upload stuck due to CORS or credentials; no progress updates.
  - Preview generation timeout leaving item unusable.
  - Free-tier limit bypassed or over-enforced.
- **Regression risks**
  - Storage bucket permission changes causing 403s.
  - Refactors to upload queue impacting progress events.

## 5. Drag new source onto canvas and position it
- **Steps**
  1. Drag an uploaded audio source from library onto canvas.
  2. Drop to create a new source node.
  3. Drag to reposition; rotate via handle; verify position indicators.
- **Expected behavior**
  - Drop creates source at cursor location; snapping rules apply if enabled.
  - Position and rotation update UI labels and right sidebar controls.
  - Canvas remains responsive; no ghost elements remain.
- **Possible bugs**
  - Drop ignored due to pointer offset; source spawns off-canvas.
  - Rotation handle misaligned; values desync between canvas and sidebar fields.
  - Performance lag with multiple sources.
- **Regression risks**
  - Changes to drag library breaking pointer capture.
  - CSS z-index updates causing handle unclickable.

## 6. Source manipulation: move, rotate, delete with undo/redo
- **Steps**
  1. Select an existing source; move and rotate it.
  2. Delete the source via toolbar or keyboard shortcut.
  3. Use undo to restore; redo to reapply deletion.
- **Expected behavior**
  - Selection highlights source; transformations reflected in timeline/controls.
  - Delete removes node and related audio; undo/redo accurately snapshots state.
  - Keyboard shortcuts work when focus on canvas; not when in form fields.
- **Possible bugs**
  - Undo restores position but not rotation; or fails after delete.
  - Redo stack cleared unexpectedly by unrelated UI actions.
  - Audio engine keeps playing deleted source.
- **Regression risks**
  - State management refactors breaking snapshot fidelity.
  - New hotkeys conflicting with browser defaults.

## 7. Play, pause, and engine initialization
- **Steps**
  1. With multiple sources on canvas, press Play.
  2. Adjust listener orientation/position; observe audio spatialization.
  3. Pause and resume; mute/unmute individual sources.
- **Expected behavior**
  - Audio engine initializes once; playhead starts; sources audible with spatial cues.
  - Listener controls affect stereo/3D output; visual indicators stay in sync.
  - Pause halts audio cleanly; resume continues without glitches.
- **Possible bugs**
  - Engine fails to initialize due to autoplay policies until user gesture.
  - Source mute state ignored; desync between UI and audio engine.
  - Audio crackles on resume; high CPU usage with many sources.
- **Regression risks**
  - Browser API changes to AudioContext resume handling.
  - Refactors to rendering loop affecting synchronization.

## 8. Save room, rename, and update existing room
- **Steps**
  1. Arrange sources; choose Save to create new room; name it.
  2. Reload page; open Rooms list and load saved room.
  3. Modify layout; rename room; save updates.
- **Expected behavior**
  - Initial save persists sources, positions, listener state, and metadata.
  - Loading restores full state; thumbnails/previews match.
  - Renaming updates list immediately; saving overwrites existing room without duplication.
- **Possible bugs**
  - Save completes without persisting rotation/volume params.
  - Room list stale after rename; duplicated entries.
  - Load fails on slow network; partial state applied.
- **Regression risks**
  - Backend schema changes breaking serialization.
  - Caching layers serving old room data.

## 9. Load existing room with missing assets
- **Steps**
  1. Open a room whose sources reference deleted or missing R2 files.
  2. Attempt playback and editing.
- **Expected behavior**
  - Missing assets surface clear errors; placeholders shown; room still loads.
  - Playback skips or mutes missing sources without breaking engine.
- **Possible bugs**
  - Load fails entirely due to 404 on assets.
  - UI shows sources but engine crashes or loops retrying.
- **Regression risks**
  - Error handling regressions when changing asset fetch logic.
  - New caching strategy masking missing-file errors.

## 10. Route-driven modals and back/forward navigation
- **Steps**
  1. Open settings or auth modal (distinct route change).
  2. Use browser back button to close modal and return to canvas.
  3. Use forward button to reopen modal; ensure canvas state preserved.
- **Expected behavior**
  - URL reflects modal routes; closing modal restores prior route without reload.
  - Canvas and audio state remain intact across navigation.
- **Possible bugs**
  - Modal closes but URL stays on modal route; back navigation triggers full reload.
  - State reset when navigating back/forward; audio stops unexpectedly.
- **Regression risks**
  - Router refactors altering history management.
  - Modal stacking causing incorrect route pop behavior.

## 11. Tier-gated feature enforcement
- **Steps**
  1. Log in as free-tier user; attempt paid-only actions (e.g., high file size upload, multi-room save, advanced effects).
  2. Upgrade to paid tier; retry the same actions without reloading.
- **Expected behavior**
  - Free tier sees clear gating UI (disabled buttons, upsell prompts); server enforces limits.
  - After upgrade, actions succeed without needing to re-authenticate.
- **Possible bugs**
  - Gating only on client; server allows restricted actions.
  - Post-upgrade state not refreshed; still blocked until hard reload.
- **Regression risks**
  - Feature flag changes or pricing config updates bypassing checks.
  - Cache of user profile causing stale tier info.

## 12. Library search/filter and drag re-use
- **Steps**
  1. Upload multiple files; use library search or filters.
  2. Drag filtered result onto canvas; repeat drag from same item to create duplicates.
- **Expected behavior**
  - Search/filter updates list in real time; no hidden items after clearing query.
  - Dragging from filtered view works; item remains in list; duplicates allowed if supported.
- **Possible bugs**
  - Search query not debounced leading to stutter; filter state not cleared.
  - Dragging filtered item fails due to virtualization or missing DOM nodes.
- **Regression risks**
  - Library refactor (virtual lists) breaking drag handles.
  - Search indexing changes affecting result accuracy.

## 13. Multiple tab/session consistency
- **Steps**
  1. Open the same account in two tabs.
  2. Upload or delete an asset in tab A; observe library in tab B.
  3. Perform save/load in one tab; verify other tab refresh or prompts.
- **Expected behavior**
  - Realtime or periodic sync updates library/rooms across tabs; stale data warnings shown if not auto-synced.
  - Conflicting edits handled gracefully with last-write rules or prompts.
- **Possible bugs**
  - No sync leading to silent mismatches; overwrite without warning.
  - Token refresh in one tab invalidates other tab unexpectedly.
- **Regression risks**
  - Removal of cross-tab broadcast channels or Supabase realtime listeners.
  - Caching changes preventing visibility of updates.

## 14. Error handling and offline/slow network resiliency
- **Steps**
  1. Simulate offline or high-latency network during upload and save actions.
  2. Observe retries, backoff, and user messaging.
  3. Return online; confirm queued actions resume or prompt to retry.
- **Expected behavior**
  - Clear offline indicators; actions either queue or fail with guidance.
  - No silent data loss; partial uploads cleaned up.
- **Possible bugs**
  - Spinners stuck indefinitely; uploads partially stored without cleanup.
  - Offline state not detected; app crashes on fetch errors.
- **Regression risks**
  - Changes to service worker or fetch interceptors.
  - New error boundary behavior swallowing messages.

## 15. Keyboard shortcuts and accessibility
- **Steps**
  1. Navigate canvas and sidebars using keyboard only.
  2. Trigger shortcuts for add source, delete, undo/redo, play/pause.
  3. Verify screen reader labels on controls and modals.
- **Expected behavior**
  - Focus order logical; shortcuts work when appropriate focus is present.
  - ARIA labels provided; escape closes modals without disrupting canvas state.
- **Possible bugs**
  - Shortcuts fire while typing in inputs; focus trapped incorrectly in modals.
  - Missing ARIA leading to inaccessible controls.
- **Regression risks**
  - Hotkey library updates changing scope.
  - CSS changes removing focus outlines.
