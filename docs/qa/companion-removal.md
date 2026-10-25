# 3D Travel Companion removal QA

QA Tester, 2026-10-25 17:00 IST (11:30 UTC). Local/unpublished on `codex/remove-3d-companion`; starting revision `7029fc85511a72678509ae364352d8d57c2d910d`.

## Tested snapshot and scope

Application diff SHA-256: `adcacb84bfe1aa3e900af24e60a8e963a2d4635a32fd7f609d60c7bda6bfc714`. Computed from `git diff --binary 7029fc8 --` restricted to the 28 application, asset, script, test, manifest and Metro paths changed for removal; status/preflight/QA documents are excluded. This matches the independent review snapshot supplied by Architect.

| Existing changed file | SHA-256 |
| --- | --- |
| package.json | af0ac924afe3bf95c6682feca07c6fe00c2b5bdc4df583aa1cfae531425ab7f8 |
| package-lock.json | 2977d37d86259f1be21e3b32df8580aa3e5a5a3366cbd00eb2e716931b3aa9ec |
| metro.config.js | 1b801de05c908cc3d91b95d8e4f271e0bcb43c63cf40339f9813f3fbf73cc72c |
| src/app/discover.tsx | 2e12c9cee59048dc3ed4c2d38aec6c929eedd6a0acd384f759e0643dc7e89f30 |
| src/components/floating-navigation.tsx | 2242caa40ba8d6a6bcbc2594522f154eed3f4e882d624923acb133467594b83b |
| tests/home-polish.test.mjs | c089e69441a8413228a89e59f3df031f861227fa791977b93ed9c8b8c7a78a3b |

Static QA found no actionable defects. The diff removes the local model/texture/licenses, preparation script, renderer, animation/preference/lifecycle utilities, unused navigation guide and five dedicated companion test files. Home's loading, live globe and navigation regression coverage remains. Searches across current source/scripts/tests/config found no named character runtime references. Generic trip companions and photo-thumbnail companions remain outside this removal.

Lockfile comparison with baseline: 19 dedicated dependency records removed, no new records, and all retained package records unchanged except root dependency declarations. `expo-asset` remains transitively required by Expo. `npm ls --all --depth=0` passes; installed `three`, `@react-three/fiber`, `expo-gl` and `@types/three` are absent.

## Checks and results

- `npm test`: 628 tests, 627 passed, one failed, zero skipped. The sole failure was `tests/thumbnail-policy.test.mjs` because sandboxed Windows `pg_ctl` could not create a restricted token (error 87 / server-start error 3). The test uses a new disposable local PostgreSQL cluster and synthetic fixtures; no hosted database writes.
- Architect reran `node --test tests/thumbnail-policy.test.mjs` outside the sandbox: 1/1 passed in 47,272 ms, including public/owner/other/path/rollback boundaries. Therefore all 628 cases passed across the original run and focused retry; this is not a claim of one entirely green full-suite invocation.
- Mobile Developer reports focused Home tests 15/15, TypeScript and whitespace checks passed.
- Mobile Developer reports scoped lint `npm run lint -- --ignore-pattern .local-tests/**` passed with zero warnings. Full `npm run lint` encountered 16 stale imports in preserved, ignored `.local-tests/publication/{claude-code-setup,part-a}` snapshots of the removed feature. These local artifacts were not deleted or changed; no lint configuration was altered to conceal them.
- Installed Expo CLI offline compatibility check passed: dependencies up to date. Expo explicitly warns dependency validation is unreliable offline; no online compatibility claim or package upgrades.
- Android export passed using installed Expo CLI with `EXPO_NO_DOTENV=1`, `EXPO_OFFLINE=1`, `export --platform android --output-dir .expo/companion-removal-export --source-maps --dump-assetmap --max-workers 2`. No environment files were loaded.

## Android export evidence

Output is local, gitignored `.expo/companion-removal-export` (not a remotely accessible evidence link). Export bundled 1,698 modules and 53 assets. Hermes bundle `entry-70f34c0c12ae19c1e4ff6781b027397d.hbc` is 4,018,868 bytes; its map is 9,463,305 bytes.

Actual source-map inventory contains 1,671 sources. No `three`, `@react-three`, `expo-gl`, companion directories/hooks, explorer GLB or texture sources were found. Asset map contains no explorer model/texture/character paths or GLB assets. Home `/src/app/discover.tsx`, native `/src/components/discovery/globe/discovery-globe.native.tsx` and 128 Mapbox sources remain present.

Independent Code Reviewer reported no actionable findings against the matching application diff hash. Backend preflight is recorded in `docs/companion-removal-preflight.md`; no backend changes were required or applied.

## Limitations and publication

Physical Android verification is pending: phone-session check found no connected device and Metro down. No device model, Android version, installed build, permissions, network/GPS state or native-screen behavior could be verified. Export and mocked tests do not establish native-device acceptance. iOS checks and a new native build were not performed. An existing development client may retain unused ExpoGL until a separately approved future native rebuild.

No environment files, user records or secrets were read; no live-service writes, EAS builds, Git commits/pushes/merges or deployments were performed by QA. All work and evidence remain local/unpublished.
