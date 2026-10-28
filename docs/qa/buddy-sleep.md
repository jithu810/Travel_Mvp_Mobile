# Buddy sleep and tap-to-wake

Assessment owner: Architect, 2026-10-28, Asia/Kolkata.
Tier: focused local animation, with independent review and affected behavioral checks.
Repository: Mobile, branch codex/customize-travel-preview, base a16f7d6.
Baseline: existing workflow/instruction changes plus local Story floating swipe, map Buddy messages, and Account top-area edits are preserved and excluded from this feature's ownership.

## Backend assessment
UI-only repository assessment. Inspected src/components/buddy/journey-buddy-host.tsx, buddy-sprite.tsx, src/lib/buddy/animations.ts, model.ts, store.ts, src/hooks/use-map-buddy.ts and existing Buddy tests. Sleep is temporary local presentation state. Data contracts, authentication/authorization, persistence, RPC/API, Storage and GPS behavior are unchanged. No live Supabase check required; no live writes authorized.

## Scope
Floating Buddy rests after60 seconds without user interaction. First tap wakes only; later taps retain help. Sleeping stops roaming. Travel screens, messages, reactions, celebrations, dragging, route changes and background cannot retain a sleep timer. Reduced motion uses a static sleeping pose. Map Story walkers remain alert.

## Assets
sleep.png: AI-generated from the existing reference character, eight breathing poses. Technical preparation uses an identical vertical crop for all cells, equal horizontal cells, nearest-neighbor scaling and a transparent1024x128 output. Existing artwork is preserved. No new dependencies.

## Verification
50/50 focused tests passed (buddy-sleep.test.mjs and journey-buddy.test.mjs). TypeScript, zero-warning scoped ESLint and diff-check passed. Independent Code Reviewer found an interrupted-roam walking-state issue; writer fixed it and added a regression covering sleep mid-roam, accessibility wake and stale completion. Reviewer confirmed no remaining actionable findings, host SHA256 AF105565E8683510DB69B5481FC868A9BE3884F93142C31818AB53BFBB189A8C.

Native Codex8081, connected CPH2813/Android16: Account Buddy stayed in top area, became seated/closed-eye with Zzz after idle, then returned to awake with the first tap and no message. Screenshots in OS temporary storage buddy-sleep-idle.png and buddy-sleep-wake.png. Sleep art had a tiny detached frame-boundary fragment; removed disconnected alpha fragments in technical extraction after this first screenshot. Automated frame/geometry and reduced-motion behavior pass. Final cleaned-art idle cycle, native reduced motion/TalkBack, other devices and broader lifecycle matrix remain pending; no claim of GPS field testing. Yawn/stretch transition artwork is not included.
Publication: local/unpublished. No commits, pushes, deployment or backend changes.


## Curious idle replacement - 2026-10-28
Small artwork/playback update authorized by product owner. Baseline retains all prior local changes. Inspected animations.ts, buddy-sprite.tsx, StoryWalkingBuddy and actual animation harness: replacement uses existing frame playback and bottom-center anchor. No data/auth/persistence/API/Storage/GPS changes; live preflight not required. Original idle.png preserved, new idle-curious.png planned as16 frames in a4x4 sheet,128px cells,4fps. Scope: map check, backpack adjustment and curious glance. 59 affected Buddy and Story animation tests passed; scoped ESLint and diff-check passed. Self-reviewed manifest and all16 cells for correct row/column crops. Native Codex8081 Account screenshots buddy-curious-idle-b.png and buddy-curious-idle-c.png show different curious poses with no neighboring-cell bleed. Original idle.png and reduced-motion reference fallback are preserved. No separate reviewer or full suite required for this small artwork change. Local/unpublished; broader device/accessibility matrix pending.
