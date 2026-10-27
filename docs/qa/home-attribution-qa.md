# Home globe attribution: focused QA

QA Tester, 2026-10-25 21:50 IST. **Result: focused acceptance checks pass; no actionable finding.** Code remains local/unpublished.

## Verified snapshot and behavior

Base: Mobile `main`, `e527e105b7d1b0a45e04d85fa83d771c6cee8380`. After Architect's stable-snapshot release, QA independently inspected the complete application/test diff, native globe prop wiring and the new test assertions. No app/test edits made by QA.

SHA256 content hashes independently confirmed:

| Path | SHA256 |
| --- | --- |
| `src/lib/discovery/globe-style.ts` | `00844168140125A716EFA00583627FA780F28AC511838A161F8945D530BE1A57` |
| `src/lib/buddy/map-controls.ts` | `4451B875D83723F4C98F6ADFD259DE75715747E6595EBB32D1A88077B2199CC8` |
| `tests/journey-buddy-floating.test.mjs` | `79758A97C71AE24B13A3C91D274B744400703F61B45E4C897FA57DCFB2916699` |
| `tests/create-flow.test.mjs` | `D046763313CB93FA4B47A8402CF3A20F9C53FE192BCCFD5894545D9934C22F4B` |

- Attribution moves to top 12/left 116 beside the unchanged top 12/left 12 logo. Native map and Buddy protection both consume the same anchors and add the same header inset. Both native controls remain enabled.
- New geometry coverage compares the old obstruction with the released space, tests header offsets 0/80 and compass present/absent, checks nearest-safe placement and rejects overlap with every retained control. Position/spacing assertion preserves at least 8 dp after the protected logo footprint.
- Existing preview/Home component tests now load actual style constants. Other affected harnesses resolve the new pure-module import rather than stale hardcoded anchors. Journey control logic, map/camera handlers, data queries and dependencies are unchanged.

## Checks

- QA executed `git diff --check`: pass (only Git's pre-existing LF/CRLF conversion notices for status documentation).
- Mobile writer's execution evidence supplied through Architect: **218/218 pass across seven relevant suites**, `npm run typecheck` pass, current-source lint pass with `--ignore-pattern .local-tests/**`. Full lint encounters 40 pre-existing stale historical snapshot import errors. QA inspected the stable diff and did not redundantly rerun these passing checks.
- As requested, no full test suite, build, Android export, installation, deployment or live database writes were performed for this task.

## Native acceptance evidence supplied by Architect

Architect personally captured and inspected CPH2813 / Android 16, native existing Expo development client, Metro IPv4 localhost:8081 with adb reverse; online map loaded. Existing GPS/permissions were untouched and not tested. Home shows the logo and info button together, legible and nonoverlapping. Tapping info opens the settled attribution panel containing Mapbox/OpenStreetMap/Maxar credits and existing telemetry/privacy/feedback actions; Android Back restores Home. Dragging Buddy from native (390,880) to (780,460) lands in the released upper-right region with controls unobscured and no help popup.

Local screenshots: `<local-temp>/home-attribution-before.png`, `home-attribution-after.png`, `home-attribution-panel.png`, `home-attribution-restored.png`, `home-attribution-buddy.png`. Before/after include intermediate refresh banners; final Buddy capture is clear. These are local artifacts, not published links. QA did not operate adb/Metro or independently observe the live phone; device results above are attributed to Architect's direct verification.

Native compass interaction, rotation, large-text/accessibility and iOS were not exercised. Automated compass footprint coverage passed per writer evidence; no broader native claim is made. Independent code review is a separate Architect-owned handoff.
