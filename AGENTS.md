# Journey Creator Mobile — agent guidance

## Scope and safety
- This is the mobile Expo/React Native app at D:\Travel_Mvp_Mobile. D:\Travel_Mvp is the separate web repository. Never modify the web repository during mobile work unless explicitly requested; read-only inspection is allowed when requested.
- Reuse the existing Journey Creator Supabase backend, users, RPCs, storage and RLS. Do not create another backend or change database schema, migrations, RLS or backend configuration without explicit approval. Do not create production test records without authorization.
- Preserve the current Home globe, Journey Story design, map behavior, authentication and working features unless the task explicitly requires a change.
- Make small, focused changes. Inspect Git status first and preserve existing work. Never commit, push or deploy unless explicitly requested. Dependency changes require an explicit request or a necessary change with approval; do not run automatic dependency fixes.
- Never expose secrets, log credentials or copy environment-variable values into documentation. Never add service-role/server credentials to the app. Keep local environment files ignored.

## Architecture and conventions
- TypeScript, Expo SDK 57, React Native, Expo Router (entry expo-router/entry). src/app contains file-based screens; index reuses discover. _layout wraps the stack with SessionProvider and ActionIntentProvider.
- src/components holds native UI; src/hooks owns lifecycle/state integration; src/lib holds domain logic, queries and platform adapters; src/types holds shared models. Use the @/ alias for src. Keep native implementations in .native.ts/.native.tsx and retain web fallbacks; do not introduce Next.js, WebViews or a monorepo.
- Native Mapbox powers Home and journey maps. Preserve gesture/camera ownership, cancellation, accessibility/reduced-motion behavior, selected stops and coordinate validation. Planned connections and decorative Home playback are not navigation or evidence of travel.
- src/lib/supabase/client.ts persists authenticated sessions (native AsyncStorage); public.ts provides isolated anonymous reads without the saved user token. Preserve public gating, ownership checks, request cancellation/timeouts and ambiguous-write safeguards.
- Travel Mode uses an in-memory per-journey trip store and foreground-only expo-location adapter. No persistent trip/GPS history or backend travel writes. Preserve synchronous GPS cleanup on Pause/Finish, blur and background.
- tests/*.test.mjs uses Node's built-in runner and TypeScript compilation/transpilation with fixtures/mocks. Follow existing test patterns; do not equate mocks or exports with physical-device verification.

## Validation and handoff
Run relevant tests, npm run typecheck and npm run lint for application changes. For native/runtime changes, also check Expo compatibility and the development build; native dependency changes may require a new approved EAS development build. Never silently upgrade packages to satisfy Doctor.
Read PROJECT_STATUS.md and ROADMAP.md at chat startup. Update their implemented/tested/pending distinctions when work changes; older README/docs milestones are historical and may describe superseded limits. Record checks actually run, device evidence, limitations and remaining Git changes.
