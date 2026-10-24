# Existing-photo backfill: local preparation and approval boundary

This tool creates local review artifacts only. It never contacts Supabase, uploads objects, changes journey references, or deletes originals. No live backfill has run. Python 3.11 and Pillow are required; the current workstation has both. No Mobile dependency was added.

## Prepare a reviewed manifest

Export only explicitly approved canonical image paths and obtain their corresponding authorized local source files. Keep the manifest and source images in a private local directory. Do not include signed URLs, credentials or personal journey text. Example format (IDs below are synthetic):

```json
{
  "projectRef": "gwybjhqgnrpouwcdvusi",
  "items": [{
    "storagePath": "journey-media/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/cover/33333333-3333-4333-8333-333333333333.jpg",
    "source": "approved-photo.jpg"
  }]
}
```

Run from the Mobile repository, choosing a new output directory:

```powershell
python scripts/prepare-thumbnail-backfill.py --input .local-tests/approved-images/manifest.json --output .local-tests/thumbnail-review-001
```

The command validates source paths remain inside the manifest directory, canonical UUID paths, source encoding, size and dimensions. It refuses duplicate destinations and any pre-existing output directory. Each image produces a byte-identical local original copy, a JPEG thumbnail with longest side at most 512px and quality 70, and hashes/byte counts/dimensions in `review-plan.json`. Thumbnails do not retain source EXIF metadata. Original source files remain untouched. Preparation errors can leave incomplete files in the new output directory; no plan from a failed run is approved or executable, and reruns must choose a new directory. Review files can contain sensitive photos; keep them local and do not commit them.

## Legacy activation requires an explicit reference transition

Legacy UUID filenames do not advertise a stored thumbnail. The app deliberately does not probe every legacy image for a missing sibling. The review plan therefore proposes new immutable `.full-v1.<ext>` and `.thumb-512-v1.jpg` paths, retaining the old original. Merely uploading a thumbnail does not make it discoverable.

A future separately approved executor must verify the exact target/project, approved manifest hash, source/object version and SHA256, current owning journey and cover/stop reference, and `updated_at` concurrency token. It must check destinations before create-only uploads, stop on any conflict or ambiguous outcome, verify both uploaded files, and record receipts. Reference updates need a separately reviewed owner-authorized operation that compares the previous reference and concurrency token. No blanket SQL UPDATE, overwrite, delete, automatic retries, or production seed is supplied by this preparer. This task does not authorize implementing or running a live executor.

Keep the old object and old reference in receipts so an explicitly approved rollback can restore the reference without reconstructing photo data. Recheck public/draft visibility and thumbnail policy permissions after any approved reference transition. Do not delete originals during rollout.

## Deployment checkpoint

Before enabling `EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED=true`, review and explicitly approve installation of `docs/backend/image-thumbnails.review.sql` on the confirmed target. Until then the flag defaults off, existing uploads retain their prior names and behavior, and existing covers use original images. All backfill Storage writes and reference updates remain unapproved and separate from that policy approval.

Local synthetic preparation tests verify bounded output, source/hash preservation, no network access, no overwrite, invalid/traversal/duplicate input and encoding mismatch. These tests do not prove a live backfill, real camera capture, or production authorization behavior.

## Count-only live reference inventory for review

Backend Developer inspected confirmed project `gwybjhqgnrpouwcdvusi` at **2026-10-24 04:08:45 UTC /09:38:45 IST** using one read-only aggregate query over journey cover and stop references. No paths, user rows, signed URLs, object downloads or writes were returned/executed.

| Aggregate | Count |
| --- | ---: |
| Nonnull cover references | 23 |
| Nonnull stop-photo references | 62 |
| Total nonnull references | 85 |
| Distinct raw referenced paths | 47 |
| Legacy canonical UUID.ext references / distinct paths | 85 /47 |
| Marked full-v1 references / distinct paths | 0 /0 |
| External references / distinct paths | 0 /0 |
| Unsupported or noncanonical references / distinct paths | 0 /0 |
| Published references / distinct paths | 40 /38 |
| Draft references / distinct paths | 45 /20 |

Published/draft distinct-path counts overlap: a path may be referenced by more than one journey/status, so they must not be added to estimate unique source images. All observed paths match the legacy canonical naming pattern; this does not verify Storage object existence, ownership provenance, image bytes or current file versions. The **47 distinct referenced paths** give the current count-only review scope, not an approved production source manifest. No production images or path list were fetched. Preparing a real backfill still requires an explicitly approved source list and local source images, followed by the separate action/target approvals above.

Activation checkpoint2026-10-24: owner separately approved reviewed read policy on gwybjhqgnrpouwcdvusi and future-upload flag plusONE synthetic private upload acceptance; policy installed and localflag enabled. This approval does NOT approve this backfill, production manifest downloads, legacy photo conversions/reference transitions, or cleanup. Backfill remains review-only/not run.
