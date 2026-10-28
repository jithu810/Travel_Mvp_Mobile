# Remix editor QA and independent review

QA Tester / independent Code Reviewer (non-author), 2026-10-27, Asia/Kolkata. Local, unpublished work based on Mobile `main` `b159a74`.

## Reviewed snapshot

Final application/test scope is 13 paths: `src/app/create.tsx`, `src/app/draft/[id].tsx`, `src/components/journey/journey-options.tsx`, `src/components/journey/map/map-frame.tsx`, `journey-map.native.tsx`, `native-map.tsx`, `story-walking-buddy.tsx`, and `tests/create-flow.test.mjs`, `story-interaction.test.mjs`, `story-walking-buddy.test.mjs`, `remix-attribution.test.mjs`, `auth-remix.test.mjs`, `static-map.test.mjs`.

Writer-reported final SHA256 aggregate: `AA408C2300AAAF70486FD61AB8C183B184B1F86AE2DA0F11FDA0C9D875D8A28F` (sorted relative-path plus uppercase per-file SHA256 lines, LF). Reviewer inspected this final diff and reran its six affected suites; the aggregate itself was not independently confirmed because that separate tool batch was interrupted.

## Automated evidence

- Independent final command: `node --test --test-reporter=dot tests/create-flow.test.mjs tests/story-interaction.test.mjs tests/story-walking-buddy.test.mjs tests/remix-attribution.test.mjs tests/auth-remix.test.mjs tests/static-map.test.mjs`: exit 0, **188 passing cases**.
- Independent initial focused run: 152/152 pass. Broader initial `npm test`: 799 cases, 796 pass, three failures. Two were stale source assertions expecting the deliberately removed draft route/cover map; final author fixes and the independent 188-case rerun cover both. The third was unrelated disposable PostgreSQL startup failure (`pg_ctl` restricted-token error 87 / start error 3).
- An isolated elevated PostgreSQL retry was attempted in a tool batch that did not surface usable output before interruption; no passing result is claimed. A full-suite pass is therefore not established.
- Author reported typecheck and source/test ESLint passing on the final snapshot. Full `npm run lint` remains limited by 19 errors from unrelated `.local-tests` backup imports. These are author-reported checks, not independently rerun here.

Coverage includes authenticated/anonymous remix, new/private-copy reuse, blocked/error handling, legacy valid/malformed redirects, guarded owner hydration, actual route keyboard events passed through hydration, sourceId-only map opt-in, card/pin selection, controller replacement and timer cleanup, forward/reverse/rapid retargeting, invalid/coincident/date-line coordinates, Run frame-rate selection versus default Story Walk, Idle arrival, reduced motion, lifecycle and map ownership/help regressions. Existing copy/save/auth query implementations are unchanged by the application diff.

## Independent code review

No remaining actionable findings in the final scoped diff. Review confirmed all remix entry destinations and legacy redirect resolve to the guarded editor, original copy/ambiguity/focus safeguards remain, and only remix drafts opt into the numbered map and Run motion. Default Story motion remains Walk; ordinary editor previews remain on the existing photo-overlay path. Playback is selected locally, paused when inactive, and disposed on replacement/unmount. Map loader propagation preserves the motion option and existing native fallback behavior.

One low-severity finding was returned and fixed before completion: route `keyboardOpen` was not forwarded through `DraftEditorEntry`. Final code now threads it into the editor, with a keyboard-event/hydration regression assertion. The two stale full-suite assertions were also returned and fixed. No reviewer application edits were made.

## Native evidence and limits

Architect performed read-only checks on the product owner's CPH2813 / Android 16 using the existing remix draft and running Metro. Architect reported direct opening from Create history, numbered map and Buddy help, Idle at selected stop 1, forward selection and Idle at stop 2, a captured Run pose between stops 2 and 3, and reverse Run from stop 5 toward 4. These observations are Architect evidence; this reviewer did not operate the phone. Temporary screenshots remain outside the repositories and include private place information; do not publish them.

An isolated swipe-step count was not established because the swipe capture advanced across multiple cards and concurrent interaction could not be excluded. No concrete new MemoryDeck defect was established; the deck implementation is unchanged. Rapid native reversals, full accessibility/reduced-motion matrix, background/foreground behavior, large text and extended performance remain pending. Automated fixtures do not establish these device behaviors.

No live remix creation, save, publication, upload, schema change, commit, push or deployment was performed for QA. Shared policy documentation was independently reviewed separately: both repositories and reusable roles consistently distinguish a recorded UI-only assessment from full live-schema preflight, while retaining explicit live-write approvals; both modified TOML files parsed successfully and policy diff whitespace checks passed.
