# Buddy on-map prototype: backend preflight

Backend Developer, 2026-10-26. **Decision: no backend change required; ready for Architect gate release.** Fresh schema completion is recorded below.

## Scope and preserved baseline

Story-only Buddy preview with explicit Play/Pause/Replay, a quiet neutral companion beside the authoritative live location marker, and coordinated floating presentation/help/success feedback. No GPS pipeline, route calculation, backend, persistence or permissions change is proposed. Home/discovery and editor preview defaults remain outside this prototype.

Mobile base `955ecac21ae554ae428c9efb36d2f8ab6406e935`, with unpublished jump/run work in PROJECT_STATUS/ROADMAP, Buddy README/assets/sprite/host/provider/model/store/animations, create/Travel/use-trip-location success handling, and three tests; retain the feasibility report and existing jump/run QA/preflight/evidence. Starting dirty inventory was inspected and no prior work modified by this preflight. Web base and prior schema context are recorded in buddy-jump-run-preflight.md; fresh evidence will be supplied by Architect. No connector SQL calls will be made by this specialist after the previous tool hangs.

## Local contract comparison

Inspected repository core/discovery/detail/creation and current rpc_integrity_hardening migration contracts, existing public queries, geographic preview geometry, native map overlay and accepted location/GPS lifecycle.

- `loadPublicJourney` first gates through `get_public_journeys(journey_filter)` and only then invokes `get_journey_detail(target_id)`. Public detail normalization already consumes ordered stop UUID/name/sequence/latitude/longitude/photo fields. The prototype should consume the already-loaded stops, introducing no new request or response field.
- Migration `20261001020000_journey_details` defines ordered stop coordinates and published-or-owner detail visibility; its public wrapper is invoker and private implementation is stable definer with empty search_path and explicit published/owner predicate. Discovery migration exposes only published records through an explicit projection. These contracts are sufficient for the same Story geometry and selection behavior.
- `travelLegs` builds client spherical arcs from existing valid coordinates, excludes coincident legs and respects missing-coordinate segments. Its derived preview coordinate is illustrative and must never enter actual location, arrival/completion or persisted state.
- `navigationFix` accepts finite coordinate bounds, timestamp not in future, age at most15 seconds, accuracy between0 and50 meters. The actual marker remains the same accepted fix and heading. Neutral Buddy is decoration anchored with screen offset; do not invent geographic offsets, extrapolate or snap to route.
- `useTripLocation` retains one existing foreground location controller, synchronous pause/finish/blur/background cleanup and successful-start Run handling. Add no observers, media uploads or travel_tracks calls. Preserve current help/confirmed-save Jump and successful-start/resume Run through presentation ownership rather than changing stored Buddy preference.
- Current hardening migration uses a constrained NOLOGIN/non-BYPASSRLS journey_rpc role, explicit owner policies, narrow grants and hardened save/media helpers. This rendering prototype needs no new database capability.

## Safe local test plan

No live rows, saves, uploads, fixtures, seeds or migrations are needed. Use deterministic synthetic stops/fixes and mock location ports: equivalent plane/Buddy coordinates/timing; retained Play/Pause progress and intentional Replay reset; invalid/missing/coincident/date-line coordinates; manual selection, gestures, blur/background and reduced motion; one Buddy owner and release after map failure/unmount/exit; preference off and asset fallback; accessible existing help and preserved jump/run; unchanged dot/arrow and accepted fix validity; zero new watchers and unchanged GPS cleanup; no preview coordinate entering arrival, actual position or completion. Native visual checks should verify anchoring/contrast/touch pass-through and essential controls with no live write. Performance/battery benefits are not established by unit tests or screenshots.

No isolated database target is needed for unchanged presentation contracts. If scope expands to backend persistence/API/location behavior, pause for a refreshed preflight and verified disposable target with owner/other/anonymous authorization fixtures before writes. Recover only this task's changes while preserving prior dirty work.

## Fresh-schema completion

Architect supplied successful read-only project/history/catalog results in `buddy-on-map-schema-evidence.json`. Reviewed actual metadata timestamp **2026-10-26 17:32:59.860813 UTC** (23:02:59.860813 IST), confirmed target `gwybjhqgnrpouwcdvusi`, ACTIVE_HEALTHY, ap-northeast-2, PostgreSQL17.11. This is a live target; no writes occurred.

- All13 hosted migration versions match default repository migration inventory through `20261026051106`. Web revision remains `4ab53cc464f2f99e9d905712678ed5954d94300e`, with only the same three untracked metadata directories. No pending migration introduced by this prototype.
- Actual `public.get_public_journeys` and `public.get_journey_detail` are stable invoker wrappers with empty search_path and anon/authenticated execute. Actual private implementations are stable definers with empty search_path, published-only discovery and published-or-owner detail. Detail includes ordered stop coordinates/sequence and creator UUID exactly as the inspected detail migration requires. Discovery includes the later creator projection from social_loop and existing destination_name projection; this is available metadata, not a new field needed by the prototype. Actual filtering/ordering/limit and public detail gating agree with existing client contracts.
- Actual journeys/journey_stops RLS is enabled, owner postgres, with published-or-owner read policies. Anon/authenticated grants remain SELECT, authenticated also owned journey DELETE; narrow journey_rpc ownership policies carry hardened mutations. No extra permissions or broader visibility are required.
- Actual stop UUID/parent/sequence/name/coordinate columns and constraints preserve coordinate bounds/pairs, unique journey sequence and foreign keys; journey ownership/publication/version/length constraints and owner/discovery/sequence indexes are present. These agree with core/detail and current hardening intent for unchanged rendering inputs. No table/column/index/constraint change is required.
- Actual journey-media/profile-avatars buckets remain private with15728640-byte JPEG/PNG/WebP limits. Storage read/thumbnail policies preserve existing referenced/owned media access, insert policies enforce authenticated owner paths (and owned journey for journey-media). The prototype uses bundled Buddy assets, so it adds no Storage access, signed URL, upload or bucket/policy change.

Migration history agrees for the current default chain. Historical standalone policies and additive live projection/bucket setup remain existing deployment-provenance differences; full database equivalence is not asserted and no reconciliation is proposed. None blocks this feature's unchanged read contracts. This bounded assessment does not constitute a new full backend security audit.

Database / RPC/API / RLS / grants / Storage requirements: **none**. No missing feature-specific evidence remains. Architect may record gate release and assign local implementation within the stated scope. Safe validation is the synthetic rendering/lifecycle plan above; no database fixtures are needed. Live changes, commits, pushes and publication remain unauthorized. Local/unpublished; this specialist changed only this report. Architect owns the schema evidence file.


Architect acceptance: released 2026-10-26 after completed current-schema/migration comparison. Local bounded Story preview and live companion implementation/tests authorized. No live writes/publication/deployment authorized.
