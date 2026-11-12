# Mobile checks

Used by the workspace `travel-mobile-checks` skill. Optional focus (test file or area) from the caller.

Run in this repo. Report results only — don't edit files, fix dependencies or run `npm audit fix` /
`expo install --fix`.

## Steps
1. Record `git rev-parse --short HEAD` and `git status --short --branch`.
2. Pick checks by tier (see [CLAUDE.md](../../CLAUDE.md)); an explicit request for more wins:
   - Small cosmetic: inspect the diff and visuals where useful; no tests/typecheck/lint.
   - Focused: affected `node --test <files>`; `npm run typecheck` for TS contract changes; scoped lint.
   - Major/sensitive: relevant regression/integration checks, typecheck and lint; `npm test` for broad
     impact or uncertain coverage; device/build checks for affected native behaviour.
   - Reuse passing checks on an unchanged snapshot; after fixes rerun affected checks only. Report
     unrelated baseline failures separately.
3. `npx expo-doctor` only when native dependencies, `app.json`, `eas.json` or plugins changed, and only
   with the user's approval (it downloads from npm). Report its advice; never upgrade to satisfy it.
4. Never run `npm run check:supabase` (loads `.env.local`).

## Output
```text
Repo / revision / dirty files:
tests:           not run (reason) | pass | fail (N passed, M failed) — first failure: <file:line message>
typecheck:       not run (reason) | pass | fail — first error: <file:line message>
lint:            not run (reason) | pass | fail — first error: <file:line rule>
expo-doctor:     not run | pass | warnings: <summary>
Not verified:    physical-device behaviour (pending unless tested on the phone)
```

Mocks, exports and these checks don't prove native-device behaviour. Report device verification as done
only with device evidence or the user's confirmation; otherwise pending (or not applicable for docs-only).
