# Independent cache and offline backfill review

Reviewer: Mobile specialist (did not author the reviewed cache/backfill files).
Reviewed local/unpublished snapshot; frontend and native thumbnail implementation are excluded from this independent review.
Timestamp: 2026-10-24T09:34:03.114221+05:30

## Findings and disposition

- P1 resolved: two hung signed-URL transports previously exhausted the worker pool indefinitely. Batch signing now races a 12-second deadline and releases worker slots; lingering underlying calls are capped at four. Regression proves a fresh request can proceed after two timed-out calls and late completions cannot replace fresh signatures. When four underlying transports remain hung, image reads fail closed to existing fallback until a transport settles; this intentionally bounds outstanding work.
- P2 resolved: distinct legacy .jpg/.png objects sharing one UUID mapped to the same thumbnail destination. Preflight now rejects duplicate full/thumbnail destinations before creating output; the regression verifies no output directory exists.
- No remaining actionable findings in this bounded review.

## Verification

- Independent `node --test tests/image-loading-cache.test.mjs tests/backfill-preparation.test.mjs`: 12/12 passed after fixes.
- Cache checks cover coalescing, TTL, bounded entries/pending work, failure exclusion, independent subscriber abort, last-subscriber upstream cancellation, invalidation generations, signed-URL reuse, bounded signing batches/concurrency, partial retry and fresh detail visibility.
- Offline backfill checks use synthetic photos with socket creation blocked, preserve original/source SHA256 and bytes, output bounded JPEG512 quality70, refuse overwrite, reject traversal/URL/malformed/duplicate/encoding mismatch input, reject cross-extension destination collisions and leave executionAuthorized=false.
- Read-only inspection confirms no network/client imports, no Storage writes, no row updates and no original deletions in the preparer. Immutable full-v1/thumb-512-v1 mappings are proposals requiring separately approved activation.

## Limits

- Tests use mocked RPC/signing and synthetic local images; no actual native cold/warm transfer-byte measurement, live policy application, uploads or backfill execution.
- Cache stores public anonymous results in process memory only; fresh detail visibility bypasses collection cache. Signed URLs remain bearer grants until expiry; TTL cache is not revocation.
- Incomplete local outputs may remain after a failed preparation; they are unapproved and cannot be overwritten on rerun.

## Reviewed SHA256

- `src/lib/discovery/queries.ts`: `280743135986caff979a66048bd21dad2f900094e52f05a5c2778fb34c1843f6`
- `src/lib/discovery/request-cache.ts`: `a16b873b036cc5a370c458649beaeb5a5eaa25fcc631eede7f38045d7d15c98e`
- `tests/image-loading-cache.test.mjs`: `e65cb28baf12640fff72e1d1662a3a47a73e98ba8077fbbbd8238e9c65b06a45`
- `scripts/prepare-thumbnail-backfill.py`: `4e9fec76a9abd69fcc5320439688da83d5f576bbe234c66ed5b0061e0399ad2e`
- `tests/backfill-preparation.test.mjs`: `07f25d6a371c5b5630e01f180c5f88b262f7e1281f05114d4a2755ae5a02848b`
- `docs/image-thumbnail-backfill.md`: `c00bfff0c95afe787a9835f6076825e649006bc0fb372e7f33ab6e0a909929f3`
