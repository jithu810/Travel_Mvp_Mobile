## Customize temporary route and travel preview - 2026-10-28
- [x] Local card selection -> selected journey preview -> optional local Add stop -> Travel Mode; no customization draft/review/publish flow. Reuses map/card/sheet/picker primitives, validates and isolates local routes, preserves resume identity and prevents active-trip route edits.
- [x] Independent QA78/78; typecheck/scoped lint; independent review fixes verified. Earlier812-test regression covered after isolated local-PG retry. Native four-stop preview/full map, local append to five stops and Travel Ready state verified.
- [ ] Real GPS trip, accessibility/large-text and other-device matrix; publication not requested. Local routes last only for this app process.

## Remix direct editor and running Buddy - 2026-10-27
- [x] Local implementation: skip remix summary, preserve legacy links/owner loading, use Story numbered map and remix-only Run/Idle on card selection; preserve Story walking and normal create map. Forward keyboard state into loaded editors.
- [x] 188 focused tests pass independently; typecheck and source/test lint pass. Independent review has no remaining actionable findings after keyboard-forwarding fix. Existing remix native forward/reverse movement and arrival Idle observed on CPH2813 / Android 16. Shared UI-only preflight policy updated for both repositories; no live writes or publication.
- [ ] Expanded accessibility/lifecycle/performance device matrix and fresh remix completion verification (requires authorized live copy). Full lint has existing ignored backup import errors; broader isolated PostgreSQL verification limitations are recorded in the QA report. GitHub publication not requested.

## PR #19 review fix round - 2026-10-27
- [x] Merge origin/main; restore move-to-stop camera on Story selection; Story map Buddy help entry; Home Locate ownership release after arrival; Travel follow ownership without floating flicker plus throttled projection; expired celebration handling; remove dead Story preview code; scrub LAN/user paths from docs; Story help beside Fit and shown only while the walker owns the map. Published as an update to PR #19 (pending device checks); npm test 794 tests (793 pass, 1 environment skip), typecheck and lint pass.
- [ ] QA, independent review and physical-device check (Story help placement in compact/expanded maps, Home floating Buddy return after Locate, Travel follow without flicker).
## Walking Buddy publication checkpoint - 2026-10-27
- Owner accepted the Home and Story behavior and explicitly requested GitHub publication. Publishing one batch on codex/walking-buddy-home-story, based on main955ecac; separate Home-like-count PR18 is excluded. Includes the existing local Jump/Run and map-ownership/live-companion support used by the final walking experience. No application edits after final QA; publication adds only related test harness imports and reporting.
- Feature QA/review evidence: Home155 and Story245 independent checks, prior Jump/Run and map-loader evidence linked below. Complete-stack publication verification is recorded in docs/qa/buddy-walking-publication.md. User confirmation records acceptance, while specific remaining native accessibility/lifecycle/performance and expanded-view checks remain listed in QA reports.
- Authorization covers commit, branch push and PR creation; merge, production deployment and live database changes remain unauthorized. Historical local/unpublished entries below describe their original checkpoints; GitHub PR is the current publication record after the authorized push.
## Story card-driven walking Buddy - 2026-10-27
- LOCAL: removed Story Play/Replay/Use plane controls and legacy Buddy help overlays from the new path. Real walking sprite follows next/previous/direct card/pin selection, rests at the selected stop, uses36dp compact/64dp expanded and shares position across map expansion. Ordered reverse/rapid retargeting, missing/coincident/date-line coordinates and reduced-motion/lifecycle guards covered. Home walking Buddy and Travel GPS remain unchanged.
- VERIFIED:245 unique independent checks passed; final11-file snapshot54295e3a096c2c4a06c036d070f5ef6856f8b3dd6d70c369a27f393026c03b94. Independent code review found no remaining actionable issues after correcting expanded StorySheet suppression and unknown-motion preference handling. D:/JBuild TypeScript and scoped app/test lint pass; runtime synced with backups. See docs/qa/story-walking-buddy-qa.md and preflight.
- NATIVE: CPH2813/Android16 updated Story compact map shows smaller Buddy; Play/Replay/Use plane/help removed. Forward captures show changing walking pose and movement among selected stops. Concurrent phone interaction changed cards/panels during captures, so isolated backward/rapid and final expanded64dp checks remain pending (idle-phone request presented). Full accessibility/lifecycle/performance device matrix pending. No live record writes/backend/dependency/native build/publication; local/unpublished.
## Home Locate walking Buddy - 2026-10-27
- LOCAL IMPLEMENTATION: Home/Explore card Locate retains the existing cinematic route fit and replaces the plane with the original animated walking Buddy, idle at stop pauses/final arrival. Home-only opt-in; existing Story prototype and Create preview retained. Decode/layout ownership, bounded coordinate updates, lifecycle cleanup and disabled/image-failure plane fallback added without dependencies or backend changes.
- VERIFIED: independent QA155 unique checks passed; independent review by the non-authoring QA specialist found no actionable issues. Final four-file snapshot 2d13160b83024ab42cbfe15367f81773293d43e444f277188b4ff756126deab5. D:/JBuild TypeScript and scoped source/test lint pass; runtime files synced with backups. See docs/qa/home-walking-buddy-qa.md and preflight report.
- NATIVE OWNER CONFIRMED: owner reports Home Locate walking Buddy works (2026-10-27). Metro8081 and CPH2813 connected at <phone-LAN-address>. Full accessibility/lifecycle/performance device matrix remains pending. No live record writes, publication or native rebuild. Local/unpublished.
## Buddy on map prototype - 2026-10-26
- [x] Local Story preview controls/Buddy comparison and quiet live companion; no backend changes. Native image-loader correction verified with 191 focused tests/types/lint and independent 150 checks/review.
- [x] Android Story Buddy rendering and Play/Pause observed after correction; preview paused afterward.
- [ ] Live GPS placement/guidance collisions, remaining controls/lifecycle/accessibility and performance/usability evidence. Local/unpublished; no release claim. See docs/qa/buddy-on-map-qa.md.

## Buddy Jump and Run - 2026-10-26
- NATIVE RUN VERIFIED on latest runtime after successful Begin, returning to Idle; trip paused afterward. Latest two-second Jump awaits owner save retest. No publication/live writes.
- DURATION UPDATED: single2s Jump and stationary3s Run, both prompt after success/release; active guidance still takes priority. QA275/type/lint and review185 pass; loaded phone runtime, native new-duration confirmation pending. Local/unpublished.
- DELAY CORRECTED LOCALLY: prompt confirmed Jump after completion overlays clear, skipping only released-touch cooldown. Independent QA275/type/lint pass; review clear. Updated phone runtime; owner timing retest pending. Original native Jump occurrence is owner-confirmed; eligible native Run remains pending.
- IMPLEMENTED LOCALLY: confirmed-memory one-shot Jump and accepted Begin/Resume stationary Run, using unchanged original transparent sheets with lifecycle/suppression/priority guards and once-only expiry. Backend no-change preflight completed.
- VERIFIED: 274 unique independent QA checks, TypeScript/source-test lint; independent review clear with 156 separate checks. Native updated app loaded and local Travel exercised. Native eligible Run and owner-operated successful-save Jump demonstration remain pending; guidance suppressed animation during the captured route. No publication or live writes. See docs/qa/buddy-jump-run-qa.md.

## Journey art for photo-less journeys and stops - 2026-10-27
- [x] Deterministic palette/route/pseudo-route art and View-only JourneyArt/StopArt; list cards and story surfaces no longer request slot-sized static maps or show the stock photo (globe pins and create flows unchanged). Committed locally (base 6579f64), unpublished.
- [x] QA/review fix round: circle credit never covered (hidden with notes or too little space; reserves space only when renderable), mini cap 8, memoized geometry, 0.005 degree minimum span, proportional pseudo highlight, gap-safe thinning, accessibility labels. 751 tests (1 environment skip); credit kept to one capped line, failed circle URLs remembered, carousel hint honest, typecheck and lint pass.
- [ ] Device check on phone (palettes, dark-palette legibility, deck rail clearance, viewer circle) and re-review.
- [ ] Deferred: journey.id seed via src/app/journey/[id].tsx after PR #19; mixed-coordinate timeline consistency; Mapbox no-wordmark policy for maps under 160 px; whether create/draft/customize flows switch to stop art.

## Home card like count - 2026-10-27
- [x] Show display-only like count (including 0) on compact and expanded Home cards with accessible pluralised labels. Tests, typecheck and lint pass; merged via PR #18.
- [ ] Physical-device check of compact/expanded cards (truncation with long facts, larger text, TalkBack label).

## Buddy opening investigation - 2026-10-26
- [x] Correct sparse-placement false no-fit, repeated search cost, above-only manual help and safe dialog fallback. Final focused QA128/128 and independent review64/64 pass. Publication authorized; draft PR prepared.
- [x] Rebind phone8081 tunnel to this laptop, start fresh Metro from D:/JBuild, confirm runtime attachment and full bubble opening on unconfigured Home. No rebuild performed or required by these JS changes.
- [x] Restore environment using owner-approved Expo automatic loading; verify configured-Home opening and tour step1/3.
- [ ] Complete final above-only/dialog native QA on unlocked phone, including Back/close/tour and larger text. Final files synced to active Metro; no rebuild needed. See docs/qa/buddy-bubble-opening-2026-10-26.md.

## Buddy speech-bubble companion experiment - 2026-10-25
- LATEST HANDOFF: 722 cases verified across broad/isolated retry, types/current-source lint pass, independent publication review clear. Latest Outdoor build copy prepared at D:/JBuild for user-operated Gradle with D:/GHome cache; no build/install started. New PR publication authorized; no merge authorized.
- COSMETIC REFINEMENT: ivory/teal bubble, compact pill/text actions, small accessible close and shorter tour copy. Native default-size appearance verified; Buddy 30/30, TypeScript and lint pass; independent review has no actionable findings. Local/unpublished; larger-text device check pending.
- IMPLEMENTED LOCALLY: tapping Buddy opens a measured speech bubble with a tail above/below him, at most two contextual actions and accessible close/Android Back. Collision checks protect measured controls and can reposition Buddy into available clear space; scrolling keeps larger text/actions within the bubble. Walking pauses while bubbles are open. Existing idle/walk assets remain; no GPT connection.
- GUIDANCE: voluntary Explore/Create/Account tour survives screen navigation and exits explicitly. Editable drafts offer Capture a moment through the existing guarded editor callback; other screens, including Travel Mode, explain capture requires a private draft and offer Open my drafts. Leaving Travel Mode stops foreground GPS as before. No opening/tour action saves or uploads anything.
- REACTIONS: own published-story applause compares current authenticated UUID against the already-returned public creator UUID; unknown/other/auth-restoring viewers get no ownership reaction. Automatic reactions are once per event/visit with a global 30-second cooldown retained across actor remounts, quiet during guidance/arrival/editor/keyboard suppression.
- VERIFIED: final focused Buddy/floating/Story 114/114 pass; TypeScript and current-source/test lint pass with zero warnings. Earlier broad 721 tests passed across the full run and an isolated PostgreSQL retry outside the sandbox. Full lint retains 40 pre-existing historical-snapshot import errors. Independent re-review found no remaining actionable findings on snapshot 40ac2bfd6e0d7d69c8f496d0391e3e87f7e53992a9b4005725fcdfba37ad99e9. See docs/qa/buddy-bubbles-qa.md.
- NATIVE CPH2813 / Android 16: compact Home bubble shows its tail, close and both actions; Show me around and Next keep the tour visible. Fixed native action clipping, same-height tour invisibility and no-fit gesture lock. Actions stay outside the scrolling message; insufficient space restores drag/retry. Active-GPS/capture, own-story, large-font and TalkBack device checks remain pending. Offline Expo dependency check passes with its reliability caveat.
- Backend preflight released without changes (docs/qa/buddy-bubbles-preflight.md). Preserved pre-existing dirty application/tests/docs. No dependencies, native build, permissions, backend changes, live writes, commits or pushes. Local/unpublished.
## Home globe attribution beside Mapbox - 2026-10-25
- IMPLEMENTED LOCALLY: the shared Home/Create globe keeps the native logo at top-left and places the native attribution button beside it (left 116 dp, existing header inset preserved). Buddy protection uses the same anchors, freeing the former attribution area while retaining compass protection. Journey/Travel maps, camera behavior and attribution functionality are unchanged.
- VERIFIED: 218/218 focused globe, preview, Home, Buddy geometry and Journey harness tests pass; TypeScript passes. Full lint reports 40 pre-existing unresolved imports in preserved .local-tests/publication snapshots; current-source lint passes with zero warnings. Backend read-only preflight released with no changes required; see docs/qa/home-attribution-preflight.md. No dependency, native build, backend or live-service changes. Local/unpublished; no commit or push.
- NATIVE CPH2813 / Android 16 (Architect): Home logo and info are adjacent, legible and do not overlap. Relocated info opens the native Mapbox/OSM/Maxar attribution panel with telemetry/privacy/feedback controls; Android Back dismisses it. Buddy drags into the freed upper-right map area with branding clear. Compass protection is automated-test verified; separate native compass interaction/rotation remains unchecked. Screenshots: <local-temp>/home-attribution-*.png. Independent review pending.

## Remix without inherited photos (Mobile) - 2026-10-25
- IMPLEMENTED LOCALLY and unit-tested: static map placeholders for photo-less places, stops and draft covers, direct-source remix credits (editor, draft screen, Account drafts, published journey) and an optional add-photos hint. Pending: device check, final review, publication approval.
- FOLLOW-UP (deferred): journey cards on Home/Explore/Search/Profile keep the stock photo until the list RPCs return stop or destination coordinates.

## Journey Buddy map flicker correction - 2026-10-25
- IMPLEMENTED LOCALLY: deduplicate idle/camera pin projections, reuse accepted relative pin geometry, ignore subpixel camera jitter and retain conservative protection during actual motion/loading. Initial map ownership and invalid-camera cache edge cases are covered. Page layout, root overlay layering and native drag are unchanged.
- VERIFIED:680/680 non-PG regressions including52Buddy/floating cases, TypeScript, zero-warning current-source lint and whitespace checks. Android export1714modules/56assets/4,081,544bytes; selected exported sources match final code. Offline Expo compatibility passes with reliability caveat. Independent review reports no remaining actionable findings on61-file snapshot8db188794999ab396e83b063bf48c9e96755896e7306d64e03b3e3d446484b18.
- NATIVE CPH2813/Android16: final Home Locate samples stay stable after camera settling; Journey loading/ready-map samples show visible walking Buddy. Hiding during genuine camera movement remains intentional for pin protection. Screenshot sampling does not establish subframe/battery/accessibility behavior. Evidence:docs/qa/journey-buddy-flicker.md and independent QA report.
- Backend refresh released with no change; no dependencies, permissions or environment-file changes. Local/unpublished:no commit/push/merge/deployment/nativebuild/livewrites. Buddy enabled on Journey; configured Metro8081 running. Earlier entries below are historical.

