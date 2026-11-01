# PR preparation (local only)

Title: Improve Explore grid and preserve native image-cache reuse

Head: `codex/explore-image-optimization`

Base: `codex/app-wide-dark-theme` (dependent PR; reassess before retargeting main)

## Description

Explore now shows larger rounded two-column tiles, starts with six tiles and continues using the existing bounded FlatList virtualization. Refresh reloads collection membership while retaining valid signed image URLs. Explicit image retries preserve list/scroll state across Explore, Home and Story, and unfocused Search skips foreground reloads. Search, Saved, ordering, navigation and original fallback remain in place; no new dependencies, pagination or backend API changes.

The existing local backfill preparer now handles JPEG-compatible MPO primary frames without changing original bytes. EAS profiles explicitly enable the existing thumbnail flag. Nine real legacy covers were locally prepared and verified; originals6,029,211bytes versus thumbnails208,442bytes (96.54% smaller). No private photos/manifests are included, and no live uploads or reference transitions were executed.

## Validation

- TypeScript and repository-wide lint pass. Lint excludes only generated `.local-tests/**` artifacts in addition to existing exclusions.
- Full suite1,011/1,013pass; the two sandbox PostgreSQL startup failures passed in the isolated rerun6/6. Final affected preparer/cache regressions9/9pass. Independent review has no remaining actionable findings.
- CPH2813Android16 phone: Explore loading/scroll/refresh/reopen, Journey Story navigation and Saved empty-state checks.
- Controlled same-grid native URL-churn comparison using real Supabase originals:12GET/6,807,943edge-recorded response-body bytes →9GET/6,029,211bytes, saving778,732bytes (11.44%) in this test. Refresh3GET→0; initial/scroll unchanged; warm reopen0both. This isolates caching and is not a complete old-release comparison or packet-level/billing measurement.

## Remaining limits

Current live covers remain legacy originals. Live backfill/reference/media-authorization activation requires separate approval and review of the exact private manifest. Thumbnail compression is measured locally, not deployed egress savings. Production configuration is explicit for future builds; no hosted environment, installed production bundle, actual production upload, build or deployment was changed/verified. No frame-rate or broad-device profiling.

Evidence: `docs/qa/explore-completion-2026-11-01.md`, `explore-bandwidth-2026-11-01.md`, `explore-thumbnail-dry-run-2026-11-01.md`, `explore-final-qa-2026-11-01.md`; rollout procedure `docs/explore-thumbnail-backfill-procedure.md`.

Publication status: local commit/description only. No push, GitHub PR, merge or deployment authorized or performed.
