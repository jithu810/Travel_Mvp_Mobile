# Draft editor redesign — independent QA and code review

Backend Developer acting as independently assigned QA/Code Reviewer; 2026-10-24 IST. **No actionable findings in reviewed snapshot.** Local/unpublished; reviewer changed this report only. Prior preflight in `draft-editor-redesign-preflight.md` was completed and released by Architect before implementation.

## Review and safeguards

Reviewed Create route, new MemoryDeck/EditorActionIcon, MemoryRow deck presentation, generalized SwipeAction and focused tests against base `c668bb2e70c46e85c48c6dfeb4bad448579df2b7`, preserving earlier dirty journey/navigation work. No changes in src/lib, src/hooks, app.json or dependencies from this feature.

- Map-first private editor keeps curved inset-aware map/legal controls and explicit empty-map state. Memories follow directly; cover is popup-only through rail icon. Rail exposes cover/Add memory/Save Draft/Settings with accessible labels and >=44dp targets. Existing settings fields and save behavior remain intact. Footer publish is outside content scroll.
- Browsing changes selected memory only. External/map selection scrolls the measured-width deck; delayed drag settle is invalidated on replacement/inactivity/background/unmount, reduced-motion preference is observed, and previous/next remain bounded. Earlier/Later remain separate form-array reorder actions; stable stop IDs, full metadata and raw photo paths survive. Existing save payload generates consecutive sequences.
- Saved-photo/thumbnail previews remain display-only. Unsaved local candidates use local originals; persisted canonical paths are not replaced by signed/thumbnail URLs. Cover gallery/camera/remove controls reuse existing local selection and upload-on-explicit-save pipeline. Popup close retains local selection; saved-reference removal remains deferred until save, with no object deletion.
- Publish callback is stable and delegates through a ref updated to current save/form. Explicit reset identity includes owner/form/local candidates/uncertainty; modal/focus/busy/photo/readiness conditions disable and cancel pending swipe. Completion is single-flight, not called during dragging, and still passes through existing validation/owner/version/photo save controllers. Certain failure reenables; unknown/conflict stays blocked. No new auto retry, background publish, false success claim or remote write API was introduced. Compatibility SwipeJourneyStart alias retains existing Travel defaults.
- Existing dirty/discard/reload/memory-remove alerts, current-account keyed editor lifetime, private hydration/version checks and uncertainty recovery remain. Shared swipe tests cover callback/reset-key changes, threshold/dominance, accessible duplicate activation, reduced motion and lifecycle cancellation. Editor tests cover modal/publish gating, latest state, duplicate writes and certain/uncertain failure handling using mocks only.

## Verification and evidence

Reviewer independently ran:

`node --test tests/draft-memory-deck.test.mjs tests/create-flow.test.mjs tests/swipe-journey-start.test.mjs`

**63/63 passed**, zero failures/skips. These execute real component/controller source through synthetic mocks; no hosted writes. Application-file `git diff --check` passed. Applied React hooks/rendering/accessibility checklist; no additional shared builds run.

Read actual `dist/draft-editor-redesign/full-test-results.txt`: **636/636 passed**, zero failures/skips (separate isolated PostgreSQL result belongs to Architect). Read actual Android export output: 4.5 MB Hermes bundle, export complete. Writer owns TypeScript/lint/Expo compatibility results; Architect aggregates final results and any later snapshot changes.

Inspected native `dist/draft-editor-redesign/final.png`: map/compact header/photo deck, four icon rail, Earlier/Later/Remove, readiness text, swipe footer and preserved bottom navigation fit the sampled device. `cover-popup.png` shows Journey cover modal with Gallery/Take photo and close, dimming editor. Fresh `settings-verified.png` confirms the actual Edit Journey popup: destination search/current destination, title, traveler choices, duration, optional description, Save Changes and private-save explanation, with close control. Architect reports closing X without editing/saving. Earlier `settings-popup.png` captured the plain editor and is not settings acceptance evidence. Reviewer did not control the device or invoke Save/Publish/upload.

Pending: physical TalkBack/reduced-motion, narrow-screen/large text/keyboard, iOS, 50-card native performance, actual camera/gallery denial/cancel/preparation, native deterministic reorder/remove and native save/publish acceptance. No new native permission/dependency/build or hosted writes authorized by review. A synthetic test pass is not live persistence verification. Owner interaction may change native fixture contents independently; screenshots do not certify fixture history.

## Snapshot hashes

SHA256 independently captured from current source/tests:

```text
1a118677e72998ce3fe438593db86c28108d5510b39dcb2115d864b00ab931e1 src/app/create.tsx
711d458ad2baca9dea8df193b91790af5eef326f1ba098b0a27dc40204b647d7 src/components/create/memory-row.tsx
dd1126cab516af3ea176ac159407b9bd02bb350c1661f0b5003284c7363d75be src/components/create/memory-deck.tsx
ef8f054cebf7101a900c54a0559590950aa934e7a3d334b0151350a6cb5b5db9 src/components/create/editor-action-icon.tsx
b401c82c302a71f4cbd8467501479e6e41ca82a25e57ca68e040630e84866174 src/components/journey/swipe-journey-start.tsx
3ca8252c4b85a702032d721a15d1e4a85b54e7d899492e7eb8ef587414b7569f tests/create-flow.test.mjs
f556fdd6dd6cd2f9fcca32f9a5aef4ad5c899b58342139e7cb5803e234f463df tests/draft-memory-deck.test.mjs
de920ae28dc943eed9cd39f50bb35b2c33a6cc5030ceabfc66d07f8628e4e9b5 tests/swipe-journey-start.test.mjs
```

No application edits by reviewer; no .env reads, live SQL/Storage changes, staging/commit/push/merge/deployment or cleanup. Protected Web integrity-hardening and accumulated Mobile work retained.