## Journey Buddy zero-space floating correction - 2026-10-25
- IMPLEMENTED LOCALLY: removed Buddy's reserved72dp+safe-area strip; page content/layout is identical off/on. Buddy now floats across clear viewport areas with8dp measured control/pin protection, nearest-safe dragging and collision-tested edge walks. Preserved native drag, preference/editor guards and foreground GPS ownership. No dependencies, permissions, backend or environment-file changes.
- VERIFIED:668/668 non-PG regressions including40Buddy/floating tests; TypeScript and current-source zero-warning lint pass. Unchanged disposable PG policy test retains earlier isolated pass, not rerun. Full lint retains40 existing historical snapshot import errors. Android export1714modules/56assets/4,078,348-byte Hermes bundle; offline Expo compatibility passes with reliability caveat.
- NATIVE CPH2813/Android16:off/on Journey card/footer crops pixel-identical; full card/creator/actions+slider fit. Fixed native map occlusion by elevating global overlay below startup/modals. Buddy visible on ready map, draggable into clear areas, and Previous memory still works. Independent review no actionable findings on61-file snapshot240db55ade86ad89b1b92a8d6e656aad6a87356a82c030d0b6d9b64d872524c8. Evidence:docs/qa/journey-buddy-floating.md and independent report. Buddy left enabled on Journey; configured Metro8081 persists in hidden background.
- Backend preflight freshly completed with no change. Local/unpublished:no commit/push/merge/deployment/newnativebuild/livewrites. TalkBack, broad rotation/large-font, activeGPS and battery measurements remain pending. Earlier entries below are historical checkpoints.

## Journey Buddy native phone follow-up - 2026-10-25
- CONNECTED CPH2813 / Android 16 to local Metro and verified real sprite rendering, ordinary tap helper, off/on Settings toggle and parking across Settings hide/restore. Found and fixed native drag opening help: one accessible responder View now owns the complete gesture; precise native drag moved Buddy without triggering help. Left Buddy enabled on Account with Metro8081 running. No environment files, new native build, permissions or live-service writes.
- VERIFIED final correction: 27 Buddy tests, TypeScript, scoped zero-warning lint; independent QA 655/655 non-PG regressions pass. Unchanged disposable PG policy test retains its earlier isolated pass and was not rerun. Independent targeted review found no actionable findings on snapshot def2bc45d0e35212e06761b48cbec1422a5c3a0c121cc86b78bc93bcb110c8ac. Android export passed, 1,711 modules/56 assets/4,058,228-byte Hermes bundle.
- Native map/GPS/editor-save checks remain pending: this no-dotenv Metro session has no map/backend configuration. TalkBack, large fonts, rotation and CPU/battery measurements also pending. Evidence and local screenshot inventory: docs/qa/journey-buddy.md. Local/unpublished; prior checkpoints below are historical.

## Journey Buddy 2D companion - 2026-10-25
- IMPLEMENTED LOCALLY on codex/remove-3d-companion from 7c113f0: default-off device-local Settings toggle (guests included), original bundled Idle/Walk pixel sheets, isolated low-rate animation, quiet native-driven roaming, drag/park, safe measured screen docks, local contextual help and guarded existing memory-editor action. Travel consumes existing semantic navigation/GPS state with docked reactions and bounded progress Walk; no extra tracking, backend writes, dependencies or native permissions.
- VERIFIED: 26 Buddy tests and TypeScript/current-source zero-warning lint pass. Final full suite 655 cases: 654 passed and one sandbox-blocked disposable PG test; isolated outside-sandbox retry passed 1/1, covering all cases across both runs. Android export passed (1,711 modules, 56 assets, 4,057,788-byte Hermes bundle); offline Expo compatibility passed with reliability caveat. Full lint still has 40 pre-existing import errors in preserved ignored publication snapshots. Independent final review found no remaining actionable findings after geometry, parking and native drag fixes.
- Backend read-only preflight released with no changes required. Exact tested/reviewed 31-file snapshot and evidence: docs/qa/journey-buddy.md and docs/qa/journey-buddy-independent.md. Phone unavailable; native sharpness, drag feel, accessibility, rotation and CPU/battery measurements pending. Future Wave/Jump/Sleep/blink artwork and Android over-other-apps pet remain future work.
- LOCAL/UNPUBLISHED: no commit, push, merge, deployment, EAS build or live-service writes. Enable in Account > Settings > Journey Buddy. Earlier status entries below are historical checkpoints.

## Complete 3D Travel Companion removal - 2026-10-25
- [x] Remove character assets, renderer, animation/preference/lifecycle code, preparation script and dedicated tests; remove unused Create guide while retaining Home globe/maps/navigation and loading coverage.
- [x] Remove direct Fiber/Three/types/ExpoGL/Asset dependencies and companion Metro overrides; retain Expo's transitive Asset dependency and unrelated locked versions. Backend preflight completed with no backend changes.
- [x] Focused Home tests 15/15, residual-reference scan and whitespace check passed; QA static inspection and independent review found no actionable issues.
- [x] Architect restored missing locked vector-icons dependency; post-restoration typecheck and zero-warning lint excluding pre-existing ignored .local-tests snapshots passed. Full lint remains affected by stale companion imports in those preserved historical snapshots.
- [x] QA full suite covered all 628 tests across the initial run (627 pass) and successful isolated PostgreSQL retry (1 pass); offline Expo compatibility and Android export passed. Source/asset maps exclude character/3D runtime and retain Home globe/Mapbox. See docs/qa/companion-removal.md.
- [ ] Physical-device verification: no phone connected. Local/unpublished; no EAS build or hosted changes.

## Hide own journeys from discovery - 2026-10-25
- IMPLEMENTED LOCALLY and unit/harness-tested: signed-in Home and Search/Explore browsing hide the viewer's own published journeys; typed search still finds them. QA/review fix round applied (id-based owner re-attach, non-blocking Search hold, 4 s fail-open, only-own empty copy). Pending: physical-device check (sign-in/out on Home and Search), final review and publication approval.

## Turn confirmation display - 2026-10-24
- IMPLEMENTED LOCALLY in isolated codex/turn-confirmation-display worktree: outgoing-turn confirmation shows Confirming turn and hides stale maneuver distance; existing fresh-fix/1-second/3-metre progress gates, accepted route trim and navigation arrow unchanged.
- Verified: full 646/646 tests (zero skips), TypeScript, full zero-warning lint, offline Expo compatibility (offline reliability caveat), Android export 1633 modules/4.5 MB. Independent QA 19/19 and independent review found no actionable application issues; documented phone-path typo corrected. Physical-device GPS/TalkBack/iOS acceptance pending.
- Read-only live-schema backend preflight: no changes required. No dependency/environment/native configuration changes, publication or live writes. Original Mobile checkout and Web working files preserved. Evidence and complete PR #9 overlap comparison: docs/qa/turn-confirmation-display.md. Local/unpublished.

## Empty private draft first-stop onboarding — 2026-10-24
- IMPLEMENTED LOCALLY: zero-memory map area has decorative route cue/adventure heading, inviting first-stop card opens existing memory buffer, quiet labelled Cover/Settings/Save draft; guidance replaces empty disabled Publish swipe. No opening writes; duplicate/focus/form/modal/busy/uncertain/photo guards. Nonempty animated stack/readiness unchanged; unlocated named memory stays private until location added.
- Focused editor/private/public deck66/66, TypeScript, full zero-warning lint, whitespace and Android export4.5MB passed; native/review in docs/qa/draft-empty-state.md with5-source hashes. Read-only actual-schema backend preflight released. Native QA only read-only, no hosted save/upload/publish claims.
- Local/unpublished; no backend/dependencies/environment/native permissions/build/agent hosted writes/publication. Prior work preserved. iOS/TalkBack/large-font/short-device acceptance pending.

## Private draft actual swipe-away memory stack — 2026-10-24
- IMPLEMENTED LOCALLY: private editor now uses actual upcoming photo cards behind foreground memory, whole-card rotate/translate210ms swipe-away matching published deck. Reduced motion/bounds/lifecycle cancellation retained. Photo/caption gesture excludes Earlier/Later/remove; guarded private callbacks and four rail actions preserved; browse changes selected ID only.
- Focused private/public deck+editor63/63, TypeScript, full zero-warning lint, whitespace and Android export4.5MB passed; native/review in docs/qa/draft-memory-stack.md with4-source SHA256 snapshot. Previous full636/636 is earlier editor checkpoint, not rerun for this correction.
- Local/unpublished; existing draft preflight covers unchanged browsing-only contract. No dependencies/environment/native build/backend/hosted writes/publication; all prior work preserved. Native/iOS/accessibility acceptance distinctions in task QA.

## Private draft map/deck and swipe Publish — 2026-10-24
- IMPLEMENTED LOCALLY: loaded draft editor map first/edge-to-edge; direct paged memory deck with map selection, edit/Earlier/Later/remove retained, compact Cover/Add/Save/Settings icons. Cover popup reuses existing gallery/camera/removal; settings exact form preserved. Footer explicit swipe Publish uses existing guarded save/upload pipeline; original Journey Start defaults retained.
- Full636/636 nonPG and final63/63 focused passed, Android export4.5MB/offline compatibility/whitespace passed; final TypeScript/full zero-warning lint passed; native/review evidence in docs/qa/draft-editor-redesign.md. Native CPH2813/Android16 main stack and Cover popup browsing/close observed; no hosted write/photo/camera/reorder/remove acceptance claimed.
- Local/unpublished; backend actual-schema no-change preflight released, no backend/environment/dependencies/native config/hosted writes/publication. Quick-start/globe and prior work preserved. iOS/TalkBack/large-font/native Publish/camera and broad lifecycle pending.

## Navigation reserved-slot backdrop — 2026-10-24
- IMPLEMENTED LOCALLY: shared MainNavigationFrame outer root now paints existing page background/gradient behind its reserved bottom slot, removing the extra white rectangle on Create/Journey while retaining the intended rounded navigation pill, selected highlight and all layout/touch behavior.
- Existing Home/navigation31/31, TypeScript and full zero-warning lint passed. Native CPH2813/Android16 Create confirms white band gone/pill intact; Journey shared-frame behavior verified by inspection only. See docs/qa/navigation-background.md. Local/unpublished, no dependencies/backend/environment/hosted writes/publication; all previous work preserved.

## Journey explore compact deck and swipe entry — 2026-10-24
- IMPLEMENTED LOCALLY: transparent photo action targets, red outline/solid heart, icon Fit/Full map, compact swipeable cards with Previous/Next above and author inside card under Read story. Gradient swipe capsule sits below card above navigation; opens existing Travel Mode only. Begin Trip remains explicit GPS consent; single-flight lifecycle cancellation/reduced motion/accessibility activation retained.
- Final630/630 non-PG suite plus Architect isolatedPG1/1 passed, TypeScript, zero-warning full lint and Android export passed. Native CPH2813/Android16: all content fits, map/card selection agrees, partial swipe resets, full swipe reaches ready Travel Mode without Begin Trip. iOS/TalkBack/large fonts/transition capture/broad actual GPS lifecycle pending.
- Local/unpublished; no dependencies/native config/environment/backend/hosted writes/GitHub/deployment. Read-only backend preflight released; existing dirty work preserved. See docs/qa/journey-explore-redesign.md for15-source SHA256 snapshot, exact validation and native limitations.

