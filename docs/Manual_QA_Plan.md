# SoundRoom Manual QA Plan (Pre-Launch)

> Scope: **manual testing only** for the Vue 3 + Vite SoundRoom app using browser + DevTools + Vercel + Supabase + Stripe test mode.  
> No automated frameworks. No new dependencies.

## 1) Critical User Flows Identified from Codebase

Core paths to validate before launch:

1. **Visitor → Authenticated user**
   - LandingPage/LoggedOut → Auth modal (`SignInView`, `SignUpView`, `ResetView`) → authenticated app state.
2. **User → Room lifecycle**
   - Open room manager (`RoomManager`) → create/open/rename/delete room → load in `SoundRoom`.
3. **User → Sound Library to canvas**
   - Open `SoundLibrary` modal → browse categories/search/filter → add sound source to room canvas.
4. **Playback + control loop**
   - Play/pause/layer sounds, adjust volume/position/listener, scheduling (`SoundScheduler`) and source metadata.
5. **Persistence loop (Supabase)**
   - Save room state (`useSaveAndLoadRoom`, `useRoomStore`) → reload session/browser → confirm data consistency.
6. **Plan/entitlement loop (Stripe + gating)**
   - Pricing/manage plan views + checkout/portal APIs + entitlement store/composable + gate UI states.
7. **Failure + recovery loop**
   - API failures, bad audio URLs, expired sessions, offline mode, route/auth callback errors, error boundary behavior.

---

## 2) Full Manual QA Checklist by Feature Area

Severity definitions:
- **Critical**: blocks primary app value or revenue flow.
- **Major**: serious defect with workaround or partial block.
- **Minor**: non-blocking functional defect.
- **Cosmetic**: visual/wording polish issue.

### A. Auth

| Test name | Manual steps | Expected result | Failure criteria | Severity |
|---|---|---|---|---|
| Sign up with new email | 1) Open production/preview URL in clean profile. 2) Open auth modal. 3) Create account with valid email/password. | Account created, user session established or verify-email flow shown clearly. | Error on valid input, account not created, session stuck/loading forever. | Critical |
| Sign in existing user | 1) Log out first. 2) Sign in with known valid credentials. | User lands in authenticated app; user-specific rooms load. | Cannot sign in or sign in but app unusable/blank. | Critical |
| Invalid credentials handling | Attempt wrong password/email combo. | Clear, non-crashing error message. | Silent failure, crash, misleading success. | Major |
| Password reset flow | Use reset view and reset link/callback path. | Email sent and reset callback route works (`UpdatePasswordPage`/`AuthCallback`). | Reset cannot be initiated/completed. | Major |
| Session persistence across refresh | Sign in, refresh tab, close/reopen browser. | Session remains valid until explicit logout/expiry. | Unexpected sign-out or broken state after refresh. | Major |
| Logout flow | Logout from app controls, then try protected route. | Session cleared; protected views gated. | Still authenticated after logout or auth loop. | Critical |

### B. Rooms

| Test name | Manual steps | Expected result | Failure criteria | Severity |
|---|---|---|---|---|
| Create room | Open room manager and create a room with valid name. | Room appears in list and opens successfully. | Room creation fails or opens blank/broken. | Critical |
| Rename room | Rename room from `EditableRoomName`. Refresh app. | New name persists in list and active room. | Rename appears locally but reverts/not saved. | Major |
| Delete room | Delete room and confirm modal. Refresh and re-login. | Room removed from UI and backend records. | Deleted room reappears or wrong room deleted. | Critical |
| Open/switch rooms | Create 2+ rooms, switch repeatedly. | Correct room state loaded each time. | Cross-room data bleed or incorrect room loaded. | Major |
| Pagination controls | Use `PaginationControls` with enough rooms. | Pagination stable and selection accurate. | Missing rooms, wrong room selected, UI lockups. | Minor |

### C. Sound Library

