# Nine-cover live backfill: pre-execution checkpoint

2026-11-01, Backend Developer. Baseline Mobile `89125d9`, branch `codex/explore-image-optimization`, clean before this assignment. Owner explicitly authorized the nine-cover live backfill on `gwybjhqgnrpouwcdvusi` / `journey-media`, originals untouched, rollback verified before execution. No publication/deployment/schema/policy changes are included. **At this checkpoint no live upload or database write has occurred. Architect release and independent pre-execution review remain required.**

## Fresh live preflight

Read-only current catalog/reference inspection at **03:33:31 UTC**, role/trigger/ACL inspection at **03:34:46 UTC**. Target matches the existing project and dry-run references. Current connection user and table owner are `postgres`; it has cover-column UPDATE and media-authorization INSERT/DELETE privileges. `journey-media` remains private, JPEG/PNG/WebP, 15,728,640-byte cap. Current original and thumbnail RLS definitions and the existing hardened authorization helper were inspected; no policy change is necessary.

- Exactly nine distinct sources and **nine affected cover references**, one owner, no cross-owner or cross-journey-prefix references, no stop references to those nine paths. All nine old references already have valid journey-specific media authorizations. Fourteen public journeys include journeys without covers; they are not fourteen cover references.
- Zero proposed full-v1/thumbnail destination objects existed at fresh inspection.
- Fresh source IDs/versions/sizes match all nine dry-run sources. Local original copies/thumbnail SHA256 checks bind to the approved source manifest and review plan. The upload helper also re-downloads each selected source before any upload and verifies its original SHA256/size/ETag; this one-time verification traffic is reported separately.
- Exact private snapshots include current cover path, full-precision `updated_at`, owner/status, digest of every other journey field, digest of all ordered stop rows including their `created_at`/`updated_at`, and complete media-authorization path digest. No personal identifiers appear in this report.
- Existing `save_journey` was inspected and deliberately **will not be used**: it deletes/reinserts stop rows and would replace their timestamps. Activation instead uses a reviewed, exact-manifest optimistic maintenance transaction changing only cover paths, naturally advancing journey versions and adding the exact new authorization records. No permanent SQL function, table, grant, policy or trigger is created/changed.

## Current transport blocker

The existing native owner-client probe returned **hasUser:true, authError:false, ownerMatches:false**. The phone is signed in successfully to a different account from the nine-cover owner, whose public profile is **Sreejith Gs (@sree8100)**. No sign-out, sign-in, credential extraction or account switch was performed. The helper stops before signed-upload requests/writes. Owner-policy uploads require the owner to switch the authorized phone session to the correct account. No temporary RLS changes, service keys, minted credentials or direct `storage.objects` writes will be used to bypass this.

## Concrete upload and activation plan

Scripts: `scripts/explore-cover-backfill-plan.mjs` and `scripts/explore-cover-backfill-upload.mjs`; tests `tests/explore-cover-backfill.test.mjs`. Private operation files stay under ignored `.expo/explore-backfill-2026-11-01/`.

1. Bind the **actual file bytes**, not claimed hash fields, to source manifest SHA256 `1566dba105055a62e9622795e9343c5d15a452f185e6896e3237a0600d7ae434` and review plan SHA256 `c1c2229f1ac50077f4735f39f1684eb0345885415e9310eb0998ff36fcaf1b1c`. Require exactly nine unique canonical owned cover paths and their exact full-v1/thumbnail sibling destinations; verify local bytes before transport.
2. Canary is the smallest original (142,365 bytes; thumbnail 22,826 bytes), selected from that same approved nine-item manifest. Reconfirm current owner, reverify canary source SHA256/ETag, and refuse destination collisions before writing. Obtain short-lived create-only signed-upload URLs from the existing authenticated owner client; URLs/tokens stay transient in memory. PUT with `x-upsert:false`, exact MIME and cache-control; no overwrite or automatic retries. Fsync a private upload-started journal before each request; download/hash-verify each resulting object and journal verified bytes afterward.
3. Fresh catalog inspection must attach the verified destination object IDs/versions/size/MIME to the private operation plan. No SQL is generated while the selected destinations lack content verification plus catalog metadata.
4. Generate the canary activation SQL. It locks exact selected journey rows in deterministic order, selected stop rows FOR SHARE, and original/destination Storage object rows FOR SHARE. Assert old cover, full-precision version, owner/status, all non-cover/version journey fields, all stop fields, complete prior authorization digest, original ID/version/size and verified destination ID/version/size/MIME. Insert only the selected new authorization and UPDATE only that journey's cover path. Existing old authorizations are retained. Verify version advanced and other journey/stop digests unchanged before commit. The atomic receipt records exact new version, old/new paths and authorization-created/old-retained flags. It contains no auth credentials.
5. Root verifies the canary public thumbnail is signable/readable and its bytes/hash match. Only then upload the remaining sixteen objects and activate the remaining eight in a separate atomic transaction with identical guards. Both batches share the same immutable operation digest; destination metadata arriving later does not change that approval boundary. This is **one canary plus eight**, not a silent all-nine rollout.
6. Root independently verifies all nine source objects unchanged, all nine published thumbnails publicly signable, no title/status/published_at/ordering/stop/social/receipt changes, then measures native Explore behavior. Actual GET counts/body bytes must separate controlled phone audit tags from acquisition, upload verification and public-canary traffic.