## Extended thumbnail consumers — 2026-10-24
- Implemented locally: Story JourneyCard, Account/public ProfileJourneyCard, map photo pins and Create/edit memory previews use thumbnail -> original -> bundled default. Local unsaved previews retain their local URI. Stop-story viewer, share export and large stop cards retain originals.
- Verification: 624/624 tests, TypeScript, zero-warning lint, Android export and whitespace checks passed. Independent reviews complete; stale image-error and map source-pair findings fixed and covered by regressions. Physical-device verification of this extension remains pending.
- No Storage, backfill, environment, dependency, upload or publication changes. Existing legacy photos use originals. Full step-only changed-file list: docs/thumbnail-coverage-changed-files.md; evidence: docs/qa/thumbnail-coverage-integration.md. All earlier uncommitted work preserved.
## Approved thumbnail activation and one-upload acceptance — 2026-10-24
- LIVE POLICY APPLIED with explicit owner approval limited to reviewed Storage read policy on gwybjhqgnrpouwcdvusi, local future-upload flag and ONE logical photo test. Rollback SQL shown before apply; docs/backend/image-thumbnails.rollback.sql retained, not executed. ReviewedSQL SHA823C43BE7241B364ACD5B640A80179EB65AC53F389809906C59FBC88985F7C24 applied via migration20261024041322 journey_media_thumbnail_v1_read. Independent actual-policy/baseline/RLS read-only verification passed; no broader write authorization added.
- ENABLED LOCALLY: ignored .env.local flagtrue with target verified. Correct-root Metro8082 served virtualenv true; app connected/reloaded and actually executed paired upload. Original8081 server preserved (its running environment did not pick up newly added flag). No source/dependency/native-build/deploy/GitHub publication in this step; app remains on8082 for enabled future uploads.
- ONE native private QA photo upload passed: fresh draft[redacted private QA draft ID], title [redacted private QA draft title], one synthetic image, oneSaveDraft submission, no retry/publish. Exactly2JPEGobjects: full729570bytes, thumbnail58344bytes (~92% smaller); canonical cover persisted. Reopened once read-only and cover remained. Actual role-scoped reads owner2/anon0/other0, draftpublished_atnull. Native generator validated its output contract; Storage metadata does not independently record image dimensions. No public-thumbnail positiveHTTP acceptance claimed for this private fixture.
- Existing-photo backfill NOT APPROVED/NOT RUN. No existing image conversions/reference changes/deletes. PrivateQA draft and2objects retained; no cleanup performed outside limited approval. Existing userdrafts untouched. See docs/qa/thumbnail-activation.md and thumbnail-activation-mobile.md for actual timestamps/evidence/limits.
## Image loading, stored-thumbnail preparation and backfill review — 2026-10-24
- IMPLEMENTED LOCALLY: Home/Search share45sec anonymous collection cache,55min bounded signedURL reuse, safe subscriber abort/invalidation, fresh detail gate, focus/foreground renewal and explicit refresh. Home hidden listdata0; active initial2/3rows. Search initial4rows12tiles/batch2rows6tiles/window3. Saved membership stays identity-scoped/uncached.
- Future512pxJPEG70 thumbnail preparation + paired immutable full-v1/thumb-512-v1 upload/read fallback is implemented DEFAULT OFF pending explicit live Storage SELECT-policy approval. CurrentFreeplan retained. No policy applied and no native/dependency/config changes. Existing uploads remain legacy while flag false; no cold original-byte reduction claimed until activation.
- Offline backfill tool creates local pairs/hash/byte/dimension/reference-transition review plans from approved local manifest; refuses network/overwrite/traversal/collisions and preserves originals. Prepared policy+tool docs; no production manifest/photos fetched, uploads/reference swaps/backfill executed.
- Final609/609 tests0skips, TypeScript, zero-warning lint, whitespace and Android export1627modules passed. Independent frontend/generator94/94, cache/backfill12/12, Architect backend30/30, real isolatedPG policy1/1 passed. Two review findings fixed/retested; no remaining actionable findings. See docs/qa/image-loading-integration.md and linked reviews.
- AndroidCPH2813/16 native grid/Home rendering observed; several remote covers fallback and reload/navigation limited acceptance. No actual cold/warm network-byte/memory measurement, paired live/native upload, iOS/accessibility/slow-network acceptance claimed. Existing status-icon transition caveat persists.
- Local/unpublished, no GitHub/deploy/live database/Storage/billing writes. Thumbnails awaiting separate action+target approval; backfill execution/reference transition separate approval. All previousSearch/Saved work and unrelated .github/,cd,eas preserved.
## Compact Search and Saved filter — 2026-10-24
- IMPLEMENTED LOCALLY: Home and Search reuse CompactSearchInput with same34dp pill/search icon/44dp target. Right bookmark toggles own saved public journeys in existing3-column grid; query filters selected collection, guest sign-in prompt, focus/foreground refresh and account/token isolation prevent stale personal results. Existing backend Saved RPC pages beyond latest100; no schema/API/RLS/Storage changes.
- Full582/582 then final affected79/79 and Search7/7 passed, TypeScript/full zero-warning lint/whitespace passed, Android export1623modules passed. Independent UI reviewer73/73+7/7 no remaining findings; Architect independently reviewed helper and ran6/6. See docs/qa/search-saved-grid.md and search-saved-grid-preflight.md.
- Native CPH2813 Android16: compact field/icon, selected Saved filter displaying5 existing journeys, Kovalam filtering1, clear action and Home shared field confirmed. No live mutations. Native guest/account-switch/unsave-return/accessibility/iOS checks pending; previous status-icon transition caveat remains.
- Local/unpublished, no commit/push/merge/deploy/dependencies/native configuration/live writes. All preceding local grid work and unrelated .github/, cd, eas preserved.
## Search Explore grid — 2026-10-24
- IMPLEMENTED LOCALLY: Search uses tight3-column square photo tiles, top search only; removes back/title/place chips. All loaded results remain scrollable. Existing bundled photo covers missing/failed images. Tiles open existing Journey with bookmark first at upper-right of photo; existing save/auth owner reused. Separate Story browse list and queries preserved.
- Backend read-only preflight complete: no schema/API/RLS/Storage changes. Writer91 focused checks, TypeScript, full zero-warning lint, whitespace, offline Expo compatibility and Android export1621modules passed. Independent reviewer118 focused checks, stable hashes and no actionable findings; see docs/qa/search-explore-grid.md.
- Native CPH2813 Android16: actual grid/four rows+partial fifth, opened Journey upper-right bookmark, Kovalam filtering and separate Story browse verified. No hosted save/mutation performed. Status icons can remain white after returning from dark Journey; existing transition ownership unchanged and follow-up pending. Physical iOS/TalkBack/large text pending.
- Local/unpublished; no GitHub publication/deploy/live writes/dependency/native configuration changes. Existing untracked .github/, cd, eas preserved.
## Mobile UI publication checkpoint — 2026-10-24
Owner accepted the accumulated Mobile UI and explicitly requested merge/push to main. Fresh final569/569 tests, TypeScript, zero-warning lint and whitespace checks passed. Independent publication review found no actionable findings and confirmed all12 app/test/asset hashes match reviewed snapshots (docs/qa/mobile-ui-publication-20261024.md). Scope includes Home compact controls with visible action labels, supplied fallback photo, Create edge-to-edge globe and adaptive height. This checkpoint records the approved publication preparation; the GitHub PR records actual merge status. Earlier local/unpublished entries are historical checkpoints. Unrelated .github/, cd, eas and ignored evidence are excluded. No backend/dependency/native-build/deployment/live-data changes.
## Create globe uses leftover space - 2026-10-24
- IMPLEMENTED LOCALLY: globe flexes into actual leftover vertical space formerly below Your drafts. Quick Start wrappers retain natural height/shrink; existing controls scroller/CTA/drafts preserved, keyboard72dp usable hero unchanged. No custom measurement feedback or fixed oversized height.
- Targeted Create51/51, TypeScript, full zero-warning lint and whitespace checks passed. Independent results in docs/qa/create-globe-height.md; no broad full-suite rerun for this scoped layout adjustment.
- Native CPH2813 Android16 after Reload12sec+navigation10sec: taller globe, reduced blank below drafts, full form/CTA/draft/nav visible; keyboard focus10sec confirms compact hero and controls above keyboard. No form data changed/saved, no draft opened. Phone returned Home. See docs/create-globe-height.md.
- Local/unpublished; no dependencies/build/native config/server restart/live writes/publication. Prior local work/untracked entries preserved. Physical iOS/short-screen/large-font/accessibility/broad GPS lifecycle pending.

## Create globe edge-to-edge status area - 2026-10-24
- IMPLEMENTED LOCALLY: new Create globe fills behind native light status icons with noninteractive dark status gradient, curved lower corners, no inset rectangle. Safe top height/camera/legal reserve retained. World uses same small globe disc44dp button when hero has room; keyboard72dp usable hero hides reset to protect legal controls. Draft editor top-safe/dark route unchanged.
- Backend no-change preflight complete. Focused Create/discovery/globe98/98, TypeScript, full zero-warning lint and whitespace checks passed; independent review/QA recorded in task QA document. No broad full-suite rerun for this scoped presentation change.
- Native CPH2813 Android16: Reload12sec+Create navigation10sec; edge globe/light status/legal+World verified. Empty search focus/keyboard10sec capture confirms compressed hero/visible controls; no form edits, draft opened or saves. Phone returned Home. See docs/create-edge-to-edge.md for evidence/limits.
- Local/unpublished; no dependencies/native build/config/server restart/live writes/publication. Prior Home/fallback/labels dirty work and unrelated .github/, cd and eas preserved. iOS/auth-loading/map-failure/extreme inset/accessibility and broad lifecycle/GPS checks pending.

## Home icon and label actions - 2026-10-24
- IMPLEMENTED LOCALLY: Home card Locate / Read story show28dp icons above11px visible labels;56dp minimum buttons, wrapping text and automatic card measurement retain safe touch/clearance behavior. World remains24dp; previous fallback/compact work preserved.
- Passed focused28/28, TypeScript, full zero-warning lint and whitespace checks. Independent focused66/66 and review found no actionable issues. Full569/569 belongs to the prior fallback checkpoint; not rerun for this scoped follow-up.
- CPH2813 Android16: Reload+12sec and action10sec waits; compact controls/CTA clearance and actual Locate selected/map fit verified. Expanded full-label clearance and repeated native Story tap remain pending; expanded scroll shows icons above CTA but not fully clear labels. See docs/home-action-labels.md. Phone left Home.
- Local/unpublished; no dependencies/native configuration/build/server restart/live writes/publication. Preserved prior local work and unrelated untracked .github/, cd and eas.

## Supplied default travel photo - 2026-10-24
- IMPLEMENTED LOCALLY: Home missing/failed covers and Journey stop photos reuse the owner's supplied image, bundled unchanged. Native Explore journey / See this stop captions use a dark scrim; compact Home uses smaller text and destination duplication is removed. Real card titles/photos and callbacks preserved; accessibility explicitly identifies default travel photo.
- Backend no-change preflight complete. TypeScript, zero-warning lint, focused18/18, full569/569 and whitespace checks passed. Independent focused18/18 and review reported no findings; see docs/photo-fallback.md and QA record for settled Android evidence and remaining limitations.
- CPH2813 Android16 existing client: Reload +12-second capture delay, subsequent interaction captures10 seconds. No dependencies/native config/build, server restart, live writes or publication. Local/unpublished, preserving prior compact-controls work and untracked .github/, cd and eas.

## Home compact controls - 2026-10-24
- IMPLEMENTED LOCALLY: World label replaced by small globe icon above measured Home cards; search/notification surfaces reduced to 34dp, retaining 44dp areas. Home cards use icon-only crosshair Locate and open-book Read story with spoken labels, selected state and unchanged callbacks.
- Backend preflight complete: no backend changes. TypeScript, zero-warning full lint, focused92/92, full568/568 and whitespace checks passed. React quality checklist applied. Independent QA65/65 and review found no actionable issues. See docs/home-compact-controls.md and preflight record.
- Native CPH2813 Android16 existing client: full Reload +12-second delay, then10-second waits for action captures. Settled compact appearance, Locate fit/selected highlight, World reset and Read story navigation observed. Expanded globe/legal clearance, search suggestions and destination selection verified; phone returned to Home. iOS/TalkBack/large text/broad lifecycle and GPS regression pending.
- Local/unpublished; no native configuration/dependencies, native build, dev-server restart, live writes or publication. Preserve baseline untracked .github/, cd and eas.

## Home and Journey publication approval — 2026-10-24
Owner explicitly authorized committing, pushing and merging the accumulated Home/Journey presentation work into GitHub main. Publication review found no actionable application issues; all17 application-source hashes matched the latest QA records. Fresh568/568 suite and TypeScript passed; final lint result recorded in publication QA addendum. Backend preflights already completed with no backend changes; no migration/deployment/live writes in this publication operation. Earlier local/unpublished headings are historical implementation checkpoints. Unrelated untracked .github/, cd and eas and all ignored screenshots are excluded.
## Home edge-to-edge globe and overlay header — 2026-10-23
- Implemented locally: Home globe fills behind system time/battery; transparent floating Search and notification presentation below top inset, readable status gradient, measured header reserves for discovery panel and globe camera/World/Mapbox controls. Existing search/location/query logic and other preview defaults retained. Notification remains a coming-soon presentation.
- Backend delta preflight complete, no backend changes. Final568/568 tests, TypeScript, full zero-warning lint, whitespace and Android export1618modules/4.4MB passed; independent review found no actionable issues. Final QA record docs/qa/home-edge-to-edge.md; prior initial loading-contrast tests exposed native status transition ownership. Final Home route sets native statusBarStyle dark during pale initial loader, light over loaded globe; full devclient Reload used to confirm actual final native behavior. No dependencies/native config changes.
- Native CPH2813 Android16 on existing8081 client: settled globe/status/header, Kochi suggestions+keyboard+place selection, expanded panel/header clearance and World/legal branding observed. Final home-edge-final-loader.png shows dark icons on pale loader, home-edge-final-ready.png shows light icons over globe. Account navigation restores dark icons; device returned to Home. iOS/large text/TalkBack/extreme cutouts and broader GPS/travel remain pending. Screenshots ignored/local under dist/journey-deck-qa; no live writes, server restart, commit/push/merge/deploy.
## Journey edge-to-edge status bar — 2026-10-23
- Implemented locally: loaded Journey SafeArea excludes top edge so map renders behind time/signal/battery; focused map uses light status icons with fixed noninteractive dark gradient. Full map/refresh and native Fit/compass controls respect top inset; default map/Travel offsets unchanged. Loading/unavailable screens keep safe top. Visible StorySheets own dark status icons and release on close, preventing contrast leaks.
- Backend delta preflight completed, no backend change. Full567/567 and focused55/55, TypeScript, full zero-warning lint, whitespace and Android export1618modules/4.4MB passed; independent review found no actionable issues. No deprecated translucent/background-color props, dependency/config/native rebuild changes.
- Native CPH2813 Android16: edge-loaded.png and edge-return.png confirm actual map behind light status icons with no white top band; Fit/full map below icons and attribution visible. edge-sheet.png confirms dark system icons on pale full-map sheet; closing restores light status icons. Leaving Journey to Explore restores dark status icons during Home loading (edge-home.png). iOS/cutout variants/large text/scroll/background and other sheet types remain pending. See docs/qa/journey-deck.md. Local/unpublished; no commit/push/merge/deploy/live writes.
## Journey six-icon rail — 2026-10-23
- Implemented locally: icon-only Like/count, bookmark Save, Share over active photo; guarded Remix, Customize Stops and About/Info continue in a dedicated right caption gutter. Removed successful-content map three-dot menu and separate hidden options instance. Single social/copy controllers, auth/deferred intents, existing-copy/uncertain-result recovery and empty-stop action access preserved. Icons use bundled native geometry; no font glyphs or dependency changes.
- Backend delta preflight found no backend changes required after current live copy-function/permission/RLS checks. Full565/565, focused62/62, TypeScript, full zero-warning lint, whitespace and Android export1618modules/4.4MB passed. Independent review found no actionable issues.
- Native CPH2813 Android16: inspected icons.png (photo + upper/lower rails, no map3dots), icons-final.png (all6 readable with no visible action names, separate title gutter, missing-photo art, author/Previous/Next reachable). Floating gray developer Tools overlay obscures part of bookmark in some captures; not app design. No live Remix/copy/Like/Save/share send performed. Runtime action recovery, larger-font/TalkBack/iOS remain pending. Evidence/limits docs/qa/journey-deck.md; screenshots ignored/local. Local/unpublished, no commit/push/merge/deployment.
## Journey right-side social rail — 2026-10-23
- Implemented locally: Like/Save/Share use vertical44dp controls on active photo right; author moved to scrolling attribution below deck; fixed footer retains only Start Journey. Removed bottom social row to expose more card area. Existing one social controller/auth/intents/selected-memory sharing retained. Rail is outside read-Pressable/swipe ancestor chains; empty routes retain actions.
- Backend scope-delta preflight completed, no backend change needed; no hosted writes. Full563/563 and focused share/deck8/8, TypeScript, full zero-warning lint and whitespace passed. Independent review found no actionable findings; final hashes in docs/qa/journey-deck.md.
- Native CPH2813 Android16 screenshots show rail over no-photo illustration and photo card, readable selected/count/Save/Share controls and removed bottom social row. Concurrent owner browsing limits attribution of later swipes/menu changes; native action activation/error/large-font/TalkBack and author scroll reach remain unverified. No Like/Save/share send was triggered by Architect. Local ignored evidence dist/journey-deck-qa/social-rail*.png. Phone control left to owner. Local/unpublished; no commit/push/merge/deploy.
## Journey map-first deck redesign — 2026-10-23
- Authorized scope: map first without successful-content title/back toolbar, curved bottom map corners, options/About access retained; animated reversible stop deck with consistent cover cropping and shared native missing-photo illustration. Existing map/story selection, public read gates, social actions and Travel entry preserved.
- Backend Developer completed current-schema/RPC/RLS/Storage/migration comparison; no backend change required. Architect released local presentation scope in docs/journey-deck-preflight.md. Existing migration drift remains protected; no live writes.
- Implemented locally on codex/home-photo-fit alongside prior Home changes. Full562/focused74 tests, TypeScript, zero-warning lint, whitespace and Android Hermes export passed; offline dependencies up to date with caveat. Independent review found no actionable issues. Native CPH2813/Android16 confirmed curved map/attribution, real image-backed deck, cover photos, missing-photo art, controlled next/previous swipes and vertical controls clearance. Final evidence/remaining device checks in docs/qa/journey-deck.md; screenshots ignored under dist/journey-deck-qa. No publication or deployment.
## Home photo fitting — 2026-10-23
- Implemented locally on codex/home-photo-fit from merged main aba76832: expanded Home discovery photos use a consistent 16:9 frame with cover cropping; compact 96x84 thumbnails also fill their existing frame. Removed blurred duplicate backdrop. Originals and photo URLs are unchanged.
- Required Backend Developer preflight completed against current hosted metadata; no database/API/RLS/Storage change needed. Scoped migration drift and safe verification recorded in docs/home-photo-fit-preflight.md; no live writes.
- Focused Home checks passed 12/12; full suite 560/560, TypeScript, zero-warning lint and whitespace checks passed. Independent review found no actionable findings; snapshot hashes and acceptance steps are recorded in docs/qa/home-photo-fit.md. Physical portrait/landscape/square appearance, scroll clearance and crop suitability still need owner confirmation in the running mobile app.
- Owner confirmed Home photo fitting on the running mobile app. Authorized follow-up: branded native travel fallback for missing/failed photos, with destination/Journey story text only when expanded. Backend scope-delta preflight complete, no backend change required. Follow-up full suite 561/561 and TypeScript passed; focused Home checks passed 13/13. Zero-warning lint and whitespace checks passed; independent review found no actionable findings. Native fallback appearance/large text/TalkBack remain pending in QA report.
- Local/unpublished; no commit, push, merge, deployment or dependency changes. Journey map/deck redesign and upload crop controls remain separate later work. Preserve baseline untracked .github/, cd and eas.
## UI refinement publication — 2026-10-23
Owner accepted the mobile design and authorized publication/merge into main. Fresh 559/559 tests, typecheck, zero-warning lint and whitespace checks passed; independent review found no actionable issues and confirmed source/test hashes match the previous reviewed snapshot. PR publication follows this checkpoint. Earlier local/unpublished labels describe the original implementation checkpoint. No backend changes or deployment; remaining device limitations retained below.
# Journey Creator Mobile — roadmap

