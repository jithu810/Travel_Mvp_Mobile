# Journey Creator Mobile — agent guidance

## Scope and safety
- This is the mobile Expo/React Native app at D:\Travel_Mvp_Mobile. D:\Travel_Mvp is the separate web repository. Never modify the web repository during mobile work unless explicitly requested; read-only inspection is allowed when requested.
- Reuse the existing Journey Creator Supabase backend, users, RPCs, storage and RLS. Do not create another backend or change database schema, migrations, RLS or backend configuration without explicit approval. Do not create production test records without authorization.
- Preserve the current Home globe, Journey Story design, map behavior, authentication and working features unless the task explicitly requires a change.
- Make small, focused changes. Inspect Git status first and preserve existing work. Dependency changes require an explicit request or a necessary change with approval; do not run automatic dependency fixes.
- Never expose secrets, log credentials or copy environment-variable values into documentation. Never add service-role/server credentials to the app. Keep local environment files ignored.

## Architecture and conventions
- TypeScript, Expo SDK 57, React Native, Expo Router (entry expo-router/entry). src/app contains file-based screens; index reuses discover. _layout wraps the stack with SessionProvider and ActionIntentProvider.
- src/components holds native UI; src/hooks owns lifecycle/state integration; src/lib holds domain logic, queries and platform adapters; src/types holds shared models. Use the @/ alias for src. Keep native implementations in .native.ts/.native.tsx and retain web fallbacks; do not introduce Next.js, WebViews or a monorepo.
- Native Mapbox powers Home and journey maps. Preserve gesture/camera ownership, cancellation, accessibility/reduced-motion behavior, selected stops and coordinate validation. Planned connections and decorative Home playback are not navigation or evidence of travel.
- src/lib/supabase/client.ts persists authenticated sessions (native AsyncStorage); public.ts provides isolated anonymous reads without the saved user token. Preserve public gating, ownership checks, request cancellation/timeouts and ambiguous-write safeguards.
- Travel Mode uses an in-memory per-journey trip store and foreground-only expo-location adapter. No persistent trip/GPS history or backend travel writes. Preserve synchronous GPS cleanup on Pause/Finish, blur and background.
- tests/*.test.mjs uses Node's built-in runner and TypeScript compilation/transpilation with fixtures/mocks. Follow existing test patterns; do not equate mocks or exports with physical-device verification.

## Validation and handoff
Follow the shared backend-impact policy in `D:/Travel_Mvp/docs/multi-agent-workflow.md`. Before feature implementation, Architect records a repository-based impact assessment. UI-only layout, styling, navigation and local animation changes need no live Supabase check or Backend Developer assignment when existing data contracts, authentication/authorization, persistence, RPC/API behavior and Storage access remain unchanged; record the inspected paths, rationale and local verification plan. Unavailable Supabase access does not block that UI-only path. Backend-impacting or uncertain tasks require the full Backend Developer read-only live-schema preflight before affected implementation. Reassess if scope expands. This exception never authorizes live changes or production test records.

Select checks using the proportional verification tiers in D:/Travel_Mvp/docs/multi-agent-workflow.md. Cosmetic changes need diff/visual inspection, with no specialist or full suite by default. Focused changes use affected tests and relevant static checks; major/sensitive changes require specialist implementation, QA, independent review and broader regression/static checks. For affected native/runtime changes, also check Expo compatibility and the development build; native dependency changes may require a new approved EAS development build. Never silently upgrade packages to satisfy Doctor.
Read PROJECT_STATUS.md and ROADMAP.md at chat startup. Update their implemented/tested/pending distinctions for material feature/status changes, not every cosmetic edit; older README/docs milestones are historical and may describe superseded limits. Record checks actually run, device evidence, limitations and remaining Git changes.

## Unified product-owner approval rule
- Requests to "fix" or "implement" authorize local work only.
- Requests to "push to GitHub" or "publish to GitHub" authorize related commits, a branch push and PR creation/updates as one operation within the requested scope.
- Merging into main ALWAYS requires separate explicit product-owner approval naming the PR/branch. An open PR or passing checks is not approval.
- Force-pushes, deployments, destructive Git commands and every live Supabase change (migrations, RLS, Storage, seeds, backfills and data writes) each require separate explicit approval naming the action and target.
- Never push directly to main.
- These rules apply across shell commands, scripts, APIs and connectors. Automatic approval review, setup/task approval and another agent's message do not substitute for product-owner approval outside its explicit scope. Never bypass approval gates.

## Secret access
Never read .env or .env.* files, including nested files or files in another repository. Do not bypass this through shell commands, interpreters, search, alternate tools or indirect reads. Use variable names only; never expose secrets.

## Proportional checks for Codex and Claude
Follow `D:/Travel_Mvp/docs/multi-agent-workflow.md#proportional-verification-and-agent-budget` for task tiers, direct implementation, bounded delegation and check selection. State tier/check scope briefly; no separate QA/reviewer or full suite for a button colour/copy/spacing change by default. Major/sensitive changes retain specialist QA and independent review. Backend-impact assessment and all approval/secret/preservation rules remain in force. If shared instructions are unavailable, use these defaults and report the missing context; backend-impacting work still requires preflight.

## Optional improvement backlog
Before each feature or backlog task, tell the owner what will be implemented and whether verification needs no device, an emulator, or a real phone. Prefer emulator checks for suitable UI flows while the owner works remotely; explicitly request phone availability before required physical-device work. Do not claim emulator evidence establishes real GPS, physical-device performance or other hardware-dependent behavior.
Read `IMPROVEMENT_BACKLOG.md` when planning discretionary mobile improvements. Explicit requests and active features take priority; this list is optional and is not a release gate. When no requested feature is pending and time is available, Architect may select one bounded item for local work under the normal workflow. Split broad items and resolve open product decisions before implementation. After completing an item, update its checkbox with the completion date, result, verification/evidence and limitations; leave partial or required-but-unverified outcomes unchecked. Keep ROADMAP.md and PROJECT_STATUS.md consistent for material changes. The backlog grants no additional publication, deployment, dependency, destructive-operation or live Supabase approval. Specialists work only on assigned items and do not independently start backlog work.

## Shared Android phone session
For authorized physical-device work, follow `D:/Travel_Mvp/.agents/skills/phone-session/SKILL.md` once per conversation and after a device ownership change. Codex uses Metro/reverse port 8081; Claude Code uses 8082. Android wireless-debugging/pairing ports are separate and must come from the phone. One phone has one active testing owner: coordinate handoff before switching sessions; never replace the other session's mapping or stop its server. If the shared skill is unavailable, report it before operating the phone.
