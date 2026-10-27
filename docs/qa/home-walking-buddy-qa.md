# Home Locate walking Buddy: independent QA and review

2026-10-27 08:10 IST. Local/unpublished. This specialist authored no application implementation; app code was independently inspected after the Mobile Developer's final freeze. Preflight/report work was the specialist's only tracked-write responsibility before QA.

## Frozen snapshot

Mobile base `955ecac21ae554ae428c9efb36d2f8ab6406e935`; prior dirty Jump/Run and Story/live-map prototype preserved. Four-file snapshot SHA256 **2d13160b83024ab42cbfe15367f81773293d43e444f277188b4ff756126deab5**, computed by SHA256 over each ordered relative path + NUL + raw file bytes + NUL:

1. `src/components/discovery/globe/traveling-buddy.tsx`: `96D74EE54A95ED023C83D7CC451C6E49BCE04FBD538BA234081395A222867007`
2. `src/components/discovery/globe/journey-overlays.tsx`: `AB518020FC6AEFB21F53542A6229CD2A48D93F35CB188B6B9E431812B1F28E1C`
3. `src/components/discovery/globe/native-globe.tsx`: `DD07696F098C9E652E50C9226EA14A5FAF7CAE45372B5E85D275E26550077EDC`
4. `tests/home-walking-buddy.test.mjs`: `96398B48A766644A6EF549E52DC6D71440F25EAFF7C52CBC1C3B179B4E8BEAC1`

## Independent automated QA

**155 unique checks passed (160 executions, five duplicated baseline harness checks)** against the final source snapshot. Suites: home-walking-buddy, discovery-globe, discovery-camera-motion, home-polish, buddy-map, journey-buddy and journey-buddy-floating. Two additional QA-only component tests verify actual walk sprite frame advance/wrap independent of movement and a decoded image failing during active motion cancels animation, releases ownership and rejects stale progress/completion.

QA used `.local-tests/home-walking-buddy-qa/`: isolated copied current Mobile src/tests, linked existing D:/JBuild node_modules and read-only bundled assets, no dependency installation or original source modification. The six final implementation checks were copied as home-walking-buddy-final.test.mjs; the earlier five-check test copy plus two QA additions ran separately. Command inside snapshot: `node --test tests/home-walking-buddy-final.test.mjs tests/home-walking-buddy.test.mjs tests/discovery-globe.test.mjs tests/discovery-camera-motion.test.mjs tests/home-polish.test.mjs tests/buddy-map.test.mjs tests/journey-buddy.test.mjs tests/journey-buddy-floating.test.mjs`.

Verified mocked/component behavior: decode plus positive layout before ownership; frame cropping advances and loops; coordinate interpolation; stop idle/dwell; directional facing including date line; original camera fit/order/missing/coincident/date-line handling; one presentation owner; suppression/unmount cleanup; obsolete callbacks; decode/timeout plane fallback; Home opt-in only; current reduced-motion/focus/background gates; existing Story comparison/playback, quiet live marker, floating geometry/help and Jump/Run preservation.

Initial attempts in Mobile failed dependency setup (missing TypeScript/@types/node); initial runtime broad run used stale tests. Neither is an application failure nor counted as a final pass. An intermediate isolated run omitted assets and failed three ENOENT assertions; assets linkage corrected this, and the full final run passed. A QA assertion initially distinguished negative zero from zero; corrected the assertion, without changing application code. `git diff --check` passes with only existing CRLF conversion notices. Parent Architect owns final TypeScript/lint and native verification; those are not claimed as independently run here.

## Independent code review

Read the Code Reviewer role instructions and independently reviewed the four frozen files plus existing use-map-buddy, playback and animation contracts. **No actionable findings** after final TypeScript prop and facing corrections. Home/Create opt-in boundaries, no added backend access, bounded local artwork decoding, native view annotation instead of flattened style artwork, subscription/timer cleanup, touch pass-through, fallback and stale-callback handling were inspected. The new marker reuses the existing authoritative focus/reduced-motion playback gate and map-presentation ownership rather than changing stored preference or GPS data.

This is independent review of another specialist's application implementation, performed sequentially by the QA/preflight specialist due the two-specialist concurrency limit; it is not a separate third reviewer thread.

## Physical-device limits

Native rendering, actual Mapbox MarkerView sprite animation and movement, touch pass-through, stop pause visibility, repeat Locate/card switching, larger font/TalkBack, background/reentry, performance and battery are **pending this specialist's verification**. Parent Architect is handling device checks separately. Harnesses and catalog evidence do not establish native visual correctness. No live saves, uploads or database writes are needed to inspect Locate on an existing public journey.

No commits, pushes, deployment, dependency changes or live Supabase writes were performed by this specialist. Files changed: preflight acceptance and this report; ignored QA snapshot/output only.