## Shared bright Mobile theme — 2026-10-21

- IMPLEMENTED LOCALLY: New codex/mobile-ui-consistency branch from freshly fetched origin/main, clean baseline 07fe90e1a8b0974da15f475d2b1ecbcf363b2a8d, in D:/Travel_Mvp_UI_Main. Shared pale blue/lavender surfaces, rounded controls, soft shadows and contrast-oriented purple-to-blue primary buttons based on the Add memory reference.
- SCREENS: Home chrome/search, discovery/search/story lists via shared UI, Create/draft and memory controls, Account/public Profile/Edit Profile, Customize Stops, Journey sheets/share/story viewer/timeline, Travel controls and companion chrome. Login/sign-up retain their frozen baseline presentation. Globe/map renderers and blue navigation guidance retained; callbacks, routing, auth and persistence unchanged.
- PREFLIGHT: Backend Developer completed read-only current-schema comparison; no backend changes needed. Review-only selected-copy SQL differs from documented deployed standalone alternative; no reconciliation attempted. Details: docs/mobile-ui-consistency-task.md.
- CHECKS: Full suite 559/559 passed; subsequent final Create regression run 51/51 passed after adding disabled-button gradient/shadow assertions. Final-source TypeScript, zero-warning lint, Android Hermes export and whitespace checks passed. Offline Expo compatibility reports dependencies up to date with its offline reliability caveat. Final companion tests passed 12/12 and auth/Create 61/61. Independent reviewer cleared final source and harness changes after fixing disabled Publish styling and story status-bar backing. Final QA report records device coverage separately.
- DEVICE VERIFIED: CPH2813/Android 16, installed development client 0.1.0. Correct target bundle served on independent Metro 8082 after resolving IPv6-only binding. Native navigation/visual checks covered settled Home globe, Search, Create setup, existing draft editor, Add memory open/close, Account, Edit Profile, public Profile, journey/map and memory-story viewer. Final bright editor header and dark safe-area story icons checked. No live saves/copies/deletes/uploads or trip started. Phone returned on themed Home; original USB 8081 route restored, feature 8082 server retained. Screenshots remain local/ignored. Full details: docs/qa/mobile-ui-consistency/report.md.
- SCOPE: Local/uncommitted/unpublished. No Web/backend/database/dependency changes, live data mutations, commit/push, merge or deployment. Existing dependencies reused through an ignored junction. Remaining checks include native visual/navigation parity, safe areas, large text, TalkBack, outdoor readability and active navigation field checks.

## Successful Customize Stops Android retry — 2026-10-21

- [x] Confirmed selection, created the three-stop private Church To home draft with original stop 2 skipped, pressed Save Draft and observed Saved privately without error.
- [x] Left editor for Account: new private draft appeared, count 5 to 6. Reopened it with the three selected names/order retained and the skipped stop absent. Photos omitted as expected. Earlier backend blockers below are superseded for this exercised path.
- [x] Fresh 543/543 tests, TypeScript, zero-warning lint and whitespace checks passed on the tested local snapshot. Independent UI/test review already passed. User authorized publication to existing PR #3 branch; no merge or deploy.
- [ ] Broader backend SQL/RLS/concurrency, screen-reader, enlarged-font and iOS acceptance remain separate. No GitHub check/status runs reported; branch protection unavailable to integration (403). No SQL/Web migration changes included.

## Hosted Customize Stops acceptance — 2026-10-21

- [x] Confirmed correct checkout/branch, preserved five existing modifications and verified Metro project root/USB forwarding. User reports standalone backend deployment; native review accepted 3 of 4 stops with original stop 2 skipped.
- [x] One authorized creation attempt captured and diagnosed: SQLSTATE 42501, permission denied for schema auth, before insertion in private.standalone_copy_journey_selected. Its owner customize_stops_rpc lacks auth schema USAGE despite auth.uid() EXECUTE. No Mobile code defect established; no retry, grants or schema changes performed.
- [ ] Backend owner separately reviews/corrects effective permissions. Then repeat creation and navigate-away/reopen persistence acceptance; this run did not create a draft or reach the editor. Photos expected omitted. See PROJECT_STATUS.md for exact evidence; prior missing-RPC blocker is superseded.

## Customize stops UX follow-up — 2026-10-20

- [x] Compact card, fixed Keep/Skip/Undo controls, explicit swipe directions and optional-swipe guidance; grouped selected/skipped review, original positions and restored-state explanation.
- [x] Connected Android 16 device checks: tap Skip/Undo/Keep, left/right swipes, vertical-scroll arbitration, mixed selection counts and restoring original stop 2. No draft confirmation or production writes. See PROJECT_STATUS.md for device configuration and evidence limits.
- [x] Final automated verification: 543/543 tests including 12 focused cases, TypeScript, zero-warning lint and whitespace checks. Offline Expo compatibility reports up to date with its caveat; no patches installed. Independent Code Reviewer found no actionable issues and independently passed 12 focused cases. Android Back retained choices; native route rendered, with development Refreshing banner limiting settled-screen evidence. Changes remain local/uncommitted on codex/customize-stops.
- [ ] Backend copy_journey_selected remains a separate approval and isolated-validation dependency. Missing-RPC message is honest; no draft creation is claimed. No SQL applied. TalkBack/VoiceOver, enlarged fonts, iOS and backend end-to-end QA remain pending.

## Customize stops — 2026-10-20

- IMPLEMENTED: Published journey actions retain Use all stops and whole-journey Remix and add Customize stops. One-card Keep/Skip swipes and visible buttons, Undo, photo/metadata fallbacks, original-position labels, review/back retention, restore/revisit controls, and a selected-stop map preview. No card animations; buttons provide accessible gesture alternatives.
- ROUTING: Existing driving-route adapter calculates adjacent selected pairs only, with resulting selected start/end; one stop uses a marker-only preview. Invalid selections block confirmation; routing timeout/error/retry/cancellation retain choices and reject stale results. Skipping a waypoint does not promise physical road avoidance. No source route geometry, stop reordering or active-navigation changes.
- DRAFTS: Existing sign-in boundary at confirmation retains in-memory choices; atomic selected-copy contract preserves original order/media/attribution and opens the existing Create editor. Stable client draft IDs and request/result locks prevent duplicate confirmation and block ambiguous retries with Account recovery. Exit/review do not write. Process termination does not persist selections.
- BACKEND DEPENDENCY: Current copy_journey always copies all stops and save_journey cannot establish attribution. Required new copy_journey_selected contract is prepared under docs/backend for review only, not registered/applied in either hosted resources or the web repository. Missing RPC is explained without losing choices. Hosted confirmation requires separately reviewed backend rollout; SQL runtime/integration verification is pending.
- VALIDATED: 541 direct Node tests across 39 files, including 10 new cases; TypeScript, zero-warning lint, Android Hermes export and whitespace checks passed. Real loading-hook test verifies obsolete request abortion/late-result rejection. Offline Expo compatibility reports dependencies up to date with its offline reliability caveat. Independent code review results recorded in the handoff/PR.
- DEVICE PENDING: Android/iOS physical swipe versus scrolling, VoiceOver/TalkBack focus/labels, large fonts/safe areas, reduced-motion behavior and native Mapbox loading/camera/route checks. Development-client execution, hosted contract parity and nonproduction end-to-end copy checks remain pending; mocks/export do not establish these. No production test writes, dependency changes, deployment, merge or hosted migration.
- ISOLATION: Feature branch codex/customize-stops from verified origin/main 90f121eb; navigation PR #2 remains separate and is not needed. Original Mobile and web working trees inspected clean and preserved. See docs/customize-stops-handoff.md for laptop steps.

## Stationary navigation direction — 2026-10-20

- FIELD FEEDBACK: Owner tested Begin Trip while stationary at home and still saw a dot. This does not establish an arrow failure during actual movement. Prior code required reliable movement course and had no stationary compass source.
- IMPLEMENTED: Use calibrated true-north device compass at startup/while stationary; confirmed movement course takes priority when travelling. Smooth compass wraparound and show phone-direction versus travel-direction labels. Collapsed panel explains unavailable orientation or poor/stale GPS. Compass callbacks preserve measured coordinates, GPS timestamps, watchdog and route progress. Sensor errors do not disconnect GPS. Heading subscriptions and timers stop on Pause/Finish/background/blur and reject obsolete callbacks.
- LIMITS: No invented north/route bearing. Compass requires medium/high calibration and precise current GPS. Android emits only after phone direction changes; compass expires after 30 seconds without a new reading and explains how to refresh. Indoors, poor GPS may prevent an arrow. Stationary compass means phone facing, not proof of travel. No dependency/native build/key/EAS changes; existing development client can load updated JavaScript.
- VALIDATION: Final simulated suite 547/547 passed; writer TypeScript passed; independent reviewer passed 10/10 compass tests. Two P2 review findings (poor-GPS advice and obsolete expiry timer cleanup) reproduced in tests and resolved; reviewer confirmed no remaining actionable findings. Full and scoped zero-warning lint and Android Hermes export passed. Final three-application/two-test snapshot SHA256: dba148a72633e8df41d3de7c5bc7ce4a48868c8cf0dc7d21696c0cdc63cb1763 (sorted path + NUL + file SHA256 + LF). Offline Expo compatibility reports dependencies up to date with its offline reliability caveat.
- DEVICE PENDING: Reload latest JS on Android, allow precise location, test Begin stationary outdoors, rotate phone through north, verify calibrated arrow and labels, then walk/drive safely to confirm course priority. Check compass loss/30-second expiry, poor GPS, Pause/Resume/Finish and background/resume. Existing screenshot is observed baseline only; no physical verification of this fix performed.

## Android navigation field fixes — 2026-10-19

- ROOT CAUSES: Travel rendered the original route overview instead of accepted progress; the GPS guard hid retained geometry during brief accuracy loss; course filtering discarded sharp turns and stationary readings; a font glyph and large destination circles reduced navigation clarity.
- IMPLEMENTED: Trim the completed route using conservative accepted current-step progress. Render a bundled 28px white-outlined blue arrow with map-relative GPS course; smooth genuine turns and preserve confirmed direction through brief stops. Reduce navigation destination circles. Keep this active session's accepted route visible during GPS loss while guidance pauses with automatic-recovery status. Preserve raw measured coordinates, existing watcher backoff/recovery, genuine off-route confirmation/rerouting and lifecycle cleanup.
- VALIDATED: Full simulated suite 537/537 and TypeScript passed. Independent Code Reviewer found no actionable issues and separately passed 34 focused tests plus whitespace checks. Final zero-warning lint and Android Hermes export passed (1610 modules; 4.4 MB bundle). Offline Expo compatibility reports dependencies up to date, with its offline reliability caveat. The final explicit Buffer import in the new test was rechecked: 2/2 affected tests passed and reviewer confirmed no findings. QA app/test snapshot SHA256: ed35858cd5492b5011389c50997ce1adcc1d687288b0782b9e3c90585a3b108a (sorted path + NUL + file SHA256 + LF across six application and four test files).
- LIMITS: Routes without valid maneuver steps retain full geometry rather than invent progress. Poor or approximate GPS cannot establish accurate progress. Raw marker/road separation remains visible; no forced road snapping. Screenshots demonstrate baseline symptoms, not their exact GPS cause. No physical Android/iOS testing or native build performed.
- DEVICE ACCEPTANCE PENDING: On the installed Android development client confirm current JS revision; test arrow visibility through turns and rotated maps, stationary heading/north wraparound, completed-line removal through successive turns, GPS gaps of 6/16/>30 seconds and automatic recovery, services off/on, approximate/denied permissions, actual deviation/rerouting and offline route failure/Retry, Pause/Resume/Finish, background/resume/blur and destination changes. Record model, Android/app/build versions, permissions, network/GPS conditions and expected/actual observations. Simulated fixtures and bundle exports do not establish device success.
- SCOPE: Six application files (travel screen, native-map, use-trip-navigation, foreground-location, navigation, turn-guidance), four regression test files and status/roadmap notes. No backend/database/dependency/Web changes. Existing untracked .github files excluded. Owner authorized feature publication; no merge, deployment or production mutation authorized.

## Account/Profile travel design and compact Create drafts — 2026-10-18

- IMPLEMENTED: Shared Account/public Profile presentation now uses the existing paper/green palette, app logo, JourneyPhoto avatars/covers, native icon treatments, rounded raised surfaces and gradient buttons. A static atlas/globe motif uses decorative native Views only, with no additional renderer, map/location request or animation. Compact toolbar retains back/settings; the nonfunctional notification placeholder is removed.
- IDENTITY/ACTIONS: Real profile and existing metadata fallbacks retained. Names occupy up to two lines with their full accessibility label. Long bios have explicit More/Less controls. Edit profile and New journey reuse existing navigation. Published/Drafts count tiles form the single accessible Account tab selector using loaded list lengths; unavailable counts show a dash, not a false zero. Existing queries and authentication are unchanged.
- DRAFTS: Account keeps deletion inside each card, with a styled destructive confirmation, cancellation, pending lock, error feedback, exact returned-ID success check and list/count refresh. Only presentation changed; owner/status filters and shared-media preservation remain intact. This supersedes the prior entry's Create deletion placement: Create now has only its original horizontal Continue editing cards and View all. Removed Create's delete import, wrapper, feedback state and callback; original dimensions and horizontal behavior retained.
- VALIDATION: Focused interaction/component coverage includes collections, routing, account deletion refresh, long bio expansion and the absence of delete/modal rows in Create. Final full suite 531/531; TypeScript, Android/iOS/web exports and scoped git diff --check passed. Final zero-warning lint passed. Offline Expo compatibility reports dependencies up to date with its reliability caveat.
- VISUAL: Isolated exported web app inspected at 320x568, 360x640, 390x844 and 412x915 with fixture account data and intercepted backend/image requests. No real backend mutation. Cancellation, failed deletion retaining the card, successful deletion/count refresh and Create history verified. History measured 76px high with scrollHeight=clientHeight. Final compact header, consolidated collection tabs, long-bio More/Less behavior and public Profile inspected. No horizontal overflow at the four tested sizes; browser run reported no errors. At 360x640 the first complete draft card including Delete is visible above navigation. Long lists retain their existing safe scrolling. Work files are ignored under dist/profile-redesign-work and dist/profile-redesign-export.
- PENDING DEVICE: Android/iOS visual parity, safe areas/status bar, gradients/shadows, large-font wrapping, TalkBack/VoiceOver and confirmation interactions. Browser fixtures/exports are not device verification. Existing bottom-navigation layout retained. No dependency, backend, schema, RLS, RPC or web-repository changes; no commit, push, deployment or APK/native build.
- FILES: src/app/account.tsx, src/app/create.tsx, src/app/profile/[username].tsx, src/components/profile/profile-ui.tsx, new src/components/profile/profile-styles.ts, src/components/delete-draft-action.tsx, tests/profile-ui.test.mjs, tests/create-flow.test.mjs, tests/delete-draft.test.mjs, PROJECT_STATUS.md and ROADMAP.md. Existing unrelated changes preserved.


