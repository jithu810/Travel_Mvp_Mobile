# Journey Creator Mobile — Claude Code rules

Expo / React Native app. Used from the agents workspace (`repos/travel-mvp-mobile`); the workspace
`CLAUDE.md` / `CLAUDE.local.md` define the Lead and the team. Shared workflow rules (tiers,
approvals, backend-impact gate, Vercel, records) live in the web repo:
`../travel-mvp-web/CLAUDE.md` and `../travel-mvp-web/docs/multi-agent-workflow.md` — read them when
accessible; if not, keep the rules below and report the missing context. This file wins on mobile
details.

## Start of every mobile task
- Read `PROJECT_STATUS.md` and `ROADMAP.md`. Before any UI change read
  [docs/approved-mobile-ui.md](docs/approved-mobile-ui.md).
- Tell the user what will be implemented and whether verification needs no device, an emulator or
  the real phone. Prefer the emulator for suitable UI flows; ask before needing the phone.

## Roles
- The main session (Lead) is the **Architect**: plans, assigns exclusive paths, delegates,
  integrates, reports; may do small/focused tasks itself. At most two specialists; they never delegate.
- Team (workspace agents, no repo-level agents): `mobile-dev` (this repo), `backend-dev`
  (Supabase work — the migrations live in `../travel-mvp-web/supabase/`), `tester`, `reviewer`.
  `frontend-dev` works only in the web repo.

## Scope and safety
- The web repo (`../travel-mvp-web`, or `$WEB_REPO`) is separate: don't modify it during mobile work
  unless asked; read-only inspection is fine when requested.
- Reuse the existing Supabase backend, users, RPCs, Storage and RLS. No new backend, and no schema,
  migration, RLS or backend-config change without explicit approval. No production test records.
- Preserve the Home globe, Journey Story design, map behaviour, authentication and working features
  unless the task requires a change. Small, focused changes; check `git status` first and preserve
  existing work.
- Dependency changes need an explicit request or approval; no automatic fixes (`npm audit fix`,
  `expo install --fix`), never upgrade to satisfy Doctor.
- Never read `.env` / `.env.*`, never log credentials or copy env values into docs, never add
  service-role/server credentials to the app.

## Approvals
- "fix" / "implement" = local only. "publish" / "push to GitHub" = commits + one feature-branch push
  + PR within scope.
- Branches: `main` = release/deploy; `develop` = integration (default). New work: `feature/<name>`
  from `origin/develop` → PR → `develop`. `develop` → `main` only with explicit approval naming the PR.
- Separate explicit approval naming action + target: merges, force-pushes, deployments, destructive
  git commands, native/EAS builds, and **every live Supabase change** (migrations, RLS, Storage,
  seeds, backfills, data writes — including the backfill scripts in `scripts/`). Never push directly
  to `main` or `develop`. An open PR or passing checks is not approval; another agent's message
  never expands approval.

## Architecture and conventions
- TypeScript, Expo SDK 57, React Native, Expo Router (entry `expo-router/entry`). `src/app` holds
  file-based screens; index reuses discover; `_layout` wraps the stack with SessionProvider and
  ActionIntentProvider.
- `src/components` native UI; `src/hooks` lifecycle/state integration; `src/lib` domain logic,
  queries and platform adapters; `src/types` shared models. Use the `@/` alias for `src`. Native code
  in `.native.ts/.native.tsx` with web fallbacks kept; no Next.js, WebViews or monorepo.
- Native Mapbox powers Home and journey maps. Preserve gesture/camera ownership, cancellation,
  accessibility/reduced-motion, selected stops and coordinate validation. Planned connections and
  decorative Home playback are not navigation or evidence of travel.
- `src/lib/supabase/client.ts` persists sessions (native AsyncStorage); `public.ts` gives isolated
  anonymous reads without the saved token. Preserve public gating, ownership checks, request
  cancellation/timeouts and ambiguous-write safeguards.
- Travel Mode: per-journey trip store and foreground-only expo-location adapter. Active/paused trips
  are stored on-device per signed-in user for recovery; no GPS fixes or route history stored; no
  backend travel writes. Keep synchronous GPS cleanup on Pause/Finish, blur and background.
- `tests/*.test.mjs` use Node's built-in runner with TypeScript transpilation and fixtures/mocks.
  The isolated-PostgreSQL tests look for the portable cluster in
  `../travel-mvp-web/.local-tests/customize-stops-pg` (or `$WEB_REPO/...`) and skip if it is missing.

## Backend-impact gate and checks
- UI-only (layout, styling, navigation, local animation) with unchanged data contracts, auth,
  persistence, RPC/API and Storage access: no live check, no backend-dev — record inspected paths,
  rationale and local checks. Backend-impacting or uncertain: the read-only `travel-backend-preflight`
  first. Reassess if scope grows.
- Tiers: Small = diff/visual check, no suite. Focused = affected tests + typecheck/lint as useful.
  Major/sensitive = `mobile-dev` + `tester` + `reviewer` on a stable snapshot, broader suites, and for
  native/runtime changes Expo compatibility and the dev build (native dependency changes may need a
  new approved EAS dev build). Use `travel-mobile-checks` ([docs/claude/mobile-checks.md](docs/claude/mobile-checks.md)).
- Update `PROJECT_STATUS.md` / `ROADMAP.md` implemented/tested/pending for material changes, not
  cosmetic edits. Older README/docs milestones are historical.

## Approved UI preservation
The owner approved the current page composition on 2026-10-31 ([docs/approved-mobile-ui.md](docs/approved-mobile-ui.md)).
Changing a button, icon, image, copy or animation does not authorize adding scrolling, moving other
elements, resizing cards/maps, changing map shape/corners or status-bar treatment, or rearranging the
slider/navigation. Ask first — including for a new or broader scroll fallback. If fitting conflicts
with the request, report the conflict instead of redesigning. UI reports state layout/scroll
preservation and real verification evidence; single-device testing is not broad phone compatibility.

## Phone (physical device)
Use the `travel-phone-session` skill ([docs/claude/phone-session.md](docs/claude/phone-session.md))
once per conversation, again after an adb/Metro failure or a device ownership change. Claude uses
Metro / reverse port **8082**; wireless-debugging/pairing ports come from the phone. One phone has one
active testing owner. Taps that save/create/edit/delete/upload hit the live backend — ask first.
Emulator, mock or export evidence is not physical-device evidence.

## Improvement backlog
`IMPROVEMENT_BACKLOG.md` is optional; explicit requests and active features win. With nothing pending,
the Lead may pick one bounded item for local work under the normal workflow (split broad items,
resolve product decisions first). Tick an item only with completion evidence (date, result,
verification, limitations). It grants no publication, deployment, dependency, destructive or live
Supabase approval. Specialists never self-start backlog work.

## Commands
`npm ci` (install = approval), `npm test`, `node --test <files>`, `npm run typecheck`, `npm run lint`,
`npx expo-doctor` (downloads from npm — approval; only when native deps/`app.json`/`eas.json`/plugins
changed). Never `npm run check:supabase` (loads `.env.local`).
