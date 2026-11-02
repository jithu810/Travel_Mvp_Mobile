# Home card polish — 2026-11-02

Scope: smaller Locate/Explore visuals in Home cards, with a red filled heart for the current viewer's verified liked state. Preserve card geometry, horizontal browsing, map, panel and navigation positions. Local work only.

Baseline: `codex/published-journey-edit-buddy` at `76370ebdbd0ec83b3f7deb07aeb5be1d942ee50e`, with existing dirty application/tests/status work and untracked feed files preserved. `home-journey-card.tsx` was clean before this task.

Assessment before implementation: inspected `home-journey-card.tsx`, `home-control-icon.tsx`, `discovery-panel.tsx`, `discover.tsx`, `types/journey.ts`, `use-journey-social.ts`, `social/queries.ts`, and approved UI guidance. Button styling is UI-only: unchanged handlers, dimensions, data contracts, auth, persistence, APIs and Storage. The existing public card model has only aggregate likes; adding viewer state needs a new use of the existing authenticated read. That part is paused for Backend Developer read-only preflight. No new like mutation is planned.

Checks: focused tier overall; visual comparison on the connected physical phone, relevant Home/social regressions, TypeScript and scoped lint if state wiring is added. No full suite or broad refactor. No live writes for verification.

Backend Developer preflight completed 2026-11-02 01:33:25–01:33:48 UTC against confirmed shared project `gwybjhqgnrpouwcdvusi`. Live metadata/history confirms `get_journey_detail` and private detail match migration `20261001020000`, caller-scoped liked state, visibility gate, stable functions and explicit execute grants. `journey_likes` has own-user SELECT RLS and composite PK; no new table access needed. All 13 canonical migrations present, with the known registration-email reconciliation gap unrelated to this read. Storage unchanged. Gate released: reuse existing `useJourneySocial` read-only, isolated from public cache; render filled only for verified true, unknown/error outline. Existing focus/resume/account replacement behavior retained. Virtualized mounted cards bound reads. Safe checks use mocked social responses and account replacement, plus read-only physical browsing; no live likes/writes are test-authorized.

Result: smaller 24dp icons and 10dp labels in inline rounded pills, retaining the original normal 58dp action footprint and comfortable hit areas. Verified-liked heart/count uses red `#FF5364`; all other/unknown states remain outlined. The count uses verified social totals when available. No Home like toggle added.

Validation: TypeScript and component ESLint pass; diff whitespace check passes. Initial affected run: 65/66 pass; unrelated pre-existing Search test fails because its harness lacks the `journey-feed-session` mock required by the existing dirty Search implementation. Rerun excluding only that exact Search test: 65/65 pass. New Home test covers both card modes, verified liked/unliked and unknown states, authoritative totals, accessible liked label and no writes. Existing social tests cover anonymous, failed reads and stale controller completion.

Independent Code Reviewer: no actionable findings; reviewed component SHA256 `24B04A2CDFBD3BFB87AD2D8B301BE8E044C2C1DA1F9A55FA0D5474D4E41E29E4`, existing hook/controller and virtualization; independently passed 3 affected Home tests.

Physical phone via Metro8081: before/after appearance and two horizontal swipes confirmed. Card bounds, panel/map/status area and bottom navigation positions preserved; no new scroll behavior. Viewed Goa, Vettukadu and Church To home cards. Screenshots in Windows temp: `home-card-before.png`, `home-card-after.png`, `home-card-swipe.png`, `home-card-next.png`. All inspected cards had outline state; filled-red branch is verified synthetically, not through a live like write. No backend mutations performed. Large-text/wider-phone appearance and externally changed likes during an in-flight refresh remain unverified. Existing reads retain previous verified state while refreshing, timeout after 15 seconds, and do not abort on blur.

Local/unpublished. No commit, push, merge, deployment or database change.