| Test name | Manual steps | Expected result | Failure criteria | Severity |
|---|---|---|---|---|
| Open library modal | Trigger `SoundLibrary` from add-source flow. | Modal opens fast, list/categories visible. | Modal fails to open/freezes/crashes. | Major |
| Add sound to room | Select a sound from grid and add to canvas. | New source appears, has playable audio metadata. | Click does nothing, duplicates unexpectedly, broken source object. | Critical |
| Category browsing | Click through categories in `CategoryList`. | Grid updates correctly per category. | Wrong results, stale view, category click no-op. | Major |
| Preview interactions | Trigger sound preview controls (if present). | Preview plays/stops without affecting existing room audio unexpectedly. | Preview never plays or hijacks global playback. | Major |

### D. Search & Filtering

| Test name | Manual steps | Expected result | Failure criteria | Severity |
|---|---|---|---|---|
| Keyword search returns matches | Type known keyword in library search. | Relevant sounds shown quickly. | No results for known match, long freeze, UI jank. | Major |
| No-results state | Search gibberish. | Clear empty-state messaging, no crash. | Blank area with no explanation or broken controls. | Minor |
| Clear/reset filters | Apply category + search then clear both. | Full list restored and controls reset. | Filters persist unexpectedly or require refresh. | Major |
| Rapid typing resilience | Type quickly/backspace repeatedly. | Stable results, no duplicate requests storm. | App locks, delayed stale results, console errors. | Major |

### E. Audio Playback

| Test name | Manual steps | Expected result | Failure criteria | Severity |
|---|---|---|---|---|
| Single source play/pause | Add one source and toggle play/pause. | Immediate audible response and matching UI state. | No audio, wrong icon/state mismatch. | Critical |
| Layer multiple sources | Add 3–5 sources and play together. | Concurrent playback without severe distortion or crash. | Sources cut out randomly, hard crash, unusable lag. | Critical |
| Volume adjustment | Change source and/or master gain sliders. | Audible volume change and persisted control value. | Slider moves but audio unchanged or resets unexpectedly. | Major |
| Spatial movement | Move source/listener and rotate where supported. | Perceived spatial changes and visual node sync. | Visual moves but audio static/inverted/invalid. | Major |
| Stop/resume and scheduling | Use scheduling controls if enabled. | Timed behavior aligns with UI, stop/resume reliable. | Schedule ignores settings or keeps running after stop. | Major |
| Bad audio URL handling | Inject/select sound with invalid URL. | Graceful error; rest of app remains functional. | Global audio engine break, app crash, endless retries. | Critical |

### F. Persistence / Data Saving

| Test name | Manual steps | Expected result | Failure criteria | Severity |
|---|---|---|---|---|
| Save room after edits | Add/move sounds, rename room, save. | Success state shown; changes retained after reload. | Data lost after reload or partially corrupted. | Critical |
| Auto/load consistency | Reload page and reopen same room. | Source count, positions, settings match previous save. | Drift/mismatch between UI and saved data. | Major |
| Multi-tab consistency | Open same room in 2 tabs, edit/save in both. | Deterministic last-write behavior, no catastrophic corruption. | Broken JSON/state, crashes, unrecoverable room. | Major |
| Logout/login persistence | Save room, logout, login again. | Same user data available; other users’ data inaccessible. | Missing own data or data leak across accounts. | Critical |

### G. Billing / Stripe

| Test name | Manual steps | Expected result | Failure criteria | Severity |
|---|---|---|---|---|
| Start checkout | Click upgrade from pricing/gate CTA. | Redirect to Stripe Checkout test mode. | Checkout fails to initiate or wrong price/plan. | Critical |
| Successful payment updates plan | Complete test payment, return to app. | Entitlements reflect Pro without manual DB edits. | Payment success but user remains free. | Critical |
| Canceled checkout | Start checkout then cancel. | No Pro access granted; UI remains free tier. | Pro accidentally enabled after canceled flow. | Critical |
| Billing portal opens | Use manage-plan action. | Stripe portal session opens for eligible user. | 4xx/5xx or dead link from app. | Major |
| Downgrade/cancel effect | Cancel/downgrade in test mode and return. | Pro features removed per policy/timing. | User retains Pro incorrectly or immediate wrong lockout. | Critical |

### H. Pro Gating / Entitlements

