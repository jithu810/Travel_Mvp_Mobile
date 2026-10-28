# Buddy gestures and contextual text

Assessment: Architect,2026-10-28 Asia/Kolkata. Focused UI-only local animation/interaction. Mobile branch codex/customize-travel-preview base a16f7d6; all existing dirty Story/Profile/help/sleep/idle/instruction work retained.

Inspected journey-buddy-host.tsx, buddy-help-sheet.tsx, animations.ts, model.ts, store.ts, use-journey-buddy.tsx and Buddy tests. No contracts, queries/writes, auth/session/authorization, persistence, RPC/API, Storage or GPS behavior changes. Live backend preflight not required; no live writes authorized.

Scope: matching wave and curious head-tilt clips, occasional contextual Explore/Search/Create/Account messages and contextual manual help. Automatic bubbles must fit clear geometry, never fall back to a modal, never interrupt Travel or sleep, expire quickly and remain rate-limited. No AI chat, audio, network service, native permissions or dependency changes.

Ownership: Mobile specialist owns contextual helper, host, help copy and tests; Architect owns gesture artwork, manifest and docs. Independent review and native read-only verification follow stable source. All code remains local/unpublished.

Verification:58/58 targeted tests passed (contextual lines, sleep and actual Buddy host/sprite/help harness). TypeScript, zero-warning scoped ESLint and diff-check passed. Independent Code Reviewer found no actionable issues and independently verified late native position captures cannot show speech after interaction/disposal. Reviewed host SHA256 D52E19660255EFC690BAE501174BE6039154E6316D09E172C3AF70A2A636FCB1.

Native Codex8081 CPH2813/Android16: updated app loaded; Search photo grid retained clear content, with no automatic modal/bubble over its full grid. Automatic wave/curious timing and manual contextual text were not fully captured: reload/navigation changed the visible page during evidence collection. These device checks remain pending, along with reduced-motion/TalkBack and other-device matrix. No backend records were written.

The automatic line waits8 seconds after idle eligibility, expires after5, and uses the existing30-second reaction cooldown with a once-per-canonical-route/store-session limit. Manual Help retains actions; Travel/tour copy takes priority. Passive context does not reset the60-second sleep clock. Speech is skipped when there is no safe bubble space.


## Home manual tap correction - 2026-10-28
Focused UI-only fix, no backend impact. Reproduced two failures with actual actor harness: delayed native XY capture blocked tap-release help, and reused/missing layout measurement kept an otherwise fitted bubble invisible. Release now opens immediately without waiting for coordinates; prior measurement is retained and manual-only visible fallback starts after500ms when needed. Journey map path unchanged.

60 affected checks, TypeScript, scoped lint and diff-check pass. Independent review found no actionable issues; independently checked delayed wake-only/second-tap, fallback and timer cleanup. Reviewed host SHA256408F20EB5A30D89690AD66BBC47F9E7BC39DFA2F692CDF3EBC20F3B4A654FE0C. Native CPH2813/Android16 Codex8081 Home verified with product-owner handoff: sleeping Buddy first wakes, second tap opens contextual Home help while Buddy stays visible; Android Back closes, another tap reopens, then closed again. Screenshots in OS temp buddy-home-fixed-open.png and buddy-home-fixed-reopen.png. Manual fallback is a centered dialog when a fitted bubble cannot settle; automatic text never uses it. Existing dirty baseline preserved; local/unpublished.


## Home card-swipe continuity - 2026-10-28
Focused UI-only fix. Inspected BuddyTouchBoundary's3-second interaction cooldown, floating host animation flags, DiscoveryPanel's full protected bounds and useBuddyScroll, useDiscoverySheet's pan/spring ownership, and Home screen's sheetInteracting registration. No data, auth, persistence, API/Storage or GPS changes; live preflight not required.

Home idle artwork continues across ordinary card touches/cooldown while roaming and prompts remain paused. Horizontal card scrolling inside the already-protected panel no longer acquires a global geometry-motion lease. Generic panel touches no longer claim sheet movement; actual vertical pan/spring and expanded vertical scroll retain their existing ownership and protections. Sleep, own Buddy drag, help, reduced-motion/background guards remain.

62 Buddy checks plus40 Home/panel/sheet checks pass; TypeScript, scoped lint and diff-check pass. Independent review found no actionable issues and independently verified actual vertical drag keeps sheet/globe ownership through spring completion. Condensed React Native quality review passed. Stable hashes: host D6AA1C66CDD9EFEBA758848C68BC43F39D6C4D7E3C8B5081FCB4F4BEB1EED68B; panel1A0E6F3143724569D6DEA7D74D841F5FAECAEF9A866F9EDCAF985850EBC55BB0.

Native CPH2813/Android16, Codex8081: captured two screenshots while one1500ms horizontal card swipe was in progress. Cards changed from Goa toward Vettukadu while Buddy changed map-holding pose between captures, remained visible and retained position. Temporary screenshots buddy-swipe-a.png and buddy-swipe-b.png. This verifies animation continuity for the reproduced gesture, not a full frame-time/performance or other-device benchmark. All baseline dirtywork retained, local/unpublished.


## Final publication check - 2026-10-28
Product owner authorized pushing the current Mobile batch and merging it into main. Publication branch codex/buddy-polish is based on main53cfab6. Unrelated .claude/agents, AGENTS.md and CLAUDE.md changes are excluded and remain local.

Full repository suite:837/837 passed, zero skipped, including a new disposable localhost PostgreSQL cluster. Source/test ESLint and TypeScript passed. Full-suite run preceded the final expanded-map layer correction; its74 affected map/Story checks, TypeScript, scoped lint and diff-check then passed. Corrected one stale attribution assertion from the already-merged selected-Story feature to include its existing !temporary guard; runtime attribution behavior did not change.

Final independent review found expanded Story map messages could be hidden behind its native full-screen modal. Corrected anchored help to use a clear native overlay above the map, retaining Buddy visibility, window anchor coordinates and guarded Back/backdrop dismissal. Legacy fallback uses one modal. Reviewer confirmed no remaining publication findings; map-help SHA256 E060C6CE64D5D473EA3DDC0DC18C7F6CB26E7EB7255F0AA36D6464AD8C50E821.

Final native expanded-map confirmation remains pending because the product owner reports the phone is disconnected. Earlier physical Home tap/reopen, card-swipe continuity, sleep/wake and compact Story message checks remain recorded above. Automatic greeting timing, native reduced-motion/TalkBack, other devices and broader performance matrix remain pending. No live backend writes, dependency/native configuration changes, manual deployments or Web repository publication.

This entry records publication readiness; GitHub PR/merge state is the authoritative subsequent publication record. Earlier local/unpublished entries are historical checkpoints.
