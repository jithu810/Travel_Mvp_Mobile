# Explore covers: local thumbnail dry run

2026-11-01; Backend Developer. Owner authorized read-only acquisition of the nine existing public Explore cover originals and local generation/verification. **No Storage uploads, database writes, cover-reference transitions, live configuration changes, builds, commits or publication performed.** Prior Explore implementation edits were preserved.

## Source acquisition

The actual public RPC still selected 14 non-demo journeys and nine distinct referenced cover paths. A private metadata snapshot records each source object ID/version/size, current journey references and `updated_at` concurrency tokens. A post-acquisition SELECT compared all nine objects and reference tokens unchanged. No environment files or service-role credentials were read.

Read-only signed URLs came from the existing loaded discovery module in the authorized native development client through local Hermes CDP. URLs/tokens were held transiently and never printed or persisted. No image cache was cleared. Approved direct source acquisition ran from Node, not the native image pipeline: **9 image GETs; 6,029,211 response-body bytes**, fetched **03:18:56.664–03:18:59.080 UTC**. This one-time preparation transfer must be excluded from Android before/after traffic measurements. HTTP/TLS overhead was not measured. Two initial restricted-network attempts failed without source writes; the approved escalated retry completed. Metadata/signing control requests are separate from the nine image GETs.

Private originals, receipts, source/concurrency metadata, manifest, generated pairs, verification summary and contact sheet are under ignored `.expo/explore-backfill-2026-11-01/`. Do not publish these personal photos or raw identifiers. The acquisition helper and verifier are private task artifacts, not application dependencies or a live backfill executor.

## Generation and validation

Reused `scripts/prepare-thumbnail-backfill.py`. Its first validation correctly stopped before producing a review directory because one legitimate `.jpg` source is a JPEG-compatible MPO multi-picture container. The bounded preparer enhancement accepts Pillow `MPO` only for a JPEG extension, preserves original bytes and deliberately selects primary frame zero for the preview. PNG/WebP mismatches and arbitrary formats remain rejected. Source dimensions/byte limits remain unchanged.

The rerun produced nine byte-identical `.full-v1.*` original copies and nine JPEG quality-70 thumbnails, longest side at most 512px. Every source/copy hash matched its download receipt; all thumbnail hashes, decoded JPEG formats, dimensions and <=1 MiB limits passed independently. The private contact sheet compared originals and generated thumbnails side by side: orientation/content preserved and no obvious corruption or unacceptable artifacts at tile-preview size. This is a visual inspection, not product-owner approval or a claim of lossless thumbnail quality. Originals remain byte-identical, including the MPO container.

| Anonymous item | Original bytes | Thumbnail bytes | Thumbnail dimensions |
| --- | ---: | ---: | --- |
| 1 | 2,013,736 | 17,322 | 235 × 512 |
| 2 | 314,988 | 22,571 | 384 × 512 |
| 3 | 203,417 | 27,522 | 380 × 512 |
| 4 | 165,614 | 26,991 | 410 × 512 |
| 5 | 1,895,738 | 24,378 | 384 × 512 |
| 6 | 321,379 | 13,708 | 512 × 384 |
| 7 | 142,365 | 22,826 | 388 × 512 |
| 8 | 786,319 | 19,956 | 384 × 512 |
| 9 | 185,655 | 33,168 | 384 × 512 |
| **Total** | **6,029,211** | **208,442** | |

Measured local file-byte reduction: **5,820,769 bytes, 96.54%**, approximately 28.9 times smaller. This compares the exact nine source files against their generated previews; **it is not a measurement of deployed Storage egress reduction**. After a separately approved activation, downloading each unique thumbnail once rather than its original would save that body-byte amount for this snapshot, assuming no fallback, additional retries, native-cache differences or other image traffic. Current production references remain legacy and continue selecting originals.

Private manifest SHA256: `1566dba105055a62e9622795e9343c5d15a452f185e6896e3237a0600d7ae434`.
Private review-plan SHA256: `c1c2229f1ac50077f4735f39f1684eb0345885415e9310eb0998ff36fcaf1b1c`.
Plan remains `executionAuthorized:false`. These hashes identify the proposal only and do not authorize execution.

## Configuration and checks

Local `eas.json` now explicitly sets the nonsecret `EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED` boolean string to `true` for development, preview and production profiles. A Node JSON assertion verified all three profile values. This makes future profile builds explicit; no hosted EAS environment inspection/change, build or deployment occurred. Existing installed bundles are not changed by editing this file; Metro launched directly still needs its own public flag configuration. Root's separate runtime check/evidence is authoritative for the currently loaded bundle.

- `node --test tests/backfill-preparation.test.mjs`: **5/5 passed**, including new synthetic two-frame MPO case proving primary-frame selection, original-byte preservation and rejection under PNG path; prior offline/network-denial/no-overwrite/validation/collision cases retained.
- Existing preparer run on the nine approved originals: passed after the bounded MPO support.
- Independent private Python hash/format/dimension/size verifier: passed all nine.
- Source metadata/reference/concurrency-token comparison before/after acquisition: unchanged.
- Live writes/uploads/reference transitions: **zero**.

## Approval boundary

“Preserve database records” can preserve identities, journey metadata, ordering and original bytes, but making legacy thumbnails discoverable under the current naming contract still requires changing cover-path references (and maintaining their backend media authorizations). That is a live database action. Merely uploading siblings will not activate these legacy covers. No such transition is approved or performed here. Review `docs/explore-thumbnail-backfill-procedure.md` before any future proposal; target, exact manifest, create-only uploads, authorization-preserving optimistic reference changes and rollback each need the applicable explicit approval. Never replay the historical pre-hardening policy SQL.