## Delete private drafts — 2026-10-18

- AUDIT: Account/Create draft cards previously only continued editing. get_account_journeys(owner_id, 'drafts') returns UUID journeys filtered by creator_id, status=draft, is_demo=false; table ownership is user_id. Existing journeys_delete_own RLS and owner SELECT permit direct authenticated deletion; no deletion RPC required. Web DELETE checks same-origin, cookie getUser, UUID and id/user_id; returns 404 on no row and 503 on failure, retaining immutable media. Mobile uses persisted Supabase authentication directly.
- RELATED DATA: Checked-in migrations cascade stops, likes, saves and travel_tracks; copied_from_journey_id uses ON DELETE SET NULL. Copies retain independent rows and durable media paths. Storage read policies recognize surviving journey references. No Storage deletion/cleanup trigger found. Deployed policy/grant parity has not been verified.
- IMPLEMENTED: Delete draft actions in Account and Create history; permanent-delete/cancel modal; duplicate-request lock; getUser check; atomic id/user_id/status=draft/is_demo=false filters; exact returned-ID confirmation; success feedback and refresh. Failed/unconfirmed requests retain card and confirmation with error feedback. Other drafts/published rows cannot match filters. No Storage objects removed.
- VALIDATION: Six focused query/component tests pass (success, cancellation, failure, wrong account, no authentication, zero-row denial, duplicate confirmation). TypeScript passed; offline Expo compatibility reports up to date with its reliability caveat. Final full suite passes 527/527; zero-warning lint, Android/iOS/web Expo exports and scoped git diff --check passed.
- PENDING: Physical Android/iOS confirmation, accessibility and network-failure checks. No live deletion, backend/schema/migration/RPC/RLS/web/dependency change, APK/native build, commit, push or deployment.
- FILES: src/lib/remix/delete-draft.ts, src/components/delete-draft-action.tsx, src/components/profile/profile-ui.tsx, src/app/account.tsx, src/app/create.tsx, tests/delete-draft.test.mjs, tests/create-flow.test.mjs and tests/profile-ui.test.mjs (fixture integration), PROJECT_STATUS.md, ROADMAP.md. Existing unrelated changes preserved.


## Shared mobile sign-in design — 2026-10-18

- [x] Reuse registration scenery/styles and viewport/keyboard behavior for sign-in; preserve contextual text, auth handlers and both navigation links.
- [x] Pass 26 auth tests, TypeScript, lint, Android/iOS/web exports and offline dependency compatibility (offline reliability caveat).
- [x] Inspect both modes at inset-aware 320x568 through 412x915; sign-in also fits 320x480, with reachable scrolling fallback at 320x360.
- [x] Record user-reported physical Android verification of the preceding sign-up design.
- [ ] Verify the new sign-in on physical Android: keyboard, focus/action access, safe areas, large fonts and TalkBack. No APK build requested or performed.

## Mobile registration viewport fit — 2026-10-18

- [x] Replace fixed hero height/cumulative spacing with measured viewport fit, compact grouping and surplus-only scenic space; retain native touch targets and readable inputs.
- [x] Permit scroll only for actual overflow and add keyboard focus reveal/avoidance without changing authentication or navigation.
- [x] Pass 23 auth tests, TypeScript, zero-warning lint, Android/iOS/web exports and offline compatibility check (offline reliability caveat).
- [x] Inspect exported UI with simulated system insets: zero-scroll controls at 320x568 through 412x915; verify reachable short-screen fallback at 320x480.
- [ ] Verify physical Android keyboard, insets, large fonts and TalkBack on the installed development client. No new APK requested or built.

## Mobile registration reference UI — 2026-10-18

- [x] Adapt the confirmed sunset-road reference to native registration only; retain email registration, sign-in switching and return navigation.
- [x] Add official Google logo and disabled Continue with Google placeholder; no OAuth/provider wiring or false success.
- [x] Pass 21 focused auth tests, TypeScript, zero-warning lint, Android/iOS/web Expo exports and scoped whitespace checks; offline compatibility check reports dependencies up to date with its reliability caveat.
- [ ] On the existing development client, check small screens, keyboard scrolling, large fonts, TalkBack, safe areas, backdrop/gradient appearance, back navigation and email confirmation UI. No physical run or APK build performed.
- [ ] Google authentication remains explicitly deferred.

## Travel Mode GPS reliability and direction — 2026-10-18

- IMPLEMENTED: Foreground watcher errors/no-fix timeouts automatically reconnect at 2/4/8/16/30-second delays, capped at 30 seconds while active, focused and foregrounded. Rechecks existing permission/services without automatic permission prompts; denial stops retries, disabled services remain distinguishable and are rechecked. Generation guards, a pending-watch lock, late-subscription removal, session-itinerary identity and retry/watchdog cleanup prevent overlapping watchers and obsolete callbacks. Synchronous Pause during publication cannot leave a watchdog behind.
- GUIDANCE: Sustained precise, plausible held-progress readings (at least three, spaced >=2 seconds, spanning >=8 seconds, gaps <=5 seconds) can request a replacement driving route to the same stop. Existing cancellation, 30-second reroute cooldown and 15-second request timeout apply. Never snaps to a nearest later maneuver. Whole-route proximity cannot cancel a progress-recovery request or automatically retry its failure. Ordinary off-route recovery retains its existing behavior. GPS-quality holds retain accepted route/progress internally; existing UI eligibility hides the route for >50 m accuracy or >15-second age, and instructions require <=25 m accuracy. Failed/outdated references remain separate and are discarded on GPS ineligibility; failed requests require explicit Retry.
- ARRIVAL PRESERVED: Haversine device-to-active-stop distance + reported accuracy <=50 m; <=25 m accuracy, <=15-second age, at least three readings across six seconds and existing plausibility/continuity safeguards. GPS offers a prompt only. Manual completion remains explicit, ordered and independent of GPS distance. No arrival/controller/store production rules changed.
- MAP: Follow zoom 16 (existing maximum); location dot radius 5/stroke 2, halo radius 9/opacity 0.18, location source above road/planned routes and stop layers. Expo heading and speed retained. A map-aligned compact pointer uses provider course after two eligible samples >=2 and <=5 seconds apart, accuracy <=25 m, age <=15 seconds, speed 1.5–55 m/s and course change <=60 degrees. Subsequent rotation uses 50% shortest-angle smoothing, including 359/1 wraparound. Missing/invalid course, slow/stationary movement, poor accuracy, long gaps or abrupt direction changes restore the dot; existing >50 m/>15-second position hiding remains. Manual exploration/recenter preserved. No GPS history/trail exists; driving and dashed planned connections remain.
- VALIDATED: Final focused suite 102/102; full suite 511/511; TypeScript and zero-warning lint; final Android Hermes export (4.3 MB); git diff --check. Added timeout/error recovery, capped backoff, synchronous errors, cancellation races, unresolved watch startup, exact missed-turn, no retry loop, accuracy transitions, backward/parallel/multi-turn, arrival boundary/co-located stop and rendered marker tests. Updated old UI expectations for new status wording/zoom and retained-route semantics. React component review found no new subscriptions, hooks or dependencies in the renderer.
- COMPATIBILITY LIMIT: Offline Expo install --check reported dependencies up to date with its explicit offline-reliability warning. This does not establish current online compatibility or resolve historical patch-mismatch notes. No packages changed.
- PENDING PHYSICAL ANDROID: On the installed development client, confirm latest JS revision; test GPS interruptions of 6/16/>30 seconds, services off/on, revoked/approximate permissions, recovery without tapping Retry, missed turns/multiple turns, offline Directions failure and explicit Retry, stop approach at 100/75/50/25 m, nearby/co-located stops, stale/double confirmation, direction at walk/stop/turn and north wraparound, rotated map, zoom/gesture/recenter, Pause/Resume/Finish/background/blur and final-stop cleanup. Export/mocks are not native device validation; no physical run or native build was performed.
- SCOPE: Eight application files (foreground-location, location-port.native, use-trip-location, navigation, turn-guidance, travel-camera, map-frame, native-map), five test files (new travel-recovery plus foreground-location/navigation/turn-guidance/story-interaction), PROJECT_STATUS.md and ROADMAP.md. Backend, schemas, contracts, access rules, dependencies and existing arrival thresholds unchanged. No EAS build, commit, push or deployment. Await review before additional changes.

## Published Journey final refinements — 2026-10-17

- IMPLEMENTED: Compact tappable title/About header, full-width map, smaller 230dp swipe deck with uncropped photo area, synchronized existing map/card selection, and authoritative Like count. Save count omitted because the existing contract exposes only the viewer's saved state.
- REUSE: Existing JourneyMap, Home photo/route overlays, StorySheet, StopTimeline and social/navigation handlers. Shared nearbyFocus and NearbyLocations chooser handle overlapping points on Home, editor and public maps without changing stored coordinates; zoom capped at 16. Home overlapping marker tap zooms first, subsequent tap opens journey.
- SHARING: User approved expo-sharing ~57.0.23 and react-native-view-shot 5.1.0. Share freezes the selected memory and previews bundled-logo/title/location/public-URL artwork; local 1080x1920 PNG capture opens the native file chooser. Separate link action and selectable URL remain. Missing/failed photos and unavailable native modules fall back to link sharing. No media upload, QR/shortener, or clickable-image guarantee.
- VALIDATION: Focused map/story checks 131/131, navigation 15/15, sharing 5/5; final full suite 493/493. TypeScript, zero-warning lint, Android Hermes export and git diff --check passed. Expo compatibility still reports five existing patch mismatches (expo, expo-asset, expo-constants, expo-linking, expo-router); no automatic upgrades applied.
- PENDING DEVICE: Refreshed native development client required for the two libraries. Verify capture/layout, WhatsApp/Instagram chooser handoff and cancellation, nearby zoom/chooser, map/card gestures, reduced motion, backgrounding, small screens/large fonts and TalkBack. Projected overlap is an estimate at globe pitch/rotation. No physical-device result claimed.
- No backend/schema/persistence/auth changes, commit, push, deployment or EAS build. Existing uncommitted work preserved.

## Published Journey map-first redesign — 2026-10-17

- IMPLEMENTED: Removed public cover header; bounded interactive map leads a scrollable story and single-card deck. Title, creator, destination, duration, traveler type and description retained. Fixed bottom SocialActions/StoryCreator and Start Journey preserve sharing, Like/Save, profile and existing Travel Mode eligibility/navigation. Options, About, refresh, Remix and full story viewer retained.
- REUSE: JourneyMap/NativeJourneyMap, editor memoryPhotos path, Home JourneyOverlays/PhotoPin/TravelingPlane and playback/camera cleanup. Public-only opt-in permits initial playback with the first card selected; user selection stops idle travel and focuses its marker. Other screens retain defaults. Numbered markers remain for missing/failed photos; gaps and insufficient routes are handled by existing map data.
- CARDS: StopTimeline opt-in stacked appearance, native full-width paging/directional lock, shared selection, 44dp Previous/Next controls, reduced-motion-aware external scrolling. Original order, details and JourneyPhoto fallback preserved.
- VALIDATION: Focused map/story tests58/58 and full suite486/486 passed. TypeScript, zero-warning lint, Android Hermes export and whitespace checks passed. Expo compatibility reports the same five pre-existing patch mismatches; no dependency changes.
- LIMITS: Data supplies planned stop connections, not road geometry/recorded GPS. Deck uses lightweight native paging rather than physics-based throwaway cards. Physical Android gesture arbitration, photos, map/card synchronization, reduced motion/backgrounding, small screens/large fonts, TalkBack and action handoff remain pending.
- FILES: public journey screen, stop-timeline, map-frame, journey-map.native, native-map, story-interaction/map tests and project notes. No backend/schema/persistence/auth changes, commit, push, deployment or EAS build.

## Edit Journey settings popup — 2026-10-17

- IMPLEMENTED: Expanded settings replaced with a transparent keyboard-aware bottom sheet. Reuses QuickJourneySetup destination/title/companions/duration controls, PlacePicker and Action, with an edit-only description field and pale-blue styling. Creation defaults preserved.
- BEHAVIOR: Close/Android Back retain live unsaved form edits. Save Changes uses existing full private draft/photo save and closes on success only; validation/errors remain visible. Save/photo locks prevent dismissal. Memory page stays mounted; decorative map playback pauses while settings are open.
- VALIDATION: Focused editor tests51/51 and full suite485/485 passed; TypeScript, zero-warning lint and Android Hermes export passed. No backend/schema/data/dependency changes or commit/push/deploy/EAS build.
- PENDING: Physical Android keyboard/small-screen/large-text scrolling, suggestions, TalkBack focus and dismissal checks.

## Add Memory popup visual refinement — 2026-10-17

- IMPLEMENTED: Popup-only pale blue/cream gradient surface, navy heading, separate raised location shortcuts, inset inputs, blue Search, raised photo tools and purple-to-blue Save. Compact spacing, safe-area keyboard avoidance, scrollable fields and fixed Save footer retained. Shared control styles opt in only through memorySheet; cover/Create/Home defaults unchanged.
- PRESERVED: Existing name/location, notes, day, rating, gallery/camera/upload/previews/removal, save/edit validation, loading/errors, persistence and dismissal handlers. No dependencies, backend, schema or API changes.
- VALIDATED: 135/135 focused create, memory location and photo tests; TypeScript, zero-warning lint and Android Hermes export passed. No commit, push, deployment or EAS build.
- PENDING: Physical Android appearance, keyboard, small-screen and large-font checks. Automated tests/export do not establish device visual fidelity.
- FILES: memory-editor-sheet.tsx, photo-field.tsx, place-picker.tsx, discovery/ui.tsx, create.tsx (memory photo styling opt-in), and these project notes.

## Memory map photo markers and calm playback — 2026-10-17

- [x] Compact 44dp Save Draft/Publish controls with original actions and validation.
- [x] Reuse Home photo annotations and travel playback only for the editor; separate photo updates from map geometry and connect memory selection/card browsing to existing camera transitions.
- [x] Calm 8400ms-leg planned route indicator, gesture/selection/sheet/save/focus/background/reduced-motion guards; missing/failed photo circles and coordinate-gap handling preserved.
- [x] Retain lightweight airplane after inspecting available assets; optional future 2D Mapbox sprite, no 3D work.
- [x] Focused map/editor/Home tests113/113 and navigation tests15/15 passed; final full suite483/483 passed. TypeScript, zero-warning repository lint, Android Hermes export (4.3 MB), and scoped staging/whitespace checks passed. Expo compatibility reports the same five pre-existing patch mismatches (expo, expo-asset, expo-constants, expo-linking, expo-router); no dependencies were changed.
- [ ] Physical Android annotation/image performance, gesture arbitration, selection flights, inactive cleanup and small-screen button field checks.

