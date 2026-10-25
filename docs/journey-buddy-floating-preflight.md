# Journey Buddy floating-layout backend preflight

Backend Developer, 2026-10-25; fresh root recovery began with successful catalog evidence at 13:10:24.64695 UTC (18:40:24.64695 IST). **Decision: no backend change required; ready for Architect gate release.**

## Scope and preserved baseline

The authorized correction removes the in-flow BuddyDock reservation (72 dp plus safe area), places Buddy in a floating overlay within the available viewport minus measured protected rectangles, finds the nearest safe drag placement with an 8 dp gap, and permits collision-free short edge walks. It changes presentation/geometry only. The existing device-local opt-in, bundled PNGs, contextual UI callbacks and semantic travel context are retained. No new backend/API/authentication/Storage/GPS interface is proposed.

- Mobile baseline: `codex/remove-3d-companion`, revision `7c113f07a595af7977a54a961752dfb4e0598ea7`, with existing Journey Buddy implementation, tests, assets, status and reports dirty/untracked. All existing work preserved; this specialist owns only this new report.
- Web baseline: `main` with existing untracked `supabase/customize-stops-jwt-correction/`, `supabase/customize-stops-jwt-rerunnable/`, `supabase/standalone-customize-stops/`. Each still contains only CLI cache metadata, no SQL.
- Repository still has eight default migrations: core schema, public discovery, details, creation, media-size limit, social loop, travel tracks, field-test destinations (`20261001000000` through `20261004000000`). Existing `docs/journey-buddy-preflight.md` records their earlier comparison with live definitions and the unrelated hosted thumbnail/standalone-copy additions.
- Established same-conversation shared live target: `gwybjhqgnrpouwcdvusi`. It is not an isolated database and no writes are authorized.

## Checks and evidence

- Local Git status, revision, migration filenames, cache-directory inventory and prior completed preflight were read successfully.
- One direct `execute_sql` single SELECT/UNION requested current timestamp; journeys/stops RLS/ACL; actual definitions/ACLs of `save_journey`, `get_account_journeys`, `get_journey_detail`, `get_public_journeys`; affected journey/stop/media policies; and journey-media bucket configuration.
- That call returned no payload and was interrupted after 368.7 seconds. Requested early yield was not returned by the tool wrapper. No result from this call is claimed; no fresh migration-history result yet. Parent has been notified and requested no further network calls from this specialist pending root recovery.
- Architect then recovered fresh direct read-only catalog results on the same established project. At 13:10:24.64695 UTC, journeys/stops/profiles/saved_journeys all had RLS enabled. Actual journeys/stops table ACLs grant anon SELECT, authenticated SELECT/INSERT/UPDATE/DELETE, customize_stops_rpc SELECT, and full postgres/service_role rights. Profiles authenticated ACL is SELECT/INSERT/UPDATE/DELETE; saved_journeys authenticated ACL is SELECT/INSERT/DELETE.
- Separate actual `pg_get_functiondef`/ACL results for the four public RPCs confirm: save_journey is SECURITY INVOKER with empty search_path, auth UID required, owner row plus updated_at version check, <=50 stops, owned media path and existing Storage-object checks; authenticated/service roles may execute, anon/PUBLIC may not. get_public_journeys/get_journey_detail remain SQL/STABLE empty-search_path wrappers into private implementations with anon/authenticated/service_role EXECUTE. get_account_journeys remains SECURITY DEFINER with empty search_path, authenticated UID gating for own draft collection and guarded published/saved branches, unchanged ACL. No layout-specific RPC contract is needed.
- Fresh live policy definitions retain published-or-owner journey reads and owner writes with both update USING/WITH CHECK. Stops read parent published-or-owner and write owned parent with both update predicates. Actual journey-media bucket is private, 15,728,640 bytes, JPEG/PNG/WebP. Insert requires UID path and owned journey; read permits owner path or exact published/owned cover/stop reference; thumbnail policy retains UUID suffix/full-v1-reference guards. These match the prior verified reuse contract and relevant repository migration intent.
- Fresh list_migrations returned only `20261024041322 journey_media_thumbnail_v1_read`. The eight default repository migrations and hosted history remain non-equivalent; existing thumbnail/standalone-copy deployment provenance drift is unchanged. No reconciliation is proposed. No user records or Storage object rows were read. Whole-database bytewise equivalence is not asserted; current affected definitions and permissions were checked directly.

## Impact and safe test plan

Database/table/column/constraint/index, RPC/API, RLS/grant and Storage impact is none: overlay layout and drag/collision math need no stored state beyond the existing device-local preference. Existing guarded editor callbacks continue to own create/save/upload flows; travel context remains a read-only projection of the same foreground controller. Fresh current metadata confirms these reused contracts remain compatible. No migration or live test write is needed for layout correction.

Validate pure geometry bounds/collision/nearest-placement cases, roaming paths, small-screen/rotation behavior, map controls, tab bar and editor interactions, plus existing Buddy preference/lifecycle/travel tests. Run TypeScript, lint, relevant suite and Android export; perform native screenshots and drag/control checks without create/save/upload actions. No database fixtures are required. If backend scope expands, pause and define a verified disposable database, synthetic owner/other-user/anonymous tests, migration compatibility and recovery before any isolated write.

- Missing feature-specific evidence: none after successful Architect catalog recovery; interrupted specialist call remains disclosed as a tool limitation only.
- Next owner: Architect release, Mobile Developer layout correction, then QA and independent review.
- Architect gate: **released** after Architect read the completed no-change report on 2026-10-25. Local Mobile implementation may proceed within the accepted floating-layout scope.
- Live changes/publication: not authorized; report local/unpublished.
