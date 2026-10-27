# Buddy stack publication review

Independent publication review, 2026-10-27. User authorized push to GitHub for accepted Buddy work. Parent Architect owns commits, one branch push and one PR; no merge or production deployment authorized. Reviewer made no application/Git changes.

## Scope and decision

Reviewed complete Mobile dirty Buddy stack over base `955ecac21ae554ae428c9efb36d2f8ab6406e935`, now on `codex/walking-buddy-home-story`: confirmed-save Jump, accepted Begin/Resume Run, map image/ownership/help/live-companion infrastructure, Home Locate walking sprite and selected-card Story walking with compact/expanded sizing. Existing unpublished supporting prototype modules/tests and historical preflight/QA evidence belong to this stack. No unrelated Mobile tracked/untracked changes identified in the inspected inventory. Web repository and its three existing metadata directories are outside this publication.

**No actionable application/security/correctness findings remain.** Earlier Story ancestor suppression/unknown Reduce Motion integration issues were corrected and independently reverified. Two broad-suite mock import gaps in create-flow and thumbnail-consumers were corrected by Mobile without application changes and reverified. Parent must stage only the explicit inventory below plus this report; ignored historical snapshots, dependencies, generated files and all environment files are excluded.

## Full verification

**770 unique repository checks passed**: final current repository test-file list excluding thumbnail-policy passes769/769; separate thumbnail-policy passes1/1. No QA-only duplicate files counted. NonPG log `.local-tests/story-walking-buddy-qa/publication-final-nonpg.log`. The policy test was rerun outside the sandbox after pg_ctl restricted-token error87: source verifies a newly created disposable data directory, random localhost port, synthetic auth/storage records and shutdown; no live Supabase target or credentials involved.

Initial full snapshot run passed774/781 executions, with eleven duplicated snapshot tests. Seven failures were three omitted offline-backfill script fixtures, missing app.json, two new-import mock gaps and the sandbox PG startup. Added only required snapshot app.json, offline script and review SQL; fixture retry38/38 and final full run resolve these. No live backend writes or environment-file reads occurred. Existing dependency installation was reused through a node_modules junction; no packages installed or upgraded.

Independent complete-snapshot TypeScript (`tsc --noEmit`) and current-source/test ESLint (`eslint src tests --max-warnings=0`) both pass with zero diagnostics. Used copied repository tsconfig.json/eslint.config.js and existing dependencies, excluding the repository's unrelated historical ignored snapshot lint scope. Final source is ready for the authorized branch publication; no remaining publication blocker identified by this review.

## Independent review findings and limits

Inspected all changed tracked application diffs and untracked source modules/assets/tests, including prior local celebration and map infrastructure. Confirmed success events arise only from confirmed save or accepted session transitions; WeakSet operation dedupe, expiry, screen/foreground/reduced-motion/input/guidance guards and once-only claims are retained. Jump/Run keep original sheet geometry and bounded timing. Map ownership is route-scoped and independently released; decoded image plus positive layout readiness and failure/retry guards prevent claiming absent artwork. Help callbacks recheck request identity, current action owner, route, preference, foreground and suppression before invoking existing flows.

Live companion remains decoration at accepted GPS coordinates with screen offset/collision projection; the authoritative dot/heading and routing/arrival logic remain intact. No new location observer, backend request, storage upload, persisted preference or tracking write was added. Home retains route/camera gates and falls back to plane when disabled/failed. Story's shared controller handles rapid reversal/coincident/missing/date-line paths, pauses through map replacement, preserves partial position while motion preference is unresolved, and uses narrowly opted-out StorySheet suppression only for its map; other dialogs retain default suppression. Existing inactive Story comparison modules remain supporting prototype code, not visible controls on accepted Story flow.

Independent review was performed sequentially by the QA/preflight specialist, who did not author app code. Native reports remain those in the dedicated Home/Story QA records and Architect handoff; automated tests do not establish GPS/battery/accessibility or sustained native performance. Publication is not a claim of completed broad outdoor field validation.

## Reproducible reviewed source snapshot

Forty changed src/assets/tests files, sorted by relative path, hash **758cbec006bdb8e0bdf3d892668894f2897c489472bea5e6d44bc9e398885791**. Algorithm: SHA256 concatenating each path + NUL + raw bytes + NUL. Exact per-file inventory follows. Documentation/status records below are in-scope but intentionally excluded from the source hash so the final publication record can be appended without changing the reviewed source identity.

