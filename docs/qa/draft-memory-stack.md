# Private draft actual memory stack — 2026-10-24

Local/unpublished corrective follow-up. Base main `c668bb2e70c46e85c48c6dfeb4bad448579df2b7` plus all previous dirty work preserved. Existing released [draft backend preflight](draft-editor-redesign-preflight.md) still covers the exact scope: only local memory browsing presentation changes; save/upload/query/schema/auth/RLS/Storage contracts untouched. No additional backend access/change required.

## Correction

The previous private editor used a paged FlatList with a plain decorative rear shape. It now follows the published StopCardDeck interaction: actual next one/two memory photo cards overlap behind the selected card, ±2° tilt and8/16dp inset. Rear renderings retain existing ThumbnailPhoto -> original -> bundled fallback/local-preview behavior; clipped photo-only wrappers are noninteractive and fully hidden from accessibility. No invented rear card appears after the last memory.

Foreground entire card translates/rotates and exits for210ms before selecting the adjacent memory, using native driver. Swipe requires18dp acquisition and50dp completion with1.5x horizontal dominance. Left goes next/right previous; header arrows share the same bounded path. Reduced motion changes selection immediately. Single-flight generation guards cancel stale completions on map selection, reorder/data replacement, modal/blur inactive state, background, resize, motion-setting changes, termination and unmount.

Only photo/caption carries the swipe responder. Edit, Earlier/Later reorder and Remove callbacks retain private semantics; reorder/remove tools are outside that surface, and canInteract rejects stale interactions during exit. Four side actions stay anchored outside the moving card and responder. Browsing changes selected ID only and never mutates order, photo paths or saved data. Deck-only selected border matches published white; nondeck border behavior preserved. create.tsx changes only the renderMemory handler/guard wiring.

## Verification

- Targeted actual private/public deck + editor integration63/63 passed,0 skips (`dist/draft-editor-redesign/stack-targeted-results.txt`). New tests assert real rear photo identity, hidden accessibility/noninteraction, exact210ms native-driver exit direction, threshold/dominance/bounds, reduced motion, repeat suppression, replacement/reorder/modal/background/termination/unmount cancellation, controls outside swipe and zero/single-memory states. Existing editor save/reorder/remove/photo contracts pass with mocks; no hosted tests performed.
- Final TypeScript, full zero-warning lint and whitespace checks passed. Android export succeeded4.5MB; export preceded only a lint-only render-expression extraction, reverified by63 affected tests. Offline Expo check reports packages up to date with tool's offline reliability caveat. No native rebuild/dependencies/environment changes.
- Earlier full636/636 belongs to preceding editor redesign; this corrective step uses focused affected regressions, not a new full-suite claim.
- Native screenshot/swipe evidence and independent review appended by Architect. Physical iOS/TalkBack/large-font acceptance pending. No hosted save/publish/gallery/camera/reorder/remove action is authorized for native QA.

## Changed paths and frozen source/test snapshot

Application: private memory-deck.tsx, memory-row.tsx; one minimal renderMemory wiring in create.tsx. Test: draft-memory-deck.test.mjs. Documentation: PROJECT_STATUS.md, ROADMAP.md, this report. All earlier pending changes preserved; no .env files read.

```text
d77dc73771f54caa3889005be721e86ec29b7a41b8ca143a9f6a079e1d5ba6e5  src/components/create/memory-deck.tsx
ace128e70410983340e389d19edece673dcfec8d6dcdc6d08e89afeaf2f9bc82  src/components/create/memory-row.tsx
f3ca28d95b09c86a395c75af2ac4e9455fce6e8bff712ccd9a1a09bb77dc5c58  src/app/create.tsx
de021a4845c14646a33ab38dc74786965f25b42f8208f118a75ac7835bea0c90  tests/draft-memory-deck.test.mjs
```

No commits/pushes/merges/deployments/backend or hosted writes. Local work remains unpublished.

Architect final integration: Android CPH2813/16 native dist/draft-memory-stack/final.png confirms real photo behind active memory1of2; left swipe reaches memory2Beach/mapselected2 (next.png), right swipe restores1 and real rearphoto (back.png). Browsing only; no agent reorder/remove/save/publish/upload. Exact in-motion rotation/video capture not claimed; executed component tests cover animation and cancellation. Independent review no actionable findings,59/59 tests plus final5/5 deck recheck; see draft-memory-stack-review.md. Final writer63/63 affected tests, TypeScript/full lint/whitespace/offline compatibility and4.5MBAndroidexport passed. No broad suite rerun needed for scoped correction beyond affected tests. Local/unpublished; iOS/TalkBack/native reduced-motion/large-font checks pending.
