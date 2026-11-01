# Explore final QA

QA Tester, 2026-11-01. Mobile baseline `0ee9d92`, local unpublished Explore work preserved. QA owns this report and assigned test changes only; no app edits, environment-file reads, phone/emulator operations, live writes, Git publication or deployment.

## Completed checks

- `npm.cmd run typecheck`: **passed**, exit 0.
- `npm.cmd test`: **1,013 tests; 1,011 passed, two failed**, zero skipped. Shared signed URL behavior affects Home, Explore, Saved, Story and detail/image callers, so a full repository regression was warranted. The only failures were unchanged disposable PostgreSQL tests: `tests/email-registration-backend.test.mjs` and `tests/thumbnail-policy.test.mjs`. Both failed starting `pg_ctl` with Windows restricted-token error 87 / start-server error 3 inside the sandbox, before SQL assertions.
- After read-only inspection verified each test creates a new local `.local-tests/` cluster, binds loopback on an allocated port, and makes no hosted connection, reran `node --test tests/thumbnail-policy.test.mjs tests/email-registration-backend.test.mjs` outside the sandbox: **6/6 passed**, including both previously blocked database tests. No test code/config was changed to obtain the pass. These rerun results resolve the two environment failures; the full suite itself was not rerun or misreported as one all-green execution.

The full run covers Home/Story/Saved/navigation, search/focus/refresh, signed cache coalescing/expiry/cancellation, thumbnail path eligibility and opt-in generation, photo preparation/upload model behavior, fallback consumers, backfill preparation, isolated policy checks, and unrelated existing regressions. Native delivery/performance evidence remains Architect-owned; see `explore-optimization-2026-11-01.md` and `explore-optimization-qa-2026-11-01.md`.

## Repository lint diagnosis

Initial `npm.cmd run lint` (unmodified `eslint . --max-warnings=0`) completed with **19 errors and one warning**, all under pre-existing `.local-tests/` copied QA/build sources. They refer to removed old companion/Three.js modules and old journey controls, plus one unused diagnostic variable. No failure was emitted for live `src/`, `tests/`, or `scripts/`. Read-only inspection of the config and installed ESLint API confirms the existing `dist/*` and `.expo/*` patterns exclude generated bundle/type examples; normal source is included.

A temporary diagnostic run using the same ESLint command with `--debug` showed repeated config resolution for every generated PostgreSQL relation file beneath dozens of pre-existing `.local-tests/thumbnail-policy-*/data/` clusters. These are not application source or lintable JavaScript, but directory enumeration/config checks consume substantial CPU/memory. The duplicate diagnostic process was stopped after identifying the cause. Temporary debug output is under gitignored `.local-tests/`.

Architect explicitly expanded QA ownership to `eslint.config.js` to correct this generated-artifact scope issue. The only change is adding `.local-tests/**` to the existing global ignore list; existing `dist/*`, `.expo/*` and every source/test lint rule remain unchanged. No generated directory was moved/deleted. ESLint API checks verify a copied `.local-tests/` source is now ignored while `src/app/search.tsx` and `tests/backfill-preparation.test.mjs` remain included. Python files were already outside ESLint's language scope and retain their own tests.

Repository-wide `npm.cmd run lint` rerun **passed**, exit 0, zero warnings/errors, with its original `eslint . --max-warnings=0` command. No scoped command was substituted for this result.

## Final backfill/configuration changes

After Backend Developer finished bounded JPEG-compatible MPO support, QA ran `node --test tests/backfill-preparation.test.mjs tests/image-variants.test.mjs tests/explore-optimization-qa.test.mjs`: **9/9 passed**, zero skipped. Five preparer cases include MPO primary-frame thumbnail generation while preserving byte-identical originals, no overwrites, traversal/malformed/mismatched-format rejection and destination collision rejection. These are local synthetic fixtures; no private image or production download/write was performed by QA.

Parsed `eas.json` with Node and asserted `EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED` is string `true` in development, preview and production profiles: **all three passed**. This verifies repository build configuration only, not a deployed production bundle. `git diff --check` passed after these final changes. TypeScript-affecting app files have not changed since the passing typecheck.

## Result

Final TypeScript and repository-wide lint pass. Full-suite non-database tests passed; both sandbox-blocked disposable PostgreSQL tests passed in the explicit outside-sandbox rerun. The subsequent MPO preparer change passed its affected regressions. No introduced failure remains in the tested snapshot. This is combined evidence from a full run plus targeted environment-resolution/final-change runs, not a fabricated single all-green full-suite execution. No production changes or publication were performed by QA.