## Branded initial loading experience — 2026-10-16

- [x] Bundled-logo navy loader, conservative reduced-motion handling, native pulse cleanup, compact globe variant and bounded non-remounting startup overlay.
- [x] Integrate genuine first-data loads across main/detail/profile/editor screens; retain refresh/retry content, existing routes, Mapbox readiness/fallbacks and optional image placeholders.
- [x] Fix first-focus empty-content flash and timeout settlement for transports ignoring abort; test late completion, ownership changes and retained data.
- [x] Full regression suite: 480/480 passed. Home/Search readiness suite: 16/16 passed. Final animation/readiness retest: 5/5 passed. Final TypeScript and Android Hermes export (4.3 MB) passed. Repository lint identified only loader ref-access errors; these were corrected and the changed loader passed a zero-warning lint recheck. Scoped staging and whitespace checks passed.
- [ ] Physical Android cold-start, slow/offline data/map, tab revisit, TalkBack/reduced-motion and cached-image field checks.

## Existing journey editor visual redesign — 2026-10-16

- [x] Cream/pastel editor, actual-cover hero, compact cover tools and horizontal memory cards with real metadata; retain edit/settings/back and every memory operation.
- [x] Keep private Save Draft, validated Publish Journey and Add memory visible in the existing fixed footer; retain all storage/data/navigation semantics.
- [x] Full 475/475 tests (including two new horizontal-card regressions), TypeScript, zero-warning lint, Android Hermes export (4.3 MB), and scoped whitespace/staging checks passed. Phone-width layout contracts cover 320/360/393/412 px; real device gestures and visuals remain pending.
- [ ] Physical Android horizontal scrolling, expanded text, keyboard/sheet interactions and complete live draft/memory/photo/publish field testing.

## Create Journey reference styling — 2026-10-16

- [x] Apply raised off-white form, pastel controls, gradient Create action and compact draft surface styling, retaining the live native globe and existing navigation.
- [x] Preserve search, keyboard-safe CTA, title/duration, private creation/drafts, memory/photo flows and all shared styling defaults with opt-in variants.
- [x] Full 473/473 tests, TypeScript, zero-warning lint, production Android Hermes export (4.3 MB), and scoped whitespace checks passed. Existing flow tests cover destination search/camera, title/duration, draft entry/save, memory/photo behavior and keyboard-safe layout contracts.
- [ ] Confirm native gradients/shadows, small-screen keyboard layout and full creation/draft/memory flow on physical Android. Draft photo thumbnails remain unavailable from the current ID/title-only shortcut loader.

## Home drag interrupted by late layout measurements — 2026-10-16

- [x] Reproduce card/header measurements resetting an active drag/opening spring to collapsed; earlier release tests did not cover this timing.
- [x] Keep gesture handlers and active drag frame stable; queue new geometry for settling, retarget the requested mode smoothly, cancel only for explicit interruption/unmount.
- [x] Focused24/24, full473/473, TypeScript, lint, Android export and preservation/whitespace checks passed.
- [ ] Confirm first-attempt card drag and expanded scrolling on physical Android after reloading the updated app. No positional World-button collision was found in code; native dispatch remains unverified.

## Home upward-swipe release and list handoff — 2026-10-16

- [x] Reproduce slow upward release snapping back and equal-height short-screen failure to enter vertical journeys.
- [x] Make deliberate upward release open the expanded list; preserve small-movement, downward/peek, horizontal card and open-list scrolling behavior.
- [x] Focused22/22, full471/471, TypeScript, lint, Android Hermes export and preservation/whitespace checks passed.
- [ ] Confirm release-to-expand and subsequent list scrolling on the physical Android app. No new APK/EAS build performed.

## Home polish and bottom-sheet stability — 2026-10-16

- [x] Reproduce expanded-chrome feedback and rapid-toggle defects using a stateful panel/hook harness; stabilize compact measurements, animated graph identity and pending toggle intent without new dependencies or changed gesture ownership.
- [x] Remove hero heading/subtitle, compact banner~23%, compact Home World visual~18% with44dp touch area; retain globe/search/navigation/data behavior.
- [x] Verify X history; show original Clear located journey control, disabled without selection. No invented sheet/Home dismissal.
- [x] Full468/468 tests, stability6/6, TypeScript, zero-warning lint, Android Hermes export4.3MB, scoped whitespace and startup preservation audit pass.
- [ ] Physical Android field test: repeated handle taps/drags/snaps, horizontal cards, actual flicker/smoothness, narrow/large text/keyboard/safe areas and existing globe/search/journey/navigation controls. No APK/EAS/native build performed. See PROJECT_STATUS.md for evidence and limits.

## Reference-inspired premium Home redesign — 2026-10-16

- [x] Simplify header, preserve functional inline place search/live globe, add cyan title, refined real-photo cards and compact Create banner.
- [x] Add five-item floating navigation with real Account avatar and Story reusing the existing public Search screen. Route entry params distinguish selection; Search/Story filters remain independent without duplicate lists/routes.
- [x] Measure sheet chrome/cards and banner/navigation clearance; preserve existing peek/expanded gesture behavior, errors/loading/empty states and native map padding.
- [x] Full462/462 tests; final focused69/69, TypeScript, zero-warning lint, Android Hermes export and preservation/whitespace audit passed. Five existing Expo patch mismatches remain; no dependency updates.
- [ ] Physical Android visual/interaction QA: short/narrow/large text, keyboard/suggestions, camera flights/globe controls, all five tabs/Back, CTA/journey actions, profile avatars and failure states. No APK/native/EAS build or deployment performed. See PROJECT_STATUS.md for visual limitations.

## Home inline place search and temporary companion removal — 2026-10-16

- [x] Remove only the Home companion mount and switch; preserve all companion implementation, flag/assets and saved preference.
- [x] Reuse existing Geocoding v6 picker and destination flight/marker for inline Home place/address suggestions, debounce/cancellation/loading/errors, permission-free proximity fallback and repeat selections. Preserve journey Locate, markers, rail, account and navigation.
- [x] Full459/459 tests, TypeScript and zero-warning lint passed; one live existing-adapter search returned five coordinate-bearing Kochi results; Android Hermes export passed. Existing five Expo patch mismatches remain without upgrades. See PROJECT_STATUS.md for details and preservation evidence.
- [ ] Physical Android search/keyboard/overlay/camera/marker/lifecycle and Home regression QA. General POI/landmark search is unsupported by the current Geocoding v6 API; no new search endpoint/service added. No native/EAS build, commits, deployment or backend changes.


## Standalone Android field-test APK preparation — 2026-10-16

- [x] Configure explicit internal standalone preview APK using EAS preview environment; retain development/production profiles and installed app identity.
- [x] Derive launcher/adaptive icons from existing branding, retain in-app logo, update splash branding and verify full adaptive foreground fits Android safe circle. EAS prebuild generates native resources.
- [x] Inspect runtime/env/network: no application local endpoints or dev-only functionality requirement. Four existing local service variables are MISSING remotely at both EAS preview project/account scopes. Optional companion flag/default unchanged; no remote configuration writes.
- [x] Typecheck/lint, focused174/174, full455/455, production Android export6.8MB, Expo introspection, config/preservation assertions and whitespace checks pass. Doctor20/21 retains five pre-existing patch mismatches; dependencies unchanged.
- [ ] Before build: review docs/android-field-test.md and configure the four public service values in EAS preview. Review existing compatibility warnings; no automated upgrade. Start EAS only after owner review; no build was started here.
- [ ] Build/install NEW preview APK; validate laptop/Metro-off cold start over cellular, branded launcher/splash, maps/navigation/auth/photo/upload/foreground GPS/Travel/lifecycle/accessibility and network loss. No offline-map/GPS-accuracy/native-build/device success claim. adb absent from PATH; direct APK download is supported. See exact commands/checklist in docs/android-field-test.md.


## Create destination globe and search layout — 2026-10-16

- [x] Enlarge responsive Create globe using existing Mapbox; enable native gestures and selected-point flyTo/marker with repeat-selection and layout/lifecycle guards. Default Home globe unchanged.
- [x] Move Create suggestions below search input with bounded scrolling, outside/Close cancellation and existing search icon; compact44dp CTA, keyboard72dp map and temporary draft hiding. Preserve horizontal history and all existing creation/data/photo behavior.
- [x] Focused109/109, full455/455, typecheck, zero-warning lint, Android export and preservation/whitespace checks passed. Nearby context uses only existing Satellite Streets/Outdoors labels; point-only selections cannot fit country bounds. Existing five Expo patch mismatches retained.
- [ ] Physical Android verification of actual flights/markers/rapid selection/gestures/keyboard/results/safe-area/large text on small and large screens, including supplied viewport; Home regression. Export and mocked tests do not establish native visual correctness. No native build/EAS/commit/push/deploy.


## Functional Edit Profile — 2026-10-16

- [x] Verify existing authenticated profiles update and profile-avatars owner insert/signing contracts; enable owner Edit Profile and implement real display name/username/bio/avatar prefill/preview/explicit persistence.
- [x] Reuse unchanged photo conversion/validation, immutable owner uploads, strict returned-row confirmation, repeated-save/timeout/uncertain-write/discard guards and authoritative Profile refresh by ID. No backend/schema/policy/dependency/photo-flow changes; no unsupported location field.
- [x] Focused49/49, full452/452, typecheck, zero-warning lint, Android export, whitespace and preservation audit passed; see PROJECT_STATUS.md for exact tests/contracts.
- [ ] Physical Android and deployed permission/storage/network/save-reopen verification remains required. Existing storage has no avatar delete policy; unreferenced uploads may remain. Existing Expo patch mismatches retained. No live writes/build/commit/push/deploy.


## Reference-inspired Profile and Account redesign — 2026-10-16

- [x] Follow owner reference: navy toolbar, real circular avatar/identity/count, divider, personal heading, Published/Drafts pills and compact horizontal-content journey cards on cream. Preserve owner/private gates, real data/navigation/refresh/auth/sign-out and existing bottom navigation.
- [x] Reuse existing published RPC/normalization/media signing in a read-only wrapper; no backend/config/dependency/photo-processing changes. Account defaults Drafts for existing Create navigation. Edit profile/notifications remain visibly unavailable; no fake fields/private draft photos/stats.
- [x] Focused41/41, full444/444, typecheck, zero-warning lint, Android export, whitespace and preservation audit passed. Tests are mocked/structural; see PROJECT_STATUS.md for source limitations and exact cases.
- [ ] Physical Android reference/large text/safe area/avatar/cards/tabs/settings/auth/sign-out/refresh/create/resume verification required. Account needs known session handle to resolve public profile identity beyond auth metadata; existing Expo patch mismatches remain. No build/commit/push/deploy/live writes.


## Create static horizontal drafts — 2026-10-16

- [x] Follow owner's confirmed left-to-right scrolling choice. Remove Create draggable sheet entirely; center heading across balanced View all/spacer slots and retain static horizontal draft resume cards.
- [x] Focused59/59, full438/438, typecheck, zero-warning lint, Android export, diff/whitespace and four-file preservation audit passed. Home sheet/globe/form/save/photo/backend/dependencies untouched; see PROJECT_STATUS.md for exact evidence and cases.
- [ ] Physical Android visual/native horizontal gesture, long-title/large-text/keyboard/short-screen/Create/navbar verification remains required. Existing five Expo patch mismatches retained. No commit/push/deploy/EAS/native build/live writes.


## Saved editor action layout polish — 2026-10-15

- [x] Balance Save/Publish into equal-width secondary controls; retain full-width Add memory primary action, fixed footer, existing handlers/guards and navigation clearance.
- [x] Focused88/88, full438/438, typecheck, zero-warning lint, Android export, diff/whitespace and preservation audit passed.320/360/393/412dp structural layout coverage; photo processing and unrelated work untouched.
- [ ] Physical Android visual/large-text/keyboard/action-state verification remains required. No commit/push/deploy/build/live writes; see PROJECT_STATUS.md.


## Create drafts gap correction — 2026-10-15

- [x] Remove automatic top margin that pushed collapsed history down. Keep a fixed small gap below the form; show one collapsed draft at136dp when available area >=496dp, otherwise use56dp header. Preserve shared sheet gestures, View all, expanded scrolling and Create/navigation access.
- [x] Focused59/59, full438/438, typecheck, zero-warning lint, Android export, whitespace and four-file preservation audit passed. Photo processing/Home/globe/backend/dependencies untouched; see PROJECT_STATUS.md.
- [ ] Physical Android visual/native-touch, long text/keyboard/orientation and collapse-after-scrolling checks remain required. No commit/push/deploy/build/live writes.


## Create globe clearance and shared drafts sheet — 2026-10-15

- [x] Remove initial Create back/title/subtitle obstruction; keep full shared-margin measured globe viewport and unchanged renderer/configuration.
- [x] Reuse actual Home sheet hook with optional Create snap sizes,56dp collapsed header, accessible View all, bounded expanded scrolling list, original draft actions and protected Create/navbar space.
- [x] Final focused59/59, full438/438, typecheck, zero-warning lint, Android export, whitespace and preservation audit passed. Home defaults/photo processing/UI/backend/dependencies retained; see PROJECT_STATUS.md for responsive cases and exact behavior.
- [ ] Physical Android visual/native-touch, safe-area/keyboard/large-text/orientation, creation/resume and Home regression verification remains required. Extremely short areas use View all when expansion is constrained; existing five Expo patch mismatches remain unchanged. No build/commit/push/deployment/live writes.


## Shared photo conversion/header regression correction — 2026-10-15

- [x] Trace camera/gallery -> shared local preparation -> explicit save -> prepared-buffer read/Storage/RPC. Historical hashes and baseline reproductions show camera fix retained, gallery pre-conversion rejection/dropped dimensions and camera-only64KiB reader coverage.
- [x] Byte-identified library HEIF uses existing bounded native JPEG encoding; strict actual output validation retained. Stale HEIF metadata with actual JPEG is verified/re-encoded. Original large-JPEG/EXIF reader extended to both sources, output inspection and exact upload buffer.
- [x] Focused113/113, full436/436, typecheck, zero-warning lint, Android export, whitespace and preservation audit passed. Six new regressions cover both HEIF sources, metadata, native adapter/output bytes, unsupported/bounds/failure retention and large headers; latest UI/backend/dependencies unchanged.
- [ ] Physical cover/memory camera/library HEIF/JPEG/orientation/large-header/preview/explicit Save-reopen and failure recovery required. Native HEIF decoder/picker dimensions remain platform requirements; no new native binary expected for compatible clients.
- [ ] Expo compatibility reports existing patch mismatches (current expected Expo~57.0.30 and Router~57.0.28 plus Asset/Constants/Linking); packages retained. No live writes/build/commit/push/deployment. See PROJECT_STATUS.md.


## Editor/memory screenshot layout correction — 2026-10-15