| Test name | Manual steps | Expected result | Failure criteria | Severity |
|---|---|---|---|---|
| Free user hits Pro feature | Attempt Pro-only action as free user. | Gate modal/upsell shown (`Gate`, `EntitlementUpsellModal`). | Feature executes without permission or hard crash. | Critical |
| Pro user access | Authenticate as Pro and retry same feature. | Feature accessible without gate friction. | Pro blocked incorrectly. | Critical |
| Entitlement refresh after plan change | Change plan, refresh app, revisit gated UI. | Gating reflects latest backend entitlement reliably. | Stale entitlement requiring manual cache clear. | Major |

### I. Account/Data Deletion Request (if present)

| Test name | Manual steps | Expected result | Failure criteria | Severity |
|---|---|---|---|---|
| Locate deletion path | Check Settings/Legal/Help for account deletion request method. | Path is visible and understandable (self-serve or support route). | No discoverable deletion/contact method. | Major |
| Execute deletion request flow | If self-serve exists: submit request and verify effects. | Account/data handled per policy; user informed of outcome. | Partial deletion with ghost data or silent failure. | Critical |

### J. Error Handling & Recovery

| Test name | Manual steps | Expected result | Failure criteria | Severity |
|---|---|---|---|---|
| API error surface | Simulate failed API calls in DevTools (block/abort). | Friendly error state/toast; app remains recoverable. | Blank screen, unhandled rejection loop. | Critical |
| Auth callback failure | Hit auth error paths (`AuthError`, malformed callback params). | Helpful message + route back to safe page. | User trapped with no recovery action. | Major |
| Error boundary behavior | Force component error via DevTools/local override where possible. | `ErrorBoundary` catches and shows fallback. | App hard-crashes entire session. | Critical |

### K. Browser / Device Compatibility

| Test name | Manual steps | Expected result | Failure criteria | Severity |
|---|---|---|---|---|
| Chrome desktop core flow | Run auth → room → add/play → save. | Full functionality works. | Any core flow blocked. | Critical |
| Firefox desktop core flow | Repeat same core flow in Firefox. | Equivalent behavior/performance acceptable. | Audio or core UI broken significantly. | Critical |
| Safari desktop core flow (if available) | Repeat core flow on Safari desktop. | No launch-blocking Safari-specific defects. | Playback/auth/room management broken. | Major/Critical |
| Mobile access behavior | Open app on mobile viewport/device. | Intended unsupported/coming-soon message appears cleanly (`MobileComingSoon`). | Broken desktop UI on mobile with no guidance. | Major |

### L. Performance (Manual)

| Test name | Manual steps | Expected result | Failure criteria | Severity |
|---|---|---|---|---|
| Library open latency | Profile opening Sound Library with DevTools Performance. | No long main-thread stalls; interaction remains responsive. | Multi-second freeze on common dataset. | Major |
| Search interaction cost | Record typing in search box. | Minimal scripting/layout spikes; no escalating lag. | Lag worsens with each query or noticeable input delay. | Major |
| Multi-sound playback cost | Play 5+ sounds and inspect CPU timeline. | Stable playback; no runaway CPU spikes. | Audio glitches + high sustained CPU causing unusability. | Major |
| Room load/network efficiency | Reload room and inspect Network tab. | No obvious redundant repeated room/audio fetch loops. | Repeated duplicate calls causing slow loads. | Major |
| Memory trend | Repeat open/close library and play/stop cycles 20+ times. | Memory roughly stable or returns after GC opportunities. | Consistent upward memory leak trend. | Major |

### M. Mobile/Unsupported Device Behavior

| Test name | Manual steps | Expected result | Failure criteria | Severity |
|---|---|---|---|---|
| Unsupported messaging clarity | On real mobile or DevTools device mode, open app. | Message explains desktop-first limitation + next step. | Confusing/blank/unstyled unsupported state. | Minor/Major |
| Prevent broken interaction surface | Try interacting with main app on unsupported mobile. | User is prevented or redirected from broken editor UI. | User reaches unusable canvas without guidance. | Major |

---

## 3) Launch-Blocker Bug List (Must Fix Before Launch)

Treat the following as **hard blockers**:

