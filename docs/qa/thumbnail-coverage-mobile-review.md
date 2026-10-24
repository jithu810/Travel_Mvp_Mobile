# Independent backend review: thumbnail consumer coverage

Reviewer: Mobile Developer. Backend authored the reviewed helper changes. This independent review excludes my UI/shared hook/consumer tests and is separate from Backend's review of them.
Timestamp: 2026-10-24T10:33:55.537324+05:30
State: local/unpublished; no live Storage, auth, database, environment, backfill or device mutations performed for this review.

## Result

No remaining actionable findings in this bounded backend helper review. Architect independently identified a duplicate-coordinate original/thumbnail pairing issue; the final mapper now selects both from the same stop. Independent regressions below passed after that fix.

- Public photo resolution adds optional cover/stop companion URLs only under the existing exact-true flag and canonical full-v1 path guard. Full .cover and .photo values remain the original resolution; larger story/share consumers can retain them.
- Original and companion signing use the isolated anonymous public client and existing bounded request/signature cache. Partial companion failure keeps the original; cancellation rejects a stale result. Fresh detail visibility continues to bypass the public collection cache.
- Editor previews retain the existing original-path record keys and add separately derived companion-path keys. They verify authenticated owner identity before/after signing, remember any intervening account change, reject cancelled/changed-owner results and unsubscribe in finally. No token or signed URL is persisted in forms or documentation.
- Discovery coordinate coalescing preserves creator order and chooses the original/thumbnail pair together from one eligible stop; an earlier thumbnail-only stop cannot be paired with a later stop's unrelated original. URLs still pass HTTPS/safe-photo and coordinate validation.
- No schema/API/Storage policy/upload or migration changes are introduced by this coverage extension.

## Independent verification

`node --test tests/image-loading-cache.test.mjs tests/photo-persistence.test.mjs tests/discovery-globe.test.mjs`: **45/45 passed** (9 cache, 20 photo persistence, 16 globe/mapping tests). Includes flag-off/legacy guards, marked stop companion signing, partial failure, identity/abort protection, unchanged original fields and duplicate-coordinate pair regressions.

Applied the installed Supabase skill for read-only helper review. The changelog Markdown endpoint was unavailable through the web reader (unsupported text/markdown); reviewed the [HTML changelog](https://supabase.com/changelog) and current [createSignedUrls reference](https://supabase.com/docs/reference/javascript/storage-from-createsignedurls) instead. No implementation API migration was needed for the existing paths/expiry call.

## Limits

Mocked signing/auth/collections prove client contracts, not new native Mapbox rendering or actual network traffic. No new live thumbnail upload, public thumbnail fetch or private-owner production query was executed in this review. Prior activation evidence belongs to the separate activation report. Existing signed URLs remain temporary bearer grants until expiry; this extension does not alter revocation behavior.

## Reviewed SHA256

- `src/lib/discovery/queries.ts`: `41d7a094036c5212980a69531150095713db2f877b91d5fbc44f381c4c286a72`
- `src/lib/discovery/map.ts`: `ba8de3492285059617442a9c081a98e7918c66fdd233661ba66d1bc824528c97`
- `src/lib/create/queries.ts`: `61eaaadc3553965594d9f0d0a516c7f4d9129611d5bfdec7411ebb8cec9e0460`
- `src/types/journey.ts`: `a113addd415df65897b1f6d928bc37f7c72d140ab1459ffe2a22a2c04d020adf`
- `src/lib/media/image-variants.ts`: `ece7e677fb68f0584d094f5e3a35e9fd8eba76d7d30ba06e624530198f8d0516`
- `tests/image-loading-cache.test.mjs`: `9b1645ecb35b5fb24926cef89255e4eeca79846499149fe0392e48ff2704e1d3`
- `tests/photo-persistence.test.mjs`: `c665ed89e41a1b50c8f19fe7c635fe4e3355c2f35166c04a871d6f4ae568718a`
- `tests/discovery-globe.test.mjs`: `f5aba59ede3391ffa8ab9b44400838728cea51b37b0df9b8b063689c49376bee`
