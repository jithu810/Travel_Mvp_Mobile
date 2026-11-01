Explore tiles previously displayed large originals and refresh discarded reusable signed URLs. This change adds larger two-column tiles while preserving valid URLs and the existing native image cache.

## Changes

- Keep the existing FlatList virtualization: six initial tiles, bounded batches and a three-viewport buffer. No new pagination or caching dependency.
- Preserve valid signed URLs on refresh; retry failed images without resetting Explore, Home or Story list state. Skip unfocused Search foreground reloads.
- Prefer available 512px thumbnails, retaining original/art fallback and existing search, Saved, ordering and navigation.
- Explicitly enable thumbnail generation in all EAS build profiles for future builds.
- Add bounded, manifest-checked create-only upload and optimistic activation/rollback helpers, with JPEG-compatible MPO preparation support. Helpers are manual maintenance tools and do not run on merge/build.

## Completed live rollout and measured results

The owner separately approved and completed the nine-cover live backfill: 18 new objects were SHA256-verified and nine cover references activated, canary first. Original objects, other journey fields and stop records/timestamps were preserved. Receipt-bound rollback was verified beforehand and prepared with actual activation versions; it was not needed. No schema/policy change or app deployment occurred.

On the CPH2813 Android16 phone, the same creator search and nine-photo traversal measured **6,029,211 → 208,442 image response-body bytes (96.54% less)**. Both runs made nine image GETs; warm refresh/reopen added zero. All after-run GETs were thumbnails, with no tagged full-size GETs. Counts use successful Supabase edge response Content-Length, excluding protocol overhead, maintenance traffic and daily billing projections. All nine photos displayed correctly.

## Validation

- TypeScript and repository-wide lint passed. ESLint excludes generated `.local-tests/**` artifacts; source/test rules remain unchanged.
- Full app suite: 1,011/1,013 passed; the two sandbox PostgreSQL startup failures passed their isolated rerun (6/6). Subsequent affected preparation/cache tests passed.
- Final backfill helper suite: 10/10 passed, including SQL preservation/rollback, concurrency drift, manifest binding, collisions, uncertain writes and SDK missing-object classification. Scoped lint and diff checks passed.
- Independent implementation review and QA found no remaining actionable findings. Physical phone checks covered rendering, scrolling, refresh/reopen, search, Saved empty state and journey navigation.

## Review scope and limitations

This is a dependent PR against `codex/app-wide-dark-theme`, isolating Explore from its two pending theme/layout commits. Reassess the base before retargeting main. Existing installed production bundles need the thumbnail capability flag enabled; no new build or deployment is included. No frame-rate or broad-device profiling is claimed.

Private photos, signed URLs, credentials, per-object manifests and real rollback SQL/receipts are excluded from Git. No further live backfill is required by this PR. Merge and deployment still need separate owner approval.

Evidence: [live results](docs/qa/explore-live-results-2026-11-01.md), [execution and rollback](docs/qa/explore-live-backfill-2026-11-01.md), [helper QA](docs/qa/explore-live-qa-2026-11-01.md), [application QA](docs/qa/explore-final-qa-2026-11-01.md), [rollout procedure](docs/explore-thumbnail-backfill-procedure.md).
