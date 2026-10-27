# Buddy speech bubbles QA — 2026-10-25

QA Tester, final update 22:23 IST. Local/unpublished. Base revision `e527e105b7d1b0a45e04d85fa83d771c6cee8380`, Mobile `main`. Starting dirty Home attribution work and unrelated tests/docs preserved. Backend preflight is recorded in `buddy-bubbles-preflight.md`; no backend, dependency, permission or live-data change is required or tested through live writes.

Architect native follow-up at 22:24 IST: Visit Create navigated to the Create screen without creating a record. Screenshot `<local-temp>/buddy-bubbles-tour-navigation.png` shows the safe no-fit ellipsis because that layout lacks bubble clearance; tour/help dismisses rather than covering controls. Native cross-screen tour continuation through Create is therefore limited by available space. No fields were filled or save/create actions invoked.

## Automated result

Cosmetic-only follow-up: BuddyHelpSheet ivory/teal styling and shorter copy verified on CPH2813/Android16, screenshot `<local-temp>/buddy-bubble-design-current.png` (captured during Fast Refresh banner). Full two-line Explore message, both actions, close and tail visible. Buddy30/30, TypeScript and bubble-file lint pass. Independent review has no actionable findings; file SHA256 `922fefd0d54893c77e37f2721ac78647bb27619544793edbfee6e9c9a7fa684f`. No behavior/host-geometry changes, live writes or publication; enlarged-font device check pending.

- `node --test --test-concurrency=2 tests/*.test.mjs`: 721 tests, 720 pass; the unchanged disposable PostgreSQL Storage-policy test failed to start `pg_ctl` under the Windows sandbox token (error 87).
- Targeted retry `node --test tests/thumbnail-policy.test.mjs` outside the sandbox: 1/1 passes using a newly initialized local synthetic cluster, shut down by the test. Thus all 721 cases passed across the main run and this isolated retry; no hosted data writes.
- `npm.cmd run typecheck`: pass.
- `npm.cmd run lint`: 40 existing unresolved-import errors confined to preserved `.local-tests/publication/claude-code-setup` and `part-a` historical snapshots. No current feature lint errors.
- `node node_modules/eslint/bin/eslint.js src tests --max-warnings=0`: pass, zero warnings.
- `git diff --check`: pass (Git prints existing LF/CRLF conversion notices).
- After review and native layout fixes, `node --test tests/journey-buddy.test.mjs tests/journey-buddy-floating.test.mjs tests/story-interaction.test.mjs`: **114/114 pass**, including new same-height tour placement and no-fit gesture recovery regressions. Final `src tests` lint rerun passes with zero warnings. Writer reports final typecheck pass. Broad 721-case run above predates these bounded UI fixes; it was not rerun after them.

Executed component/model tests cover above/below placement, clear bounds and protected controls, relocation, two contextual content actions, Android Back cleanup, optional tour progression/navigation/exit across actor remounts, stale-route/disabled/removed-owner rejection, reaction once per visit with a shared 30-second cap, own UUID versus different/unknown/loading/error identities, and reaction suppression around guidance/arrival. Existing editor tests verify capture opens the guarded current memory buffer without saving. Existing location/navigation tests passed; Buddy introduces no independent GPS ownership.

Inspection confirms the list/detail query count is unchanged: the optional `creatorId` comes from the already fetched, publicly gated discovery entry. No new endpoint, AI call, package or save path was introduced. Only idle/walk assets are used. The tour and reactions are in-memory state.

## Native evidence and limitations

Architect performed native testing on the connected CPH2813 / Android 16 Expo development client with Metro on port 8081. Wi-Fi appears in the device status icons; GPS was unchanged and not activated for these checks. QA did not operate adb; QA visually inspected the supplied Home and tour-step-2 screenshots. These are physical-device screenshot evidence, separate from the component harness.

- Initial native 124dp placement clipped the action area. The final compact layout keeps the two actions outside the scrolling message body, making them visible and reachable.
- `<local-temp>/buddy-bubbles-compact-home.png`: tapping Buddy shows a rounded speech bubble above his head with a tail, close, Open my drafts and Show me around. Mapbox branding, Home controls and bottom navigation remain clear in this image.
- `<local-temp>/buddy-bubbles-tour1.png` and `buddy-bubbles-tour2.png` in the same directory: Architect tapped Show me around then Next. The second same-height tour step stays visible with Visit Create and Next; its longer message remains in a scrollable body.
- Physical Travel/GPS/navigation/arrival suppression, authenticated own-story reactions, actual draft entry, full tour route traversal, large text, TalkBack, rotation and battery behavior remain unverified. No live data writes occurred; no save/upload/create/publish/delete was performed.

Both independent-review findings were fixed and covered by final targeted regressions: tour transitions retain the measured height, and no-fit measured help releases gestures for drag/retry. Architect reports independent re-review found no remaining actionable findings on snapshot `40ac2bfd6e0d7d69c8f496d0391e3e87f7e53992a9b4005725fcdfba37ad99e9`. QA found no new actionable failure in the final targeted run. Full-tree lint retains the unrelated historical-snapshot blocker above.

## Tested snapshot

Final feature app/test content hashes below were captured at the frozen post-fix handoff at 22:22 IST and match the contents exercised by the 114-case targeted run. Documentation edits are excluded.

| Path | SHA-256 |
| --- | --- |
| `src/app/journey/[id].tsx` | `6029294778686acd76dc276b797deb84910688b08c3f9e5281b7c14d21e83113` |
| `src/components/buddy/buddy-help-sheet.tsx` | `8c6ce35ece23e8555f721c19d512254370d771054ed5a7bedf612202a23ec947` |
| `src/components/buddy/journey-buddy-host.tsx` | `03b676189ebf15017a4df5c6676e72a2273e09f8f01839efaaa3f4f4c41e802f` |
| `src/lib/buddy/geometry.ts` | `625d34b7f48cb083718b8fee78741ef63d6df0b11794f5ccadae1b1c4ac66555` |
| `src/lib/buddy/model.ts` | `ac98687c05561d611f2d1d5e482ff689c7d8fdcba7c2d62df30dd05b4879d92d` |
| `src/lib/buddy/store.ts` | `2f17f4fb02e51d42f81da643685c958e529d05449a55e75bb99120dc22c19ab0` |
| `src/lib/discovery/queries.ts` | `de82a8b5b8239c1eb2380cc8c555b53874ed0921e0adcfebfa956aa43476eee3` |
| `src/types/journey.ts` | `f574821bbe362afacf1094b6056448a519322aa5a7889123e238932766afbf48` |
| `tests/journey-buddy.test.mjs` | `7e8ec2771be9565afbb9cf3bd3f1730ebb5a7af96d4c7af753bc490b03821d28` |
| `tests/story-interaction.test.mjs` | `f31e17610631829f59f3b689f9db2741cf8f7757b7f3d8e1fbb558884841dbdf` |
