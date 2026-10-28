# Optional mobile improvement backlog

Created: 2026-10-29. Owner: product owner; maintained by the Architect and assigned agents.

Purpose: steadily improve ease of use, reliability and Buddy's usefulness. This is an optional pool of work for available time, not a mandatory release checklist or a replacement for requested features.

## Working agreement

- Before starting each task, announce the implementation scope and whether checks need no device, an emulator, or a real phone. Use an emulator where suitable for remote work; arrange phone availability for hardware-dependent checks.

- Explicit user requests and active features take priority. Do not interrupt them to work through this list.
- When no requested feature is pending and time is available, the Architect may select one bounded item for local work, explain the scope, and follow the normal repository workflow. The owner may defer, reorder or reject any item.
- Priority groups suggest an order; they are not commitments. Resolve product choices before implementing competing options. Split broad items into bounded tasks before starting.
- Use `[ ]` for incomplete and `[x]` only when the stated outcome and appropriate verification are complete. Record work in progress as a note under the item; do not tick partially completed work.
- After each completion, update this file in the same task with the date, concise result, checks/evidence and remaining limitations. If device verification is required but pending, leave that outcome unchecked.
- Keep completed items for history. Reopen an item if later evidence invalidates its completion.
- ROADMAP.md and PROJECT_STATUS.md remain the feature/status records. Link existing QA evidence instead of duplicating it, and reconcile stale status before relying on it.
- This backlog authorizes no publication, merge, deployment, dependency change requiring approval, destructive operation, or live Supabase write. Existing approval, secret-access, backend-impact and proportional-verification rules still apply.

## Review baseline

Initial recommendations come from source inspection and Home, Journey Story and Search screenshots on the owner's CPH2813 on 2026-10-29. They are hypotheses to validate, not proof of retention improvement or a complete device audit. No features below were implemented during that review.

## 1. Trust, recovery and launch readiness