The full-copy uploads total 6,029,211 bytes and thumbnail uploads total 208,442 bytes: **6,237,653 nominal upload body bytes**, separate from verification downloads and HTTP/TLS overhead. Native before/after egress savings must not subtract or disguise these maintenance costs.

## Rollback verified before execution

`buildRollbackSql` consumes the matching activation receipt (canary, remaining eight, or combined nine) and its exact full-precision new versions. It locks the same scoped rows, requires current new cover plus receipt version and unchanged other-field/stop digests, verifies the original object still exists with its original version/size and old authorization remains, and restores only the old cover path. The normal version trigger advances to another new version; **old timestamps are never restored**. Remove only this operation's newly created authorization when no active cover/stop reference still uses it, then assert the exact original authorization digest. Source objects and new objects are never deleted. Any user edit causes rollback refusal rather than overwrite; the selected batch is atomic.

Live rollback is prepared and tested, **not executed**. If a request/COMMIT response is lost, stop. A committed transaction can lose its returned receipt; never retry activation or fabricate a rollback token automatically. Reconcile current rows, object metadata, authorization rows and server evidence read-only, compare snapshots, and obtain Architect/owner direction before any recovery action. Private fsynced upload journals similarly distinguish a started request from a verified result; partial uploads remain unreferenced pending reconciliation. Cleanup/deletion is excluded.

## Evidence so far

- `node --test tests/explore-cover-backfill.test.mjs`: **9/9 passed**, including real offline PostgreSQL activation and rollback, preserved stop timestamps/all other records, late-item version/source/authorization/destination drift with whole-batch rollback, concurrent-edit rollback refusal, canary-plus-eight combined rollback, actual manifest hash rejection, upload collisions, uncertain PUT stop/no retry, changed owner and bad remote digest. The offline engine reuses the Web repository's installed PGlite; no new dependency or live database fallback. Network ports are mocked for upload-contract tests; no test writes to Supabase.
- All nine fresh source object IDs/versions/sizes match dry-run metadata; local prepared bytes match approved SHA256 plan.
- Owner-client probe safely refused wrong account before any write.
- Scoped ESLint passed for both new helpers and their tests, zero warnings. Initial invocation found missing explicit Node Buffer imports; those were added and the targeted lint rerun passed. Independent review is in progress. Root records final gate release and later execution evidence here.

Architect gate at initial checkpoint: **paused for owner account match and final reviewed execution release**. Missing owner-session identity is a real transport prerequisite, not permission to bypass ownership. Initial live writes performed: **zero**. Later task-specific execution checkpoints follow below.

## Owner resume and canary upload checkpoint

Owner reported signing into the correct account. A new no-write probe confirmed authenticated owner match; fresh read-only source/reference/version/digest comparison after the pause passed for all nine, with zero destinations. Architect recorded the reviewed canary-upload release in `docs/qa/explore-live-architect-2026-11-01.md`.

The first upload invocation stopped before any upload-started journal because the installed SDK intentionally returns `data:false` **with** an error for a missing-object HEAD. The initial helper incorrectly rejected that safe absence. No PUT occurred. After correction, ambiguous HTTP400 requires a known missing-object code/message (with a read-only info fallback); generic400/auth401/403/rate-limit/server errors remain fail-closed. HTTP404 requires explicit false data. A targeted classifier test passed and scoped lint passed; independent review and the Architect renewed the gate. A later no-write probe timed out while the app was at the Android launcher; no PUT occurred and the root restored the proper Metro client before owner reconfirmation. These failed preflight attempts are not upload retries after an uncertain write.

**Canary pair uploaded successfully**, journal interval **03:51:23.747–03:51:30.144 UTC**:

- New byte-identical full copy: 142,365 bytes.
- New 512px JPEG thumbnail: 22,826 bytes.
- Upload body total: **165,191 bytes**; post-upload verification GET body total: **165,191 bytes**; successful source preverification GET: **142,365 bytes**. These are one-time maintenance traffic, separate from native Explore measurements and from earlier failed preflight reads.
- Four fsynced journal events record upload-started/content-verified for both objects. Both downloaded destination SHA256 values match the approved local bytes. Fresh catalog metadata attached both object IDs/versions/size/MIME to the private operation plan.
- All nine original source object IDs/versions/sizes remain unchanged; no original object was overwritten or deleted.
- Canary activation SQL is prepared privately using the reviewed builder. **No database reference activation has occurred at this checkpoint; a separate Architect release is awaited.** Remaining sixteen uploads are not yet released.

