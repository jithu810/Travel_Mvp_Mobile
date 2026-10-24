# Mobile thumbnail activation: single-photo test

2026-10-24. Mobile Developer owns the native test and this report. Activation project: `gwybjhqgnrpouwcdvusi`. Product-owner authorization covers the reviewed policy, future thumbnail activation and one logical photo upload; that upload creates an original plus thumbnail pair (two Storage objects). Existing-photo backfill and publishing journeys remain outside this test.

## Preparation completed

- Connected existing Android development client: CPH2813, Android 16, device endpoint `[redacted local device endpoint]`. No dependency installation, native build, credentials extraction or permission changes.
- Opened Account through existing navigation; the settled screen confirms an authenticated owner session, 11 published journeys and 7 private drafts. No existing draft opened or edited. Evidence: ignored `.local-tests/thumbnail-activation/account.png` and `account-ui.xml`.
- Generated one metadata-free synthetic JPEG and pushed only that file to Android Downloads: `journey-thumbnail-activation-qa.jpg`, 1536x1024, 1,334,481 bytes, SHA256 `914186965e7c81182094b3dbb4d64b664b51802c4ee69ce67b32de1eb5a16aac`. No personal gallery source was read. Local fixture: `.local-tests/thumbnail-activation/journey-thumbnail-activation-qa.jpg`.

## Completed native test

Architect released the gate after independent policy verification and confirmation that the served port-8082 bundle had the thumbnail flag enabled. The existing 8081 server remained intact. ADB reverse and the dev-client intent confirmed the phone opened the verified 8082 bundle; the initial client load waited 12 seconds.

Created one fresh private `[redacted private QA draft title]` draft (Kochi, Solo, one day, zero stops). No existing draft was edited. Account's private-draft count changed from 7 to 8. The exact draft identifier is retained only in ignored `.local-tests/thumbnail-activation/receipt.json` for Backend verification.

The system picker initially omitted the ADB-pushed image. A targeted media scan of only the synthetic file indexed it. An exact-filename MediaStore query verified its dimensions and modification timestamp; the picker added one new accessibility entry at that timestamp. Selected only that newly indexed entry and confirmed that exactly one photo was selected. Back in the app, the local preview matched the synthetic white banner and tan noise, with `New photo - Not saved` and `Details saved - Photos not saved`. No personal gallery photo was opened or chosen, and no permission setting was changed.

Tapped **Save Draft once**. After a 12-second wait, the app showed `Saved privately`, `Cover photo saved photo`, and `Journey and photos saved privately.` There was no error, uncertain outcome, retry, second photo or second upload submission. Publish remained disabled. Navigated to Account and reopened only the QA draft once: its synthetic cover still rendered with saved-photo status. No second Save was performed.

Evidence remains ignored/local: `prepared.png`, `after-one-save-ui.xml`, `account-after-save-ui.xml`, `reopened.png` and `reopened-ui.xml` under `.local-tests/thumbnail-activation/`.

## Automatic approval review boundary

Automatic approval review rejected a full media-picker screenshot because it could expose unrelated private photos. The rejected capture did not execute. No alternate capture or indirect workaround was attempted. The safe alternative used only the exact synthetic filename, indexed dimensions/timestamp and newly added accessibility entry; screenshots were taken only after returning to the app's private QA draft.

## Independent stored-object verification

Backend independently confirmed exactly two JPEG objects for the single QA draft, sharing the intended full-v1/thumb-512-v1 stem, with the full reference persisted and `published_at` still null:

| Object | Stored bytes | Creation time (UTC) |
| --- | ---: | --- |
| Original | 729,570 | 2026-10-24 04:31:37.896 |
| Thumbnail | 58,344 | 2026-10-24 04:31:38.679 |

The thumbnail is about **92% smaller than this prepared original**. This is a measured stored-object comparison for one synthetic fixture, not a general savings claim or a measurement of native download traffic. The selected local source was 1,334,481 bytes before the app's existing original preparation.

Read-only role checks returned owner 2 objects, anonymous 0, and another account 0; the verification transaction rolled back. No additional live mutation was performed for these checks. Exact fixture identifiers and the verification receipt remain in ignored `.local-tests/thumbnail-activation/receipt.json`; the broader backend audit is owned by Architect/Backend.

## Verification limits and retained artifacts

Storage metadata does not provide an independent remote pixel-dimension measurement. The native generator validates actual JPEG output dimensions with longest side at most 512 before upload; its generated temporary file is cleaned up. Candidate dimensions/bytes are not exposed in this UI. Existing automated tests verify the JPEG512/70 contract and cleanup, but are not additional live uploads.

This private test does not exercise a positive public-grid thumbnail read, publication, backfill, general gallery/camera behavior, iOS or actual cold/warm download-byte savings. No policy or environment file was changed by Mobile Developer. The synthetic source, private QA draft and test objects are retained; no destructive cleanup was authorized or performed. Phone remains on the reopened private QA draft using the thumbnail-enabled development bundle.