| Source path | SHA256 |
| --- | --- |
| assets/journey-buddy/jump.png | 8f6d8a469ae8f3fc78611ebd3c8b406f41307da9ad4d44a5981cb815894243ec |
| assets/journey-buddy/README.md | 65a5fab3fcc25201ed72cbebd67dced35badf4675b79a6a201a8eced285560b6 |
| assets/journey-buddy/run.png | 0019e1a17097d4284eb86906f6fd545eb2bb16d829f1272662be5cfb0e13e615 |
| src/app/create.tsx | 4948d654f081153ddf38c4ba16a6ee5dfef6b1fff31ce3243fae07fc909286ef |
| src/app/journey/[id].tsx | 45b31ee799c63954b0f86132cfc56c89deae4ea38b5058c85936c2690333a49c |
| src/app/travel/[id].tsx | 4f5182b19d4b49d40ec5015173602c3bee4739d59ae16847ccf5a57181c1acc3 |
| src/components/buddy/buddy-sprite.tsx | 8765acbfbdeb712cfdc9fb19a4ec5d626d738e6931cd2778aabb45579b4e38da |
| src/components/buddy/journey-buddy-host.tsx | 6caa5f52ab622e76a936ff212b427d22b293facc4d8c1da28b0a10206d6c736b |
| src/components/buddy/map-buddy-help.tsx | 3ef2d9e61b9815916b5c59f705c6c8f3e2e9b4600fb2ab76ae6c9af17022c238 |
| src/components/discovery/globe/journey-overlays.tsx | ab518020fc6aefb21f53542a6229cd2a48d93f35cb188b6b9e431812b1f28e1c |
| src/components/discovery/globe/native-globe.tsx | dd07696f098c9e652e50c9226ea14a5faf7cae45372b5e85d275e26550077edc |
| src/components/discovery/globe/traveling-buddy.tsx | 96d74ee54a95ed023c83d7cc451c6e49bce04fbd538ba234081395a222867007 |
| src/components/journey/journey-preview-controls.tsx | 98945ca748b45e411427979d8fe04124611fbb1ece7efa902245820c87d2c8cc |
| src/components/journey/map/journey-map.native.tsx | 77396dc7d3e41012748d92da8272df2ff701915b856d8565cbd69fedb94b4bb3 |
| src/components/journey/map/map-frame.tsx | 264978af209c4ea069c5a2c9d69718b013c99781da52cabc8764b800f189389f |
| src/components/journey/map/native-map.tsx | 3446edcac2583412d6d6e58b5de805d8fa354270d834ab286ae992df5b75c1b1 |
| src/components/journey/map/story-preview-marker.tsx | 9724bbc66602d70c53dc0d9c5a4ceabfcc9174d34c96a63e432559419dc9b392 |
| src/components/journey/map/story-walking-buddy.tsx | 372e07e16ffec4ac7038c8c7e6156cf0503f9f7bfc9dd79f50888bdf5373ae93 |
| src/components/journey/story-sheet.tsx | f6b35a02096b5198c32c75fc6c85e9932f0a97e8f8bb5747cac1886813e0ec1a |
| src/hooks/use-buddy-map-image.ts | b39259f543608f74146e9152044be1f4fa085affc554cc53f035b6b0333cf36a |
| src/hooks/use-journey-buddy.tsx | cbe52a52a3dc690814c6c258c7d51b42069002343f5265fd9eab802faf1d77b8 |
| src/hooks/use-live-buddy-safety.ts | 0b62681a860780dc9d9b26d209598890d71e7133fe6c96939159302bfda3aa5d |
| src/hooks/use-map-buddy.ts | 32a82a37d20ffb811d6ec952e68927923811a476760f5ccf2b0793c81b434836 |
| src/hooks/use-trip-location.ts | b3bf8357e2357a725a48c4f8fe8f14c17335ddd776820d6303b99a77b14cc1b8 |
| src/lib/buddy/animations.ts | 39d83181aeecc6f0e9647c068a3e5bbb8edc38a05f239109b9994a4e6204fa33 |
| src/lib/buddy/map-image.ts | e61067abed02c577efedfbfecf243c524ccee91a0ded255aaaf0c3bdb428873e |
| src/lib/buddy/map-presentation.ts | 04f2095d07a8b5268ce5629a548da6674f2b2595c446ba2f41b60376d369efbb |
| src/lib/buddy/model.ts | 57af918c90dbe075325013679f6ea6698db3ee0148fc1757a58131594047aeee |
| src/lib/buddy/store.ts | b39d59b85e477f5103c40165544851d2823921203e29701a54a8306ea3df978e |
| src/lib/journey/preview-playback.ts | e8de16913f6bb7ad83a032e96fff0270e24f6e33542187e834da76d22d8ac9a7 |
| src/lib/journey/story-buddy-playback.ts | 3e7255fa2d455234e7e1bcdf50e75cc69782a379c5b749bdea566d9955acb239 |
| tests/buddy-map.test.mjs | 638a838ea52eb8ad4446821aca10fda0bee9f1008171c6c6df34b9494f5a0892 |
| tests/create-flow.test.mjs | f70f29e4e67b324eb1874204766d75f2923f6ec8207f6cbe162f30cdcc40c74f |
| tests/home-walking-buddy.test.mjs | 96398b48a766644a6ef549e52dc6d71440f25eaff7c52cbc1c3b179b4e8beac1 |
| tests/journey-buddy.test.mjs | 56af100c6eab350bcc9b24ed108b8f462acaeff88def3d13a16960ec15b0e3c7 |
| tests/map-navigation-marker.test.mjs | be82d86fd35e44512a10924c85937a392528e9cd5f9125c1526afdfbd681b071 |
| tests/navigation.test.mjs | 8f10e6ccde1b61fde70aa3f08314b6e7bbbfc8a9f7a184b9a5d6e00520f5be2c |
| tests/story-interaction.test.mjs | d054869cdd94f1cda3606af5ade617fb5b1cc6a148a0f32546df4ed1922d0413 |
| tests/story-walking-buddy.test.mjs | 6db8c3d8d7a3f38b95ffcc7d3207a098729921064e61dd964fdae07bfbb4f4a6 |
| tests/thumbnail-consumers.test.mjs | 0d9f89004db2a7af9a0a5455b0cf851818c0b28c69acf220b9f0aeaf0bd3c16d |

In-scope documentation/status paths:

- docs/buddy-on-map-feasibility.md
- docs/qa/buddy-jump-run-columns-evidence.json
- docs/qa/buddy-jump-run-preflight.md
- docs/qa/buddy-jump-run-qa.md
- docs/qa/buddy-jump-run-schema-evidence.json
- docs/qa/buddy-on-map-preflight.md
- docs/qa/buddy-on-map-qa.md
- docs/qa/buddy-on-map-schema-evidence.json
- docs/qa/home-walking-buddy-preflight.md
- docs/qa/home-walking-buddy-qa.md
- docs/qa/story-walking-buddy-preflight.md
- docs/qa/story-walking-buddy-qa.md
- PROJECT_STATUS.md
- ROADMAP.md