## Live completion: nine pairs activated

The Architect subsequently released the exact one-cover transaction after the matched owner-search before measurement completed. The canary transaction executed **once**, committed, and returned a full-precision activation receipt saved privately. Anonymous verification used the isolated public client, confirmed its session was null, signed the new canary thumbnail, and fetched **HTTP200 / 22,826 bytes**, with exact approved SHA256, at **04:02:38 UTC**. A read-only preservation comparison passed for all nine original source versions, all non-cover/version journey fields and every ordered stop row; the remaining eight references were unchanged.

The Architect then released the remaining eight as one bounded operation without another handshake: sixteen create-only uploads, remote hash verification, fresh destination catalog attachment, and the reviewed eight-cover transaction. All sixteen uploads succeeded without uncertain PUT outcomes or retries; the final upload verification completed **04:04:52.685 UTC**. The eight-cover transaction executed **once** and committed. No permanent functions/schema/policies/grants/triggers were changed.

Final anonymous check at **04:06:21 UTC** confirmed a null public-client session, nine successful public thumbnail signatures, **nine HTTP200 image GETs totaling 208,442 bytes**, and nine exact SHA256 matches. Root was then notified that the public CDP operation had finished so native post-measurement could start independently.

Final read-only preservation checks passed:

- All nine old original object IDs, versions and byte sizes unchanged. Their bytes were SHA256-verified against the approved local originals immediately before the selected uploads; unchanged final versions substantiate that those sources were not replaced. Every new full-copy destination was independently downloaded and matched that same source SHA256.
- All nine cover references equal their approved new full-v1 paths and their exact full-precision activation receipt versions.
- Every other journey field is digest-identical, including title, status, owner, `published_at`, destination fields and lineage. Publication ordering therefore remains unchanged.
- All ordered stop rows, IDs, sequence, photo paths and both timestamps are digest-identical. No stop insert/delete/update occurred.
- All prior journey media-authorization path sets are unchanged after excluding the one new cover path per journey; nine exact new cover authorizations were added. Old authorizations were deliberately retained for safe recovery. Their old paths cease being publicly signable through the hardened helper unless still actively referenced; existing bearer URLs retain their ordinary expiry behavior.
- The maintenance SQL contains no social/receipt writes and no journey/stop deletes, so it does not invoke their cascading delete behavior. Actual isolated PostgreSQL tests verify those rows remain identical. A separate live before/after social-table fingerprint was not collected; do not represent the isolated evidence as such a measurement.

### Actual rollback artifact

Private `combined-activation-receipt.json` contains all nine real full-precision activation versions. The reviewed builder generated private `rollback-nine.sql` from that receipt and the same approved operation. It was **not executed**.

- Rollback SQL SHA256: `4f91c624e4451fbe6106401919070b5bc672420ea02eb8cf913cf1a000380d78`.
- Immutable operation SHA256: `bc99a5242ae25009b9c623f86c77e507c83f0cbfacf1ea83981bf0ef8925d443`.

The nine-item rollback restores only old cover paths, advances natural versions and removes only operation-created, unreferenced new authorizations after matching the exact activation versions. All originals and new objects remain. Any later user edit prevents the affected rollback batch instead of being overwritten. Isolated rollback tests were completed before live execution; no live rollback was needed.

### Maintenance transfer accounting

These body-byte figures are separate from Root's tagged native Explore before/after experiment:

| Successful maintenance phase | Body bytes |
| --- | ---: |
| Full-copy plus thumbnail uploads (18 objects) | 6,237,653 |
| Owner download/hash verification of all 18 new objects | 6,237,653 |
| Original-source hash verification before the successful canary/eight upload batches (9 GETs) | 6,029,211 |
| Public canary verification plus final nine-thumbnail verification (10 GETs) | 231,268 |
| Earlier separately authorized dry-run original acquisition (9 GETs) | 6,029,211 |

Additional failed-preflight/control requests and protocol overhead were not fully instrumented and are not folded into those exact successful-stage totals. Native caching/signature behavior and measured Explore savings belong to the Architect/QA phone evidence; the measured file-byte ratio alone is not substituted for it.

Final helper verification: original nine tests passed; the added SDK-missing-object classifier regression passed; QA independently reports **10/10 helper tests and scoped lint passed**. No application files, dependencies, Git publication, merge, deployment or object deletion was performed by this backfill assignment. Live work completed within the explicitly approved nine-cover scope.