- [x] Compare owner's current Android screenshots with reference; fix duplicate header, expanded cover tools and wrapping location row.
- [x] Integrated cover/back/status/settings header, compact expandable cover summary, equal-width icon shortcuts, correct memory address placeholder and staged photo/note/details reveal. Existing actions, save guards, loading/error back routes and data semantics preserved.
- [x] Focused117/117, full430/430, final focused117/117, typecheck, full/targeted zero-warning lint, Android export and whitespace/preservation audit passed. Width cases320/360/393/412dp are structural checks, not native screenshots.
- [ ] Phone reload/reference comparison, narrow/large-text/keyboard/TalkBack and actual expand/photo/location/name/save/discard/reopen regression required. Existing five Expo patch mismatches remain unchanged.
- [ ] No backend/dependency/native/companion changes, live writes, EAS build, commit, push or deployment. See PROJECT_STATUS.md.


## Journey editor and Add/Edit Memory reference styling — 2026-10-15

- [x] Inspect actual saved editor, memory sheet, photo/location/save/discard behavior and tests. Reference-style real cover header, sage memories/settings cards, rounded photo/memory cards and fixed Save Draft/Publish/Add Memory footer.
- [x] Rounded keyboard-aware Add/Edit sheet, grouped existing location/name/GPS actions, selected-location card, photo section, truthful1000-character note counter and existing Day/Rating details; fixed Save memory and inline search results without nested modal.
- [x] Focused114/114, full427/427 and final focused114/114 after scrolling refinement; typecheck, zero-warning lint, Android export, whitespace and preservation audit passed. Existing backend/models/photo/GPS/conflict/navigation semantics retained.
- [ ] Physical Android layout/large text/keyboard/TalkBack, cover/settings/memories/actions and real search/GPS/camera/gallery/explicit save/reopen/discard/error checks required. Existing Expo patch mismatches remain unchanged.
- [ ] Reference-only recent/nearby/date/time/multiple-photo features were not added. No dependencies/native config/live writes/EAS build/commit/push/deployment.


## Create Journey reference-inspired globe header — 2026-10-15

- [x] Adapt owner reference using existing rounded cream/sage/green identity, white form panel, pastel traveler chips and compact truthful draft rows; preserve all existing creation actions and separate scrolling.
- [x] Reuse Home DiscoveryGlobe in measured96–144dp Create header with opt-in static preview, retained attribution/lifecycle/fallback and unchanged Home defaults. No additional journey data/GPS/backend/dependency/native configuration changes.
- [x] Focused112/112, full424/424, typecheck, zero-warning lint, Android export, whitespace and preservation audit passed; see PROJECT_STATUS.md for coverage.
- [ ] Physical Android reference appearance/globe framing/large text/keyboard/CTA/create/resume/Home-return/performance checks required. Expo compatibility retains five existing patch mismatches.
- [ ] No EAS build, live write, commit, push or deployment. Stop at this UI change.


## Create Journey single-screen compact refinement — 2026-10-15

- [x] Inspect latest redesign/title logic/tests and preserve existing work. Compact initial header, destination/title/traveler/duration controls, nonshrinking Create footer and independently scrolling history; retain existing safe-area/navigation reservation.
- [x] Bounded real-result destination modal with independent scrolling/attribution, selection, keyboard dismissal, Close and Android back; default inline place pickers unchanged. No backend/dependency/native/companion changes.
- [x] Focused55/55, full422/422, typecheck, zero-warning lint, Android export and diff/whitespace/preservation audit passed. Style-based normal-text budgets cover320x568,360x640,393x851,412x915; structural overflow and modal tests are not phone-rendering evidence.
- [ ] Physical Android sizes/insets/large text/keyboard/TalkBack/CTA/search/create/resume/error regression required. Online Expo compatibility still reports the five existing patch mismatches; dependencies retained.
- [ ] No native build, live write, commit, push or deployment. See PROJECT_STATUS.md for exact checks and limitations.


## Create Journey setup UI refinement — 2026-10-15

- [x] Inspect existing setup/editor, Mapbox search, validation/save guards, measured bottom-navigation clearance and owner-only private-draft history; preserve unrelated work.
- [x] Sage destination card, selected-place summary, white compact details card, accessible traveler/day controls, Create my journey CTA and compact real draft resume cards; no new assets/data or backend changes.
- [x] Focused51/51, full418/418, typecheck, full zero-warning lint, Android Hermes export and diff/explicit whitespace/preservation checks passed. Final focused checks cover the presentation refinements.
- [ ] Expo online compatibility check reports five existing patch mismatches; dependencies retained. See PROJECT_STATUS.md for exact versions.
- [ ] Physical Android layout/large-text/TalkBack/keyboard/CTA clearance and actual creation/resume regression remain required. No native build, live writes, commit, push or deployment.


## 3D Travel Companion — Milestone 4: Home ON/OFF preference — 2026-10-14

- [x] Inspect existing flag, Home controls and AsyncStorage use/tests. Add one compact normal-flow Travel Companion switch row below the existing Home header; no separate settings route or covering map/navigation controls.
- [x] Persist device-local ON/OFF in isolated AsyncStorage key; startup hidden until loaded, 2-second failure timeout, serialized writes and stale-result/unmount safety with truthful error states.
- [x] Saved preference overrides the old environment flag. Flag is only fresh-install default; Android/native ExpoGL capability checks remain with disabled Unavailable switch on unsupported clients.
- [x] OFF synchronously stops frames then unmounts companion/bubble/Restore and clears guide; ON starts fresh existing behavior. Preserve temporary Hide/Restore, greeting Close, animation/lifecycle/Reduce Motion and all Home interactions.
- [x] Final focused 42/42, full 416/416, typecheck, zero-warning lint, Expo compatibility and Android export with flag=false (1,945 modules; unchanged GLB/PNG) passed. Generated Expo route-type cache regenerated without route/config changes. See PROJECT_STATUS.md/report for preservation checks.
- [ ] Physical Android: switch placement/accessibility, OFF in each interaction stage, ON restoration, restart persistence/no saved-OFF flash, map/navigation gestures, short screen/large text, background/blur and repeated resource cleanup cycles.
- [ ] Further milestones remain out of scope. No EAS build, commit, push or deployment.


## 3D Travel Companion — Milestone 3B: point toward Create Journey — 2026-10-14

- [x] Inspect actual GLB and Home navigation. Preserve 2.6-second wave; append a safe downward arm cue/hold/idle return using existing rig and controller. Mitten hand has no index-finger rig.
- [x] Keep explorer globe-side; pause floating for the complete sequence; preserve idle/breathing, repeated-tap guard, Hide/Restore, lifecycle cleanup and static Reduce Motion.
- [x] Temporary friendly point-phase bubble names Create Journey. Optional non-interactive border/tint is anchored inside the actual existing third navigation button; no coordinate guessing, layout/route/tap changes, arrow across the map or automatic navigation.
- [x] Guide clears on Close, completion, Hide/blur/background/unmount/failure and Reduce Motion; other screens default to no guide.
- [x] Focused 34/34, full 408/408 and typecheck passed; real-GLB stance/framing/transition and guide/button tests included. Zero-warning lint, Expo compatibility, enabled Android export (1,942 modules), diff/explicit whitespace and preservation audit also passed. See PROJECT_STATUS.md.
- [ ] Physical Android: gesture readability and target clarity, repeated taps/Close/Hide/Restore, globe and Create Journey taps, sheet/layout/accessibility/lifecycle interruptions and performance. Desktop/CPU checks do not verify phone behavior.
- [ ] Further milestones remain out of scope. No EAS build, commit, push or deployment.


## 3D Travel Companion — Milestone 3A: greeting wave — 2026-10-14

- [x] Owner confirms physical Android M2 explorer/floating/breathing/head motion and tap greeting. Wave is separately pending physical verification.
- [x] Inspect actual Idle-only GLB and validated right-arm Bone chain; add one short smoothly blended procedural wave without replacing asset or modifying joint translations/scales/IK.
- [x] Ignore overlapping tap requests; pause floating during wave, reduce competing upper-body sway, restore authored arm on finish/interruption. Greeting/Close, fixed Restore, gesture layering and default-off flag retained.
- [x] Existing driver only; synchronous Hide/background/blur cancellation, unmount/resource cleanup, static Reduce Motion and safe effect replay.
- [x] Focused 31/31, full 405/405, typecheck, zero-warning lint and Expo compatibility passed. Real-GLB CPU pose/stance/framing tests and desktop pose preview are automated/desktop evidence only. Enabled Android export (1,942 modules), diff/explicit whitespace and baseline preservation audit passed. See PROJECT_STATUS.md.
- [ ] Physical Android wave: natural raised-hand motion/idle return, repeated taps, greeting Close during playback, Hide/Restore, globe gestures, sheet/background/blur interruptions, Reduce Motion before/during wave and sustained performance.
- [ ] Further milestones remain out of scope. No EAS build, commit, push or deployment.


## 3D Travel Companion — Milestone 2 — 2026-10-14

- [x] Owner confirms M1.1 Android explorer rendering, closable greeting and globe zoom after resolver fix. This does not validate the new Milestone 2 motion.
- [x] Restrained deterministic floating within measured safe clearance; at most 18 dp left/12 dp down, slow cycles and speed limit. Greeting follows/freeze-on-open, press pause, resize clamp and measured larger-text height. Existing fixed Restore anchor and gesture layering preserved.
- [x] Inspect actual Idle/skeleton; retain GLB and slow Idle to 0.4 speed, adding non-accumulating chest/head motion. Feet remain authored; no facial-animation claim. Shared 30 Hz driver, no new dependencies/loops; lifecycle pause/resume and reduced-motion static pose.
- [x] Final focused 26/26, full 400/400, typecheck, zero-warning lint, Expo compatibility, Android export and whitespace checks passed; real-model CPU motion/framing checks and desktop pose inspection. See PROJECT_STATUS.md.
- [ ] Physical Android: comfort/visibility/taps/greeting/Hide/Restore, globe and journey controls, sheet/short-screen/large-text clearance, Reduce Motion, background/blur/resume, interruption cleanup and sustained performance. New motion is not device-verified.
- [ ] Milestone 3 remains out of scope and unstarted. No EAS build, commit, push or deployment.


## 3D Travel Companion — Milestone 1.1: shared Android Three runtime — 2026-10-14

- [x] Narrow Android bare-three resolver canonicalizes to Fiber-patched three.cjs; Expo delegation, addon paths, assets and other platforms preserved. Dependencies/model/Home/Restore/flag unchanged.
- [x] Restart Metro with cleared cache, retaining existing enabled flag; live graph proves companion, Fiber native/core and GLTFLoader share one module ID with no ESM Three build.
- [x] Focused 19/19; full 393/393; typecheck; zero-warning lint; Expo compatibility; Android export with GLB/PNG; diff and task-file whitespace checks passed. Native adapter/addon CPU regression included. See PROJECT_STATUS.md.
- [ ] Owner Android retest: visible textured idle explorer, no multiple-Three warning, transparent background, greeting/Hide/Restore, unchanged Home/Mapbox controls and lifecycle behavior. Physical rendering remains unverified.
- [ ] Milestone 2 remains separately approval-gated and unstarted. No EAS build, commits, pushes or deployment.


## 3D Travel Companion — Milestone 1 — 2026-10-14

- [x] Default-OFF isolated Android Home fixed companion overlay, verified CC0 KayKit-derived local idle GLB, original backpack, transparent renderer, tap greeting and minimize/restore.
- [x] Pinned Fiber9.8.1/Three0.184.0/ExpoGL57.0.2/Asset57.0.19/types0.184.0 without Expo/RN upgrade or peer overrides; additive Expo Metro GLB configuration.
- [x] Safe layout/touch gates, missing-native/import/load/render fallback, synchronous frame cancellation on blur/background/minimize, Reduce Motion single pose, late-load/resource cleanup.
- [x] Focused15/15; full389/389; typecheck; zero-warning lint; Expo dependency check; diff and task-file whitespace checks; enabled Android Metro/Hermes export with bundled GLB+PNG. Browser asset preview only; no native/device verification. See PROJECT_STATUS.md.
- [ ] Build/install new ExpoGL-enabled Android development client, enable flag explicitly, and complete physical rendering/Mapbox gesture/lifecycle/accessibility/memory/battery checklist. No EAS build started.
- [ ] Milestone2 floating movement requires separate owner approval; not begun.


Updated 2026-10-13. See PROJECT_STATUS.md for evidence and AGENTS.md for boundaries.

## Persistent Android camera failure: evidence-driven follow-up - 2026-10-14
- [x] Fresh owner device logs identify readable2,913,299-byte JPEG3072x4096 rejected at source-validate before native manipulation. HEIC/zero dimensions are not the cause of that capture. Reproduced64KiB prefix/large-metadata rejection and added bounded camera-only JPEG structural reading with preserved EXIF orientation and actual native encoding/output validation. Post-fix device logs now confirm dimensionOffset458,560 and ready; see the physical result below.
- [x] Separately fixed SDK contract mismatch: picker dimensions may be0; valid actual file-header dimensions now take precedence. No weakened image limits.
- [x] Safe development-only stage/fact/exception diagnostics and recoverable failed-at-stage message added; previous candidates/gallery/explicit-save/raw Storage behavior preserved. No dependency/config/native/permission/backend changes or rebuild.
- [x] Final structural-reader focused103/103, full380/380, targeted28/28, typecheck, full lint, git diff --check and seven-task-file whitespace checks passed. Source/mocks only.
- [x] Physical Android post-fix logs confirm structuralRead:true, dimensionOffset458,560 beyond the old64KiB peek, native JPEG encode and output validation -> ready. Source3072x4096/2,777,786bytes becomes validated1536x2048 JPEG/262,810bytes. No rebuild. This confirms the real header-boundary root cause and conversion for this capture.
- [ ] Confirm preview/orientation/Not saved, explicit Save memory and reopen persistence, cover capture/reopen, cancel preservation and gallery regression. The ready log alone does not verify these UI/backend behaviors; see PROJECT_STATUS.md.

## Camera compatibility and permission recovery - 2026-10-14
- [x] Traced/reproduced pre-conversion HEIC metadata rejection. Camera-only preparation now performs real bounded native JPEG encoding and validates actual output bytes before preview; gallery rules, previous selections, Not saved and explicit upload-on-save remain intact.
- [x] On-demand supported camera permission API retained; denied/permanent denial has Cancel/Open Settings plus gallery fallback and Settings-failure guidance. No microphone/background/dependency/configuration/backend/GPS change.
- [x] Focused96/96 passed; final full373/373 and camera/gallery21/21 after import-error recovery adjustment passed. Final typecheck, full lint, git diff --check and five-task-file whitespace checks passed. Mocks only; native conversion is not device-verified.
- [ ] Physical failing-device retest of native conversion/orientation/permissions/Settings/gallery/cancellation/cover-memory save-reopen. No new build needed solely for this JS fix on a camera-enabled client; the older gallery-only client still requires the prior camera-enabled rebuild. Exact checklist and remaining live Storage limitations are in PROJECT_STATUS.md.

