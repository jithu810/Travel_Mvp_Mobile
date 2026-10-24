# Thumbnail activation read-only audit

Backend Developer, **2026-10-24 04:12:30 UTC /09:42:30 IST**. Architect relayed product-owner approval limited to the reviewed Storage read policy on project gwybjhqgnrpouwcdvusi, enabling future thumbnails and one upload test. Backfill is not approved. Architect states rollback SQL/flag false were shown before execution. This specialist's assignment is read-only preapply inspection; no hosted action performed here.

## Preapply result

Recommendation: **no preapply blocker observed for Architect to apply the exact reviewed SQL once** within the explicit approval above. Do not apply other pending migrations, Storage policies, billing/configuration or backfill.

- Confirmed target: existing shared live Supabase project gwybjhqgnrpouwcdvusi, database postgres; same target previously matched to Mobile configuration.
- Reviewed local docs/backend/image-thumbnails.review.sql SHA256 freshly computed: **823C43BE7241B364ACD5B640A80179EB65AC53F389809906C59FBC88985F7C24**, matching Architect's reviewed snapshot. Source not modified.
- Fresh SELECT-only current catalogs: storage.objects RLS enabled; thumbnail policy journey_media_thumbnail_v1_read count **0**. Existing policy inventory exactly journey_media_insert, journey_media_read, profile_avatars_insert, profile_avatars_read.
- Current journey_media_read remains permissive SELECT for anon/authenticated: journey-media bucket, caller-owned first path component OR exact cover/stop path referenced by published/owned journey. Full predicate inspected and matches the prior 03:55:22 UTC preflight definition; no added sibling access exists yet.
- private.journey_media_authorizations absent; journey_rpc role absent. Expected legacy/social-loop branch still active; policy artifact's hardening guard is compatible. Migration history remains count0; this does not authorize history repair/replay.
- Existing dirty Mobile baseline preserved, including prior Search/Saved/image code, tests/reports, environment example/ignore changes and unrelated untracked .github/, cd, eas. No credentials or user/object rows inspected/output.

Prior isolated real PostgreSQL policy test passed and rollback restored original-only access; see image-loading-backend-review.md. This is evidence for the specific additive SELECT artifact, not hosted request verification. After Architect applies, independently re-read current definition/roles/RLS and compare to reviewed policy before declaring activation verified. One-upload authorization does not authorize unrelated content or bulk backfill; report the exact observed upload outcome separately.

Changed file: this audit only. No live DDL/writes, application edits, flag edits, test uploads, commits or deployments executed by this specialist during preapply audit.

## Independent postapply metadata verification

Architect reported successful apply_migration of the exact reviewed artifact. Independent read-only reinspection at **2026-10-24 04:13:49–04:14:05 UTC /09:43:49–09:44:05 IST** confirmed:

- journey_media_thumbnail_v1_read now exists as one additional **PERMISSIVE SELECT** policy, roles anon/authenticated, WITH CHECK null. Actual predicate inspected: journey-media bucket; strict UUID owner/journey/cover-or-stop/filename and thumb-512-v1.jpg suffix; exact same stem/directory mapped to full-v1.jpg/png/webp; canonical source referenced by cover or stop of published/owned parent. No owner-independent draft access or arbitrary sibling predicate added.
- Regex escaping verified using character-based metadata checks: a single literal backslash before thumbnail dots is present; double-backslash sequence absent. Current deparsed predicate MD5 **74d2a552d9c793f70685edccc7f78052**.
- Baseline journey_media_read full predicate, journey_media_insert owner/journey check, profile_avatars_read and profile_avatars_insert remain present and unchanged from inspected preapply metadata. storage.objects RLS remains enabled; hardening media-authorizations remains absent.
- Migration history now contains version **20261024041322**, name **journey_media_thumbnail_v1_read**. No other migration entry returned. Follow-up at04:14:34 UTC confirmed one recorded SQL statement and no GRANT/REVOKE in its actual stored text. Local artifact SHA256 still **823C43BE7241B364ACD5B640A80179EB65AC53F389809906C59FBC88985F7C24**.
- Current Storage table infrastructure grants include INSERT/UPDATE/DELETE for anon/authenticated, as commonly provisioned by Storage; grants alone do not authorize rows through RLS. The reviewed applied artifact contains no GRANT/REVOKE and adds only SELECT policy. No new write policy exists: the inventory is original four policies plus the one SELECT above. No broader write authorization is introduced by this policy. A before/after byte-for-byte table ACL snapshot was not part of the original preapply query, so ACL equality is not independently asserted.