- [ ] Signup/login broken (new user cannot register or existing user cannot sign in).
- [ ] Room creation/opening broken.
- [ ] Sound playback broken (single or layered playback non-functional).
- [ ] Data not persisting (room/user changes lost after refresh/re-login).
- [ ] Stripe upgrade/cancel broken (cannot upgrade, or cancel grants/retains wrong access).
- [ ] Pro gating broken (free users can access Pro or Pro users blocked incorrectly).
- [ ] User encounters blank screen/crash with no recovery path.
- [ ] Severe browser-specific breakage on Chrome/Firefox (and Safari if officially supported).

Recommended severity-to-release rule:
- **Any open Critical = No launch**
- **Major allowed only if documented, triaged, with acceptable workaround and non-core impact**

---

## 4) Manual Regression Pass (After Every Fix/Deploy)

Run this short pass on Vercel preview first, then production:

### Auth sanity
- [ ] Sign in works for existing free user.
- [ ] Sign out works.
- [ ] Protected app areas require auth.

### Room sanity
- [ ] Create room.
- [ ] Rename room.
- [ ] Add one source and save.
- [ ] Refresh and confirm room persists.

### Sound playback sanity
- [ ] Play/pause one source.
- [ ] Play 3 simultaneous sources.
- [ ] Adjust volume and confirm audible effect.

### Search/filter sanity
- [ ] Search known keyword returns expected sounds.
- [ ] No-result state displays correctly.
- [ ] Clear search/filter resets list.

### Billing sanity (Stripe test mode in preview; safe smoke in prod config)
- [ ] Upgrade flow opens checkout.
- [ ] Cancel from checkout does not grant Pro.
- [ ] Manage plan/portal opens for subscribed test user.

### Production deploy sanity
- [ ] Latest commit deployed on Vercel.
- [ ] No console errors on first load.
- [ ] No 4xx/5xx for core API routes in Network tab.

---

## 5) Destructive / Edge-Case Manual Tests

- [ ] **Rapid clicking**: spam add/play/pause/open-close modal buttons; confirm no duplicated corrupt state.
- [ ] **Refresh during action**: refresh while saving room, during checkout redirect, and while loading room.
- [ ] **Logout in active room**: log out while audio playing; ensure playback stops and state resets safely.
- [ ] **Multiple tabs**: edit same room in two tabs; verify conflict behavior is non-destructive.
- [ ] **Search/filter reset churn**: apply/remove filters repeatedly; ensure state always returns to baseline.
- [ ] **No matching search**: verify clear empty state and recovery when query cleared.
- [ ] **Failed audio URL**: block audio request or use invalid URL; confirm single-source failure isolation.
- [ ] **Bad network / offline**: DevTools Network → Offline/Slow 3G; test auth status, room load, save feedback.
- [ ] **Expired session**: invalidate token/session and perform protected action; expect re-auth prompt.
- [ ] **Free user forcing Pro action**: attempt direct URL/UI trigger for Pro feature; validate robust enforcement.

---

## 6) Browser Coverage Plan

Target matrix:

| Browser | Priority | What to cover |
|---|---|---|
| Chrome Desktop (latest stable) | P0 | Full end-to-end + performance profile |
| Firefox Desktop (latest stable) | P0 | Full end-to-end + audio behavior parity |
| Safari Desktop (latest stable available) | P1 | Core flows: auth, room, playback, save, billing entry |
| Edge Desktop (latest stable) | P2 | Smoke pass of core flows |

Mobile policy check:
- [ ] iOS Safari + Android Chrome should show desktop-only/unsupported message if mobile editor is not supported.

---

## 7) Manual Performance Testing Instructions

Use Chrome and Firefox DevTools only.

1. **Opening Sound Library**
   - Start Performance recording.
   - Open Sound Library from a loaded room.
   - Stop recording after grid renders.
   - Check for long tasks, scripting spikes, and layout thrashing.

2. **Typing in search**
   - Record while typing a 10–15 character query quickly.
   - Validate keystroke-to-render responsiveness.
   - Confirm no excessive re-render loops.

3. **Playing multiple sounds**
   - Play 1, then 3, then 5+ sources.
   - Observe CPU usage and audio stability.
   - Watch for clipping/glitches tied to UI stutters.

4. **Room load profile**
   - Reload app and open a room with several sources.
   - Inspect waterfall timing for room payload + audio fetches.