## Create Journey: Take Photo - 2026-10-14
- [x] Explicit Take Photo + Choose from Gallery for cover/memory fields, on-demand camera-only permission, denied/permanent/cancel/failure recovery and shared local preparation/Not saved/replacement flow. Existing explicit upload-on-save and metadata/conflict safeguards preserved; no dependency or GPS/Travel/backend change.
- [x] Explained and resolved existing native camera block: Image Picker cameraPermission now has a purpose description; microphone remains false. Read-only config introspection verifies camera is no longer removed and microphone remains blocked. Installed Image Picker57.0.20 matches SDK range.
- [x] Focused90/90, full367/367, typecheck, full lint, git diff --check and explicit task-file whitespace checks passed. No real camera, build or live upload verification.
- [ ] Build/install a NEW development client, then complete camera/cover/memory/cancel/denial/gallery/replacement/save-reopen/no-premature-upload/metadata Android checks in PROJECT_STATUS.md. A JS reload alone cannot enable native camera permission. Retain current live Storage-policy verification limitations.

## Create Journey M1: one-time memory location - 2026-10-14
- [x] Add/Edit Memory current-location action, foreground-only one-shot Expo API,15-second application deadline, web-equivalent50m/freshness validation, clear retry/search messages and reviewed buffered coordinates. Existing explicit Save memory retains all metadata/photos/version checks; no automatic save/upload or Travel Mode changes.
- [x] Duplicate capture/save guards and invalidation on close/blur/background/account-keyed unmount/editor disable/location replacement; independent of Mapbox search. Installed expo-location57.0.21 matches Expo's bundled ~57.0.21 range; no dependencies/configuration changed.
- [x] Final focused83/83 and full360/360 tests passed; typecheck, full lint, git diff --check and explicit task-file whitespace checks passed. Mocks only; see PROJECT_STATUS.md.
- [ ] Physical Android GPS/permissions/services/accuracy/deadline/lifecycle and explicit save/reopen verification. No native build/device/live backend test performed. Native one-shot requests cannot be aborted; late callbacks are invalidated. Follow the exact checklist in PROJECT_STATUS.md before further location milestones.

## Create Journey photos - Milestone 4B2 follow-up implementation - 2026-10-14
- [x] Latest owner-approved scope implemented: upload cover AND memory candidates on explicit save only, using existing authenticated Storage, owner/private/version checks, immutable object names, raw media paths and full-snapshot save_journey. New memories/private journeys checkpoint before upload; selection stays local until Save.
- [x] Known upload/RPC failure recovery reuses exact confirmed upload paths; ambiguity/conflicts block blind writes. Duplicate/navigation guards, truthful Not saved/saving states, saved-reference removal without remote deletion, and owner-scoped signed-preview renewal added. No dependencies/backend/web/authentication changes.
- [x] Focused70/70 and full347/347 tests passed, plus typecheck, full lint and git diff --check. Android Metro bundle HTTP200; offline Expo dependency check passes with reliability warning. Mocks only, no live uploads, RPC writes or dashboard changes.
- [ ] VERIFY DEPLOYMENT + ANDROID END-TO-END: bucket/policy behavior, real uploads/full snapshots/privacy, checkpoints/reopen/restart, denied/uncertain outcomes, stale web/mobile versions and preview expiry. Exact checklist and limits in PROJECT_STATUS.md. Earlier deployed-policy access limitation remains unresolved; implementation is not proof of live persistence.
- [ ] Durable upload recovery and reference-aware remote cleanup remain out of scope. Existing client15-second timeout and lack of upload AbortSignal support can produce uncertain outcomes; never automatically retry or delete objects.

## Historical cover-only Milestone 4B2 preflight - 2026-10-14
This records the earlier stopped request; the latest follow-up above supersedes its implementation scope/status.
- [x] Read-only inspection of existing local photo flow, authenticated client, raw-path snapshot saving and repository storage/RPC migrations; existing work preserved. Baseline focused49/49, full326/326, typecheck, full lint and diff check passed; no upload integration tests or application changes. Connected dashboard redirects to sign-in.
- [ ] BLOCKED before implementation/upload: verify effective deployed private journey-media INSERT/SELECT policies, bucket limits/MIME settings, RLS/grants and save_journey ownership/media/version behavior through trusted read-only project inspection. Repository migration source and anonymous app credentials do not prove deployment.
- [ ] After verification only: authenticated immutable cover upload, raw-path snapshot save, preserved previous cover, signed display URL, ambiguity/conflict/navigation safeguards and focused integration tests. Memory-photo uploads remain outside4B2.
- [ ] Android persistent-cover QA deferred: no cover upload integration was implemented or exercised. See PROJECT_STATUS.md for the exact access limitation and required verification evidence.

## Create Journey native photos - Milestone 4B1 - 2026-10-14
- [x] Local-only cover and memory gallery selection, bounded binary validation, native resize/encoding, Not saved previews, replace/cancel/remove behavior, separate candidate state and preserved raw saved paths. No uploads/new Supabase writes, remote deletion or backend changes.
- [x] Approved SDK57 ImagePicker/ImageManipulator packages plus direct FileSystem dependency; gallery-only configuration blocks camera/audio and broad Android storage permissions. Config introspection and Android Metro bundle checks passed; existing application work preserved.
- [x] Focused49/49 and full326/326 tests passed; typecheck, full lint and git diff --check passed. Offline Expo dependency validation reports up to date with an offline-reliability warning.
- [ ] Build/install a NEW Android development client and complete physical QA in PROJECT_STATUS.md (picker/provider behavior, orientation/mirroring, transparency, size/memory limits, cancellation, existing photos, keyboard/back/navigation). No native build or physical-device validation was performed here.
- [ ] Photo upload/save integration, signed-URL refresh, durable recovery and remote cleanup remain unimplemented and require a later milestone after owner testing. No selected photo is persisted in4B1.

## Create Journey redesign - 2026-10-14
- [x] Milestones 1 and 2: private Quick Start, actual owner-draft hydration/continuation, raw metadata/version preservation and safe conflict recovery. Owner now reports physical Android testing; original handoff evidence remains in PROJECT_STATUS.md.
- [x] Milestone 3: compact memory hub, existing-photo thumbnails, conditional compact map, focused safe-area/keyboard-aware Add/Edit Memory sheet, place selection or named private unlocated memory, optional notes/day/rating, reorder and confirmed removal, full-snapshot saving, discard guards and existing publication-readiness validation. No uploads/autosave/offline/backend changes.
- [x] Focused creation tests 38/38 and full suite 315/315 passed; typecheck, full lint and git diff --check passed. Offline Expo dependency check reported up to date with an offline-reliability warning. Android Metro bundle HTTP200 contains the new memory flow; this is not native visual/device evidence. See PROJECT_STATUS.md for complete validation and limitations.
- [ ] Physical Android Milestone 3 QA: keyboard/small-screen/large-text/safe areas, Android back/discard, actual draft reload/save/conflict recovery and inherited-photo display permissions. Follow exact steps in PROJECT_STATUS.md; wait for owner results before further milestones.
- [ ] Later photo integration and durable unsaved/offline recovery remain separate, unimplemented scope requiring approval.

## Home header refinement — 2026-10-14
- [x] Diagnosed unchanged appearance: Search stayed44 dp in the prior update; no alternate Home header/override found. Now a32 dp painted Search surface sits inside a44 dp touch target, with52 dp minimum header and2 dp gaps. Correct Expo Android bundle HTTP200 confirms new source is served; owner confirms previous prompt reached phone. 20 focused tests and294/294 full tests passed; typecheck, full lint and diff check passed. See PROJECT_STATUS.md.
- [ ] Full Android reload/visual confirmation of new surface geometry and accessibility sizes; no native rebuild required. Server bundle evidence does not establish newest phone bundle/rendering.
- [x] Compact travel-focused header: 34 dp supplied logo, 44 dp flexible search with Destinations & journeys, 22 dp bell/profile visuals with 44 dp controls, restrained translucent dark styling. 20 focused tests and 294/294 full-suite tests passed; typecheck, full lint and diff check passed. See PROJECT_STATUS.md.
- [ ] Physical Android appearance/accessibility checks at narrow widths and larger text; Search/Account/placeholder and Home regression observations.

## Home UI polish — 2026-10-13
- [x] Screenshot-driven follow-up: smaller warm-white shared navigation on standard browsing routes, reserved content space, and Story three-dot popup for existing Use/Remix/About actions. Travel/auth/private drafts excluded. 294/294 tests, typecheck, full lint and diff check passed; see PROJECT_STATUS.md.
- [ ] Android visual/runtime checks for compact white pill across routes, creation keyboard/save controls, Story popup/back handling and Remix sign-in return. Preserve existing Story/map/Travel behavior.
- [x] Milestone 2: floating dark translucent three-destination navigation, blue Explore highlight, measured safe-area clearance and expanded content scrolling behind the pill. 292/292 tests, typecheck, full lint and diff check passed; see PROJECT_STATUS.md.
- [ ] Milestone 2 Android appearance/gesture/accessibility verification: translucency over globe and sheet, all snap states, last-card actions, larger text, bottom insets and route return.
- [x] Replaced the temporary header JPG with the owner's corrected PNG; code/test references now use assets/journey-creator-logo.png. Layout unchanged.
- [x] Supplied-logo follow-up: actual attached JPG bundled at top-left of Home, contain sizing, flexible Search and existing bell/Account controls in one safe-area row; 18 focused regressions, typecheck, full lint and diff check passed. Physical Android appearance remains pending.
- [x] Milestone 1: search-first Home header, inactive notification bell, existing Account navigation, and full-frame Home cover photos over a blurred same-image backdrop without increasing card size. Focused component regressions added; 291/291 tests, typecheck, lint and diff check passed.
- [ ] Physical Android visual/accessibility checks for the new header and portrait/landscape covers, plus globe/sheet/Locate/Story/bottom-navigation regression. See PROJECT_STATUS.md. Journey Story cover redesign remains separate future work; bottom navigation is implemented in Milestone 2 above.

## Completed foundation
- [x] Physical Android QA preparation: current working tree preserved; development-client command and local environment-variable names verified without exposing values. Fresh automated baseline: 287 tests, typecheck, full lint and diff check passed. The seven prioritized device cases and per-case Actual/Failure fields are in PROJECT_STATUS.md. This completes preparation only, not device validation.
- [x] Travel Mode automated reliability/integration audit: fixed future GPS acceptance, rejected-watch callbacks, stale manual confirmations, delayed initial-route acceptance, precise-marker eligibility, preview-camera blur cleanup and dynamic Reduce Motion. Regression coverage preserves failed-reroute instruction progress, arrival/manual completion, timer and lifecycle behavior. See PROJECT_STATUS.md for final checks and network-limited Expo Doctor evidence; physical Android validation remains pending.
- [x] Turn-by-turn driving panel and conservative ordered instruction progress on the existing Directions request. Missing steps/poor matching remain honest; arrival/completion stays manual. Verified: 249 tests, typecheck, full lint and diff check passed. Real-device guidance validation remains pending.
- [x] Travel map My Location/recenter and foreground GPS following with manual exploration, navigation zoom and lifecycle cleanup. Verified: 236 tests, typecheck, full lint and diff check passed. Physical Android camera/gesture/placement checks remain pending.
- [x] Expo/React Native + Router foundation and existing Supabase integration.
- [x] Home globe/Discovery, Journey Story and native planned-stop maps implemented.
- [x] Auth/Account, profiles/social, Create and Remix implemented; full end-to-end review remains pending.
- [x] In-memory Travel Mode states/timer and foreground GPS implemented.
- [x] Pause/Resume successfully tested on the physical Android phone (owner confirmation). Prior automated baseline: 198 tests, typecheck and lint passed; not a claim of full device QA.

## Next priorities, in order
1. [x] Read-only inspection of existing web Travel Mode in D:\Travel_Mvp: source thresholds, Directions, arrival/progression, rerouting and lifecycle reviewed; web unchanged.
2. [x] Mobile Navigation Milestone 1: driving route calculation to the first stop, dedicated blue geometry, compact distance/duration status, strict GPS eligibility and lifecycle cancellation implemented. Owner confirms blue road-route rendering on physical Android. Use now opens the existing immersive Travel road map directly; cinematic map browsing remains a separate Story entry point. The initially collapsed sheet has destination/route summary, expandable details and fixed session controls. Opening prepares permission without starting tracking/timing; Begin Trip stays explicit and denied permission needs user-directed recovery. Automated baseline: 221 tests, typecheck and lint passed. Immersive layout/permission/Streets device regression remains pending. Turn-by-turn instructions are covered by the subsequent guidance milestone.
3. [x] Milestone 2: ordered manual stop completion, confirmed current-stop action, progress styling, next-destination routing and distinct completed/early-finished states. Progress stays in process memory. Verified: 228 tests, typecheck, full lint and diff check passed; physical Android validation pending.
4. [x] Automatic stop-arrival detection with accuracy-aware proximity, distinct timed readings and an explicit confirm/dismiss prompt. Confirmation reuses ordered manual completion; GPS alone never completes stops. Verified: 263 tests, typecheck, full lint and diff check passed. Physical Android arrival reliability/threshold tuning remains pending.
5. [x] Off-route detection and guarded rerouting implemented against the blue driving geometry. Accuracy-adjusted 40 m margin, at least three readings over eight seconds, 30-second cooldown, existing Directions request, lifecycle/session cancellation and instruction reset. Errors require explicit Retry and label/expire old reference routes; arrival/manual completion remain independent. Automated results are in PROJECT_STATUS.md; real-device reliability and threshold tuning remain pending.
6. [ ] Physical Android testing and regression checks: new guidance/progression/rerouting plus Home globe/Locate/sheet, Story/maps, permissions, GPS loss/retry, Pause/Resume/Finish, navigation and foreground/background lifecycle. Reconfirm existing behavior after changes; resolve Expo patch mismatches only with approved dependency work.
7. [ ] Profile, authentication and journey-creation review, followed by end-to-end QA: session restoration/expiry, sign-in/registration/sign-out, public/private gating, likes/saves/share, Remix, draft save/publication and uncertain-write recovery. Use authorized test data; do not create production records without approval.

## Pending/unverified boundaries
Current physical run: **not completed**. Owner reports the native Mapbox Android development client is installed; exact phone model/Android version/build and observations are pending. H1 (Home), S1 (Story/Use), T1 (GPS/camera), T2 (guidance), T3 (arrival/progression), T4 (rerouting), T5 (lifecycle/accessibility) are all unverified for this run. Wait for the owner's results before changing application code. No source defect was reported or fixed during preparation; earlier owner confirmations do not mark these current-run items passed.

The owner confirms the immersive Use-to-Travel flow and Streets map on Android. The compact bottom-panel refinement still needs device visual validation; permission recovery, larger text and broader lifecycle regression remain pending.

Automatic arrival detection only offers a suggestion; automatic stop completion, voice guidance, verified visits, persisted travel history and background GPS are not implemented. Route geometry is replaced only after sustained deviation or explicit error retry; instruction progress updates locally from eligible GPS. Arrival, guidance and rerouting reliability still need real-device validation. Polyline distance cannot distinguish close parallel roads, wrong-way movement on the route or sustained GPS bias. Photos/full editing of saved journeys, offline travel and notifications are outside the current implemented foundation. Physical iOS and comprehensive native/backend QA are not established by the prior Android Pause/Resume result or mocked tests.
