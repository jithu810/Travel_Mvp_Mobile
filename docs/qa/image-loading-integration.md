# Image loading optimization — Architect integration record

2026-10-24 Asia/Kolkata. Mobile main baseline c878bd303c4687d0185b9cdd36c89268c4ceb51d plus preserved Search grid/Saved/shared-input dirty work. All changes local/unpublished; no Web edits, dependencies, native config/build, live database/Storage writes or backfill execution.

## Implemented

- Home/Search reuse anonymous public collection metadata45seconds; signing URLs reuse55minutes with bounded512-entry memory cache,32-object signing batches and2active workers. Independent subscriber cancellation, last-subscriber abort, failures not cached, explicit manual refresh invalidates. Detail membership remains fresh; Saved membership is not globally cached.
- Hidden Home list receives zero data/empty/footer; active compact/expanded initial rows2/3. Search initial4rows (12tiles), batch2rows (6tiles), window3viewports. Public focus/foreground refresh consults caches and renews stale source metadata without unconditional invalidation. Existing gestures/pagination/query isolation retained.
- Future stored-thumbnail flow implemented behind EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED, default OFF. Existing installed native modules generate separate JPEG max512px/quality70/no upscale/<=1MiB, original unchanged. Versioned full/thumbnail immutable filenames, paired upload confirmations before persisted reference, unknown outcomes locked, original/thumbnail URI validation and generated-only cleanup. Home/grid prefer authorized thumbnail then original then existing default; Story retains full image.
- Live Free plan cannot use server transformations. Additive narrow SELECT policy prepared in docs/backend/image-thumbnails.review.sql, not installed. Approval must identify target/action before live activation. No INSERT/UPDATE/DELETE grants or bucket visibility changes.
- Offline Python/Pillow backfill preparer creates local originals/512JPEG/hash/dimension/byte-count/reference-transition review plans. It refuses source traversal, duplicates/destination collisions, encoding mismatch and existing output directories; never networks/uploads/changes rows. Legacy activation requires a separately approved reference transition; no live executor supplied. No production manifest/photo download performed.

## Independent review and verification

- Mobile reviewed Backend cache and Architect backfill; two findings fixed and retested: hung signing worker starvation and duplicate thumbnail destinations across two legacy formats. Final12/12 independent cache/backfill checks passed; see image-loading-frontend-review.md.
- Backend independently reviewed Mobile frontend/native generator94/94 checks, no actionable findings; see image-loading-backend-review.md. Backend-authored upload/cache/policy excluded from that independent claim.
- Architect independently reviewed Backend cache/upload/path/flag/Storage policy and ran30/30 cache/path/photo persistence checks. Reviewed pair-confirmation boundary, no blind unknown write retry, <=1MiB derivative guard/source alias protection, default-disabled compatibility, exact linked-original authorization and no new write grants; no remaining actionable findings.
- Isolated real PG17 synthetic role/path/visibility/rollback test passed. Fresh Mobile-owned loopback clusters only; stopped after tests. Standard sandbox full test had one restricted-token87 PG process failure, then escalated full609/609 passed with0skips, including isolated PG. No production database test writes.
- Writer final TypeScript passed; final lint/export results appended below when complete. Root backfill4/4 passed after destination collision fix. No new dependencies; existing Expo compatibility result retained because dependencies/config unchanged.

## Evidence and limits

Deterministic counters show concurrent/repeated public callers issue one RPC and one signing per path within cache lifetime; explicit refresh issues fresh requests. These are executable local tests, not measured native network bytes or device memory savings. Original cold-download bytes are unchanged while thumbnails are disabled. Native HTTP caching remains existing React Native Image behavior using reused URLs; no custom disk-cache or expo-image installation.

CPH2813 Android16 existing client on Metro8081: dist/images-grid.png confirms compact header and3-column grid render (several remote photos used fallback), and dist/images-saved.png actually captures Home after navigation/reload; it is Home rendering evidence, NOT Saved-filter acceptance. Concurrent reload/navigation state limited this physical session, so do not claim cold/warm request counts, all remote photos loaded, or Saved filter verified anew. No save/like/copy/upload/Travel action exercised. Thumbnail flag remains OFF, so actual native paired upload/disk byte savings are unverified. Physical iOS/TalkBack/large-text/decode-memory/slow-network tests and production thumbnail acceptance remain pending. Prior status-icon transition caveat persists.

## Architect reviewed backend snapshot SHA256
- D:\Travel_Mvp_Mobile\src\lib\create\photo-save.ts: 0CAD4CE7F3A70760E3417BA3987BA52CCDE12B435FE3B1EF55E16E33C49A05EB
- D:\Travel_Mvp_Mobile\src\lib\create\photo-queries.ts: D17FC851EF8491FD3EB09129E42AAAA6D81251436687B6640A502D9FEF8D8F43
- D:\Travel_Mvp_Mobile\src\lib\discovery\queries.ts: 280743135986CAFF979A66048BD21DAD2F900094E52F05A5C2778FB34C1843F6
- D:\Travel_Mvp_Mobile\src\lib\discovery\request-cache.ts: A16B873B036CC5A370C458649BEAEB5A5EAA25FCC631EEDE7F38045D7D15C98E
- D:\Travel_Mvp_Mobile\src\lib\media\image-variants.ts: ECE7E677FB68F0584D094F5E3A35E9FD8EBA76D7D30BA06E624530198F8D0516
- D:\Travel_Mvp_Mobile\src\types\journey.ts: C3A41044412010DA402CF5EFA7918E2EB77401B0EEFB4B74E1B1A6F468E87AF5
- D:\Travel_Mvp_Mobile\src\app\create.tsx: 742D6FCB6BE719D66AB4828D0B70E1B2F358149EF69243261DB4ECD18869E215
- D:\Travel_Mvp_Mobile\docs\backend\image-thumbnails.review.sql: 823C43BE7241B364ACD5B640A80179EB65AC53F389809906C59FBC88985F7C24
- D:\Travel_Mvp_Mobile\tests\photo-persistence.test.mjs: C665ED89E41A1B50C8F19FE7C635FE4E3355C2F35166C04A871D6F4AE568718A
- D:\Travel_Mvp_Mobile\tests\image-loading-cache.test.mjs: E65CB28BAF12640FFF72E1D1662A3A47A73E98BA8077FBBBD8238E9C65B06A45
- D:\Travel_Mvp_Mobile\tests\image-variants.test.mjs: C5742314D8E7D8E88D0E07ACF2B7C969FB2F0DDBBC4F1A9BD8A29C71D7390F32
- D:\Travel_Mvp_Mobile\tests\thumbnail-policy.test.mjs: 5A73CAA096BED32C3C3158FB7724FF0D625065EA719C5589030E29C9B27F6046

Final integration: full609/609 tests0skips, TypeScript, full zero-warning lint, whitespace and Android export1627modules4.4MB passed. No application sources changed after checks. Root documentation/ignore-only changes document the disabled flag and exclude local private test/cache artifacts.