5. **Network duplication check**
   - In Network tab, look for repeated identical DB/API/audio requests without user action.
   - Flag polling/refetch loops that do not settle.

6. **Memory trend**
   - In Performance/Memory tools, repeat: open library → add/remove/play/stop → close modal (20 cycles).
   - Verify memory does not climb continuously without recovery.

Pass/flag guidance:
- Flag as **Major** if user-visible lag, repeated long tasks, or memory growth degrades usability in core workflows.

---

## 8) Supabase Verification Steps (Manual)

Perform in Supabase dashboard + app side-by-side:

- [ ] **User created**: new signup appears in `auth.users`.
- [ ] **Profile created**: corresponding profile row exists (if schema uses `profiles`).
- [ ] **Rooms saved**: creating/saving room creates/updates expected table rows.
- [ ] **Room data updated**: edits to sources/metadata are reflected accurately in stored JSON/columns.
- [ ] **Deleted data removed**: deleting room/account removes or soft-deletes per policy.
- [ ] **RLS sanity**: user A cannot read/modify user B room data through UI behavior.
- [ ] **No service role key client-side**: inspect built client bundle/env exposure; only anon/public keys in browser.

Suggested quick SQL checks (dashboard SQL editor; adapt table names):
- confirm recent user by email
- confirm room row owner_id matches authenticated user
- confirm updated_at changes after save

---

## 9) Stripe Test Mode Verification Steps

Run end-to-end in Stripe **test mode**:

- [ ] **Checkout starts**: upgrade action creates checkout session and redirects successfully.
- [ ] **Successful payment grants Pro**: complete test card payment; app entitlement updates after return/webhook.
- [ ] **Canceled/failed payment does not grant Pro**: ensure entitlement remains free.
- [ ] **Cancel/downgrade removes Pro**: after cancellation effective point, gated features lock correctly.
- [ ] **Webhook received**: verify relevant events in Stripe dashboard + server logs (Vercel).
- [ ] **Duplicate webhook safety**: replay webhook event; ensure idempotent state (no duplicate grants/corruption).

Minimum events to verify:
- checkout completion
- subscription update/cancel
- invoice/payment success/failure (as applicable)

---

## 10) Bug Report Template

```markdown
## Bug Title

- **Feature Area:** (Auth / Rooms / Sound Library / Search / Audio / Persistence / Billing / Pro Gating / etc.)
- **Environment:** (Local / Vercel Preview URL / Production URL)
- **Browser:** (Chrome 124, Firefox 125, Safari 17, etc.)
- **User Type:** (Logged out / Free / Pro)

### Steps to Reproduce
1.
2.
3.

### Expected Result

### Actual Result

### Screenshot/Video
(attach link or file)

### Severity
(Critical / Major / Minor / Cosmetic)

### Notes
(DevTools errors, network request IDs, Supabase row IDs, Stripe event IDs)

### Fixed?
(Yes/No, commit or PR link)

### Retested?
(Yes/No, environment + browser + date)
```

---

## 11) Final Launch Readiness Checklist

- [ ] No open **Critical** bugs.
- [ ] All **Major** bugs fixed or explicitly documented with workaround + follow-up date.
- [ ] Legal pages live (Privacy, Terms, Cookie as applicable).
- [ ] Support email/contact path live and visible.
- [ ] Audio licensing decision documented for all shipped assets.
- [ ] Stripe **live mode** config reviewed before launch cutover.
- [ ] Production environment variables checked (Supabase, Stripe, app URLs, webhook secrets).
- [ ] Vercel production deploy verified (correct commit, healthy functions).
- [ ] Privacy/Terms links present in footer and accessible.
- [ ] Mobile unsupported/desktop-only message verified on real mobile.
- [ ] Full manual QA pass completed and signed off (date + tester name).

---

## Suggested Execution Order for Solo Launch Week

1. Run full checklist on Vercel preview (Chrome first).
2. Fix Critical/Major issues.
3. Run regression pass on preview.
4. Repeat key pass on Firefox + Safari.
5. Validate Supabase and Stripe dashboards.
6. Deploy production.
7. Run regression pass + launch readiness checklist on production.
