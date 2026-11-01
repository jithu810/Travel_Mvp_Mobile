# Explore native bandwidth measurement

Architect, 2026-11-01. Real CPH2813 Android16 phone, Journey Google Test development client, existing checkout via Metro8081. No emulator, cache clearing, app-data deletion, production upload or database write. Backend source acquisition was separately measured and excluded.

## Method and limits

Both runs used the same implemented two-column Explore grid, current 14-journey ordering and nine unique live legacy cover objects. To isolate signed-URL churn from layout changes, a temporary Hermes CDP wrapper around the already-loaded public discovery exports appended a unique nonsecret `audit_run` query tag to each original image URL. Baseline also changed `audit_revision` on explicit refresh, reproducing the former cache-key renewal behavior. Optimized retained the same image URL on refresh. This is a controlled native URL-churn comparison, not a checkout or deployment of the entire old application. Normal signing, public RPCs and native React Native Image/Fresco rendering remained in use; no image-body download was simulated by a JavaScript fetch mock.

Unique tags gave each run cold native image URL keys without destroying user caches. Both used native screen loading, two full upward scrolling swipes, return-to-top/pull refresh, open a journey and return using Search. The existing three-viewport buffer is unchanged. HTTP200 image GET responses and summed response Content-Length were identified in Supabase `edge_logs` by the exact audit query tag; only aggregate counts/status/response Content-Length sums were returned. Every counted response had Content-Length. This measures successful image response-body sizes recorded at the edge, not packet-level TLS/header overhead, independent proof of complete device receipt, CDN billing categories, control-plane RPC/signing traffic or an averaged daily saving. Nearby offscreen rendering remains intentional; initial requests included buffered images.

Read-only log inspection is not a production change. Tokens/object paths/user content were never printed or committed. Temporary wrappers were restored at03:24:17.314UTC; no app files were changed for measurement. Private task event timestamps are ignored under `.expo/`.

## Results

| Native phase | Baseline image GETs | Baseline response-body bytes | Stable-URL GETs | Stable-URL response-body bytes |
| --- | ---: | ---: | ---: | ---: |
| Initial loading including buffer | 3 | 778,732 | 3 | 778,732 |
| Progressive scrolling | 6 | 5,250,479 | 6 | 5,250,479 |
| Pull-to-refresh after returning to top | 3 | 778,732 | 0 | 0 |
| Reopen Explore after a journey | 0 | 0 | 0 | 0 |
| **Total** | **12** | **6,807,943** | **9** | **6,029,211** |

Observed avoided response bodies: **3 GETs / 778,732 bytes**, **11.44%** of total bytes for this one controlled traversal and **100%** of the baseline refresh bytes in this test. Initial+scroll bytes were identical because all current references are still legacy originals. Reopening was warm in both runs; no saving is claimed for that phase. These results do not imply zero future downloads after TTL expiry, process restart, eviction or changed photos. No packet/frame-rate profiler was used.

A post-run native `Image.queryCache` check corroborated completed cache entries for all9baseline-cold URLs (disk), the3new baseline-refresh URLs (memory), and all9optimized URLs (disk/memory). That agrees with the12versus9logged response counts and demonstrates native cache reuse without another image-body download from this inspection. It still does not substitute for packet-level byte accounting.

Early partial log snapshots were not used as final counts: ingestion initially showed fewer initial/refresh events. A final aggregate reconciliation at03:27:41UTC over the same fixed window confirmed baseline12GET/6,807,943bytes and optimized9GET/6,029,211bytes, allHTTP200 and zero missing Content-Length values, agreeing with the table.

## Event boundaries (UTC)

- Baseline installed03:19:53.854; initial finished03:20:46.085; scroll finished03:20:54.850; refresh finished03:21:23.364; reopen finished03:21:47.151.
- Stable-URL installed03:21:47.375; initial finished03:22:21.175; scroll finished03:22:30.726; refresh finished03:24:08.783; reopen finished03:24:17.134.
- Log window03:19:40–03:25:00; exact tags `ejopt-base-20261101a` and `ejopt-opt-20261101a`. HTTP methodGET, sourceedge_logs. Phase classification uses the boundaries above and retains status grouping to expose failures. Only HTTP200 responses were found.

## Thumbnail dry run is separate

The actual nine downloaded originals total6,029,211bytes; nine generated512px JPEGs total208,442bytes, measured96.54% smaller. Original copies are SHA256-identical. See `explore-thumbnail-dry-run-2026-11-01.md` for item sizes, hashes and validation. This is a real local compression measurement; those thumbnails are not uploaded/activated, so no live thumbnail-delivery egress saving has been measured. The one-time9GET/6,029,211-byte Node source acquisition at03:18:56.664–03:18:59.080 is excluded from both tagged phone runs.

Live activation still requires explicit approval for the confirmed project, manifest and create-only object uploads plus integrity-preserving cover-path/media-authorization transitions. No record identity or unrelated journey data may be changed. Then rerun this native traversal with actual live thumbnail references before claiming deployed thumbnail bandwidth savings.