Postapply metadata verifies the intended additive read policy. It does not prove live anonymous signed-thumbnail requests or a successful native paired upload. The separately approved one logical photo pair belongs to a fresh private draft; do not publish a fixture solely to test anon reads. Owner upload/read evidence and local isolated public-policy evidence must remain distinct. Backfill remains unapproved. This specialist performed no postapply mutations.

## One approved private upload: bounded post-save verification

At **2026-10-24 04:32:31 UTC /10:02:31 IST**, read-only verification of the exact authorized QA draft **[redacted private QA draft ID]** confirmed status **draft**, published_at **null**. Earlier exact-title/status/time query found exactly one new fixture and no cover before Mobile's upload. Owner identity remained internal; no personal names or Storage paths are included here.

Mobile/Architect separately reported one regular authenticated Save Draft action succeeded with “Saved privately” / “Journey and photos saved privately”, no retry and no Publish, using a local synthetic1536x1024 JPEG. This specialist did not operate that native upload.

Bounded Storage metadata query restricted to this fixture's owner/journey prefix returned **exactly two objects**:

| Variant | Stored bytes | MIME | Created UTC |
| --- | ---: | --- | --- |
| Canonical full-v1 original | 729570 | image/jpeg | 04:31:37.896196 |
| Companion thumb-512-v1 | 58344 | image/jpeg | 04:31:38.679210 |

The draft's persisted canonical path exactly matches the full-v1 object. Deriving the thumb-512-v1 sibling from that same directory/UUID exactly matches the other object; no extra object appeared in this fixture prefix. Both metadata contentLength values agree with size; both recorded successful Storage status200 and max-age3600. Thumbnail bytes are about **92.0% smaller** than the stored full image for this synthetic example. Metadata does not expose image dimensions: no image bytes were downloaded to independently inspect512px output here, and this is not a device-performance benchmark.

Three role-scoped SELECT-only checks each ran in **BEGIN READ ONLY … ROLLBACK** with transaction-local role/JWT-sub settings, restricted to those exact two object names:

| Caller scope | Visible objects |
| --- | ---: |
| Authenticated fixture owner | 2 |
| Anonymous (no JWT subject) | 0 |
| Authenticated different synthetic subject | 0 |

This confirms owner visibility and private-draft isolation for the actual pair. It does **not** claim a live anonymous/public thumbnail HTTP request succeeded: the fixture remains private and no publication was authorized. Public derivative-policy behavior was validated separately in disposable PostgreSQL. No signed URLs, downloads, extra uploads, row updates or durable writes were executed by this post-save verifier. Backfill and fixture cleanup remain unapproved; no production source manifest was prepared.

Architect execution checkpoint: user explicitly approved only exact reviewed read policy on gwybjhqgnrpouwcdvusi, future-thumbnail flag and ONE logical upload test. Rollback SQL was shown in commentary before apply and saved as docs/backend/image-thumbnails.rollback.sql; not executed. Applied exact SHA823C43BE7241B364ACD5B640A80179EB65AC53F389809906C59FBC88985F7C24 via apply_migration success:true. Local ignored .env.local target was verified and flag settrue without printing credentials. OriginalMetro8081 did not pick up newly added env; retained it. Started separate Metro8082 from same root with flagtrue; inspected served virtualenv descriptor and confirmed enabled. InitialIPv6-only temporarylistener stopped, replacement--lan acceptsIPv4; native test uses8082. No dependency/build/appsource changes. Backfill remains unapproved/not run. Upload result pending Mobile exactdraft evidence.