- [x] **R1 — Correct GPS explanations.** Align Story About, trip entry and Buddy copy with actual behavior: Begin Trip enables foreground GPS; describe pause/exit/background behavior accurately. Remove the conflicting Story About claim of "No GPS tracking." Check the affected screens and copy.
  - Completed 2026-10-28 — Story About and Buddy Travel help explain explicit Begin Trip, the pause/finish/leave/background stop conditions and resumption on return; "No GPS tracking" removed (PR #26, merged). Verification: 72/72 foreground-location and journey-buddy tests, ESLint and whitespace checks (PR #26); emulator Medium_Phone_API_37.0 with the EAS development build on Goa journey showed the full Story About copy, the "Begin Trip enables GPS" start slider and the ready-state Buddy help copy without clipping. Copy-only; no data, auth, persistence, RPC/API or Storage change, so no live preflight. Limitations: emulator only and Begin Trip not pressed, so real GPS behavior remains R4; the Buddy GPS sentence also appears on finished/completed trips (optional copy follow-up); Travel Mode requests location permission on entry, before Begin Trip. Local/unpublished.
- [ ] **R2 — Recover interrupted trips and temporary itineraries.** Design and implement safe recovery after process termination, preserving selected stops and confirmed progress. Require explicit user action before restarting GPS; test termination, restore, account/privacy boundaries and unavailable journeys. Assess storage/backend impact before implementation.
- [ ] **R3 — Recover unsaved creation work.** Assess existing save/recovery behavior, then protect useful edits against interruption without duplicate or ambiguous writes. Verify failed saves, interrupted uploads, restart, retry and discard behavior; clearly distinguish local edits from confirmed saved data.
- [ ] **R4 — Complete real-device reliability checks.** Reconcile existing QA first, then cover weak/lost network, denied location, GPS loss, rerouting, pause/resume/finish, foreground/background and app termination. Record actual results and fix/retest failures; simulated tests alone do not complete this item.
- [ ] **R5 — Complete accessibility and performance checks.** Verify large text, TalkBack labels/order, contrast, touch targets, reduced motion, keyboard/safe areas and Buddy overlap on supported screens. Measure scrolling, map/animation responsiveness and resource use on representative devices; record scope and remaining device gaps.
- [ ] **R6 — Curate the initial public experience.** Prepare useful, clearly described example journeys and an honest empty-state experience. Obtain explicit approval before creating, editing or removing any hosted content. New users should understand the app's value without development-only content.

## 2. Clear first use and navigation

- [ ] **U1 — Introduce Buddy during first use.** Offer a short, skippable introduction tied to a useful action, with "Guide me" and "Explore myself" choices and an easy quiet/hide control. Resolve the current fresh-install default-off/discoverability gap without forcing a long tour.
- [ ] **U2 — Simplify Home hierarchy.** Make finding a journey the obvious first action while retaining the globe. Reduce competing controls and make creation prominent when relevant. Compare the result with the current Home on-device.
- [ ] **U3 — Make Search tiles understandable.** Show readable journey/destination context for photo and artwork tiles, with useful metadata where space permits. Verify long titles, missing photos, narrow screens and large text.
- [ ] **U4 — Clarify browsing destinations.** Test whether people distinguish Explore, Search and Story; choose and implement clearer labels or consolidation based on findings. Preserve navigation return state and direct links.
- [ ] **U5 — Make saved and ongoing work easy to find.** Provide a clear path to saved journeys and relevant drafts/recoverable trips. Verify empty, signed-out, loading and unavailable-content states.
- [x] **U6 — Remove the inactive notification affordance.** Remove or replace the Home bell until there is a useful implemented destination; check header layout and accessibility afterward.
  - Completed 2026-10-28 — Removed the decorative "Notifications, coming soon" bell and its styles from the Home header (src/app/discover.tsx); Search now spans the header. Verification: 150/150 Home-related tests (home-polish updated to assert no notification affordance and the single Search control), tsc and scoped ESLint passed; emulator Medium_Phone_API_37.0 showed the full-width Search header and working place suggestions. UI-only; no data, auth, persistence, RPC/API or Storage change, so no live preflight. Limitations: emulator only; the floating dev-client Tools button overlaps the header corner in development builds only. Local/unpublished.
- [ ] **U7 — Simplify Story actions.** Establish a clear primary action and secondary action hierarchy. Explain Customize versus Remix at the point of choice, including temporary selection versus saved editable draft. Verify original, customized and existing-draft journeys.
- [ ] **U8 — Teach through a first useful outcome.** Let users choose finding a journey or keeping a memory, then guide only the next unfamiliar step. Preserve guest browsing and intended action through sign-in; request permissions in context.

## 3. Buddy as a useful companion

- [ ] **B1 — Give Buddy task-specific actions.** Replace generic help choices where appropriate with actions matching Search, Create, Story, Account and actual error states. Use authoritative app state, explain save uncertainty accurately, and open the relevant screen/action.
- [ ] **B2 — Add optional, editable preferences.** Define a small set of explicit travel preferences and how they improve suggestions. Provide view/edit/forget controls; define local versus account storage and account switching before implementation. Avoid sensitive inference from photos or location.
- [ ] **B3 — Help users continue unfinished work.** Offer accurate, actionable prompts for an existing draft, saved journey or recoverable trip. Handle deleted/unavailable content and avoid claiming anything was saved when it was not.
- [ ] **B4 — Support reflection after a trip.** After confirmed completion, optionally offer memory capture and a useful recap. Base claims on confirmed progress; never imply GPS proves a visit or that an unsaved memory is stored.
- [ ] **B5 — Tune frequency and user control.** Make proactive help occasional, dismissible and relevant; retain quiet/hide controls and reduced-motion support. Keep maneuver/arrival guidance ahead of Buddy messages and avoid interaction demands while driving.
- [ ] **B6 — Make personality consistent and honest.** Use warm, concise language and the preferred name sparingly. Remember only information actually retained, explain why a suggestion fits, and avoid repetitive greetings or guilt-based engagement.

## 4. Return value and evidence

- [ ] **E1 — Build useful return paths.** Prioritize planning, travelling and remembering over daily streaks: continue work, revisit saves and discover relevant journeys. Define a concrete user benefit for each prompt or recommendation.
- [ ] **E2 — Run a small usability pilot.** Observe about five new users finding, saving and customizing a journey and creating one memory without coaching. Record hesitation, completion and whether Buddy helps; obtain authorization for any hosted test writes.
- [ ] **E3 — Define lightweight success measures.** Agree how to assess first useful action, task completion, recovery success, Buddy usefulness/dismissal and return for a real travel need. Review privacy and implementation scope before adding analytics; do not assume retention gains.
- [ ] **E4 — Reprioritize from pilot evidence.** Record what users struggled with, revise this backlog and select the next bounded improvement. Consider AI chat only after contextual actions and reliable memory show value; it is not a current implementation commitment.

## Completion record format

Add under the completed item:

`Completed YYYY-MM-DD — Result; verification/evidence; limitations; local/unpublished or confirmed PR link.`

For partial work use:

`In progress YYYY-MM-DD — bounded scope; completed portion; pending outcome/check; next owner.`
