# Live nine-cover backfill results

Completed on the existing Supabase project `gwybjhqgnrpouwcdvusi`, bucket `journey-media`, under the owner's explicit nine-photo upload/reference-activation approval. No push, merge, deployment, schema/policy change or object deletion. Source and execution artifacts remain private and ignored under `.expo/explore-backfill-2026-11-01/`.

## What changed and rollback

- Created nine byte-identical versioned full copies and nine512px JPEG thumbnails using create-only uploads; all18new objects were downloaded and SHA256-verified. All nine original source object IDs/versions/sizes remain unchanged, and source SHA256 was checked before upload. Originals were never overwritten or deleted.
- Activated one canary, verified its anonymous HTTP200/hash, then activated the remaining eight in a separate guarded transaction. Only cover paths and natural journey update versions changed; exact new media authorizations were added while retaining old authorizations. Other journey fields, publication ordering and every ordered stop row/ID/timestamp remained digest-identical. There were no social/receipt SQL statements or cascading stop rewrites; no separate live social-table fingerprint is claimed.
- Rollback was verified before writes in isolated PostgreSQL tests. The actual nine-row receipt-bound rollback SQL is prepared privately, SHA256 `4f91c624e4451fbe6106401919070b5bc672420ea02eb8cf913cf1a000380d78`; it was not executed. It restores only old covers/operation authorizations when exact activation versions still match, advances versions naturally, refuses later user edits, and deletes no media.
- The phone first had a different authenticated account; execution waited for the owner account. The SDK's missing-object response needed a narrow fail-closed classifier fix; all initial failed attempts stopped before PUTs. These checks did not weaken RLS or use hidden credentials.

Full backend evidence and maintenance transfer accounting: `explore-live-backfill-2026-11-01.md`. One-time maintenance uploads, hash-verification reads and earlier preparation downloads are separate from the native traversal below.

## Actual CPH2813 phone measurement

CPH2813 Android16, Journey Google Test, existing Metro8081; no emulator. Both accepted runs used the actual Explore two-column FlatList, same signed-in owner, same public creator search `sree8100`, same12matching journeys/order and same nine unique cover photos. This avoids the confounder that blank Explore deliberately hides the owner's own journeys. Initial loading, progressive scrolling, pull refresh and Home→Search reopening were exercised. The creator filter was restored on reopening when needed.

Temporary in-memory wrappers only appended unique nonsecret `audit_run` tags to signed image URLs so each accepted run had cold native URL keys without clearing user caches. They did not replace photo contents, bypass viewer filtering or change app source. Existing signing, native Image/Fresco rendering and list virtualization remained. Wrappers were restored after the runs. Earlier unfiltered run `ejlive-before-20261101a` and interrupted setup `ejlive-before-20261101b` are excluded from this matched comparison; they are not silently added to savings.

Actual Supabase edge logs were filtered by exact audit tag and GET method. Every counted response was HTTP200 with a recorded Content-Length. These are edge-recorded image response-body sizes, excluding HTTP/TLS overhead, control requests and daily/billing attribution. Native cache proof and visual inspection corroborate successful image delivery but are not packet-level byte accounting.

| Phase | Before image GETs | Before body bytes | After image GETs | After body bytes |
| --- | ---: | ---: | ---: | ---: |
| Initial loading including buffer | 3 | 778,732 | 3 | 59,105 |
| Progressive scrolling | 6 | 5,250,479 | 6 | 149,337 |
| Warm refresh | 0 | 0 | 0 | 0 |
| Reopen same creator results | 0 | 0 | 0 | 0 |
| **Total** | **9** | **6,029,211** | **9** | **208,442** |

**Measured reduction:5,820,769response-body bytes,96.54%,about28.9times smaller for the full nine-photo cold traversal.** Image count remains nine; the saving comes from smaller live thumbnails. Refresh/reopen already reused caches before backfill and stayed at zero extra image responses afterward. This is now a live delivery measurement, unlike the earlier dry-run file ratio. It does not predict an exact daily saving.

All nine after-run GET paths were thumbnail paths; no tagged original/full-copy GET occurred. Native `Image.queryCache` found all nine selected thumbnails in memory and zero of the nine separately tagged full-size URLs cached, both after scrolling and after warm reopen. Source resolution reported nine cover URLs and nine thumbnail URLs. All nine were publicly signable and independently hash-verified by the Backend, total208,442bytes. This confirms Explore selected thumbnails without loading full-size bodies solely for these tiles.

Private phone captures outside the repository (`explore-live-top.png`, `explore-live-middle.png`, `explore-live-bottom.png`) show the nine real photos rendered with the existing captions, orientation/crop and rounded tiles. Architect visually inspected all three; all nine photos displayed correctly without fallback or persistent loading indicators. Art-only journeys retain their existing art. Original media and large-photo behavior remain available; no broad-device/frame-rate claim is made.

## Reproducibility and checks

- Before tag`ejlive-before-20261101c`, window03:55:40–04:01:00UTC: initial boundary03:58:07.372, completed scroll03:59:20.691, refresh04:00:31.410, reopen04:00:45.924; wrapper restored04:00:46.112. An interrupted first scroll was completed before its final boundary; native proof confirmed all nine originals cached.
- After tag`ejlive-after-20261101a`, window04:07:00–04:09:00UTC: initial boundary04:07:27.075, scroll04:07:48.245, refresh04:08:20.803, reopen04:08:27.502; cache proof04:08:30.728, wrapper restored04:08:30.950. All nine thumbnails cached; separate full-size cached count zero.
- Independent QA:10/10 isolated helper tests, scoped lint and diff checks passed. Independent review cleared guarded SQL, rollback, create-only uploads, manifest binding, failure/uncertain-write handling and classifier correction. Application source did not change in this rollout; prior TypeScript/full-suite/repository-lint evidence remains applicable to that unchanged application snapshot.

Nothing was pushed, merged or deployed. New maintenance helpers/reports remain local and uncommitted for review. Existing published clients need their thumbnail capability flag enabled to select the paired variants; the tested development bundle is enabled, and local EAS profiles already explicitly enable future builds. No new app build was produced.
