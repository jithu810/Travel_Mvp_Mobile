# Outdoor Google callback fix

Architect assessment: sensitive authentication change; specialist implementation, affected OAuth/session tests, typecheck/scoped lint, independent QA and review. Baseline: clean main at 13a40b8. Local work only; no publication, build/install or live settings changes authorized.

Backend preflight: Backend Developer inspected active project gwybjhqgnrpouwcdvusi, PostgreSQL 17.11, at 2026-11-01 12:12:26 UTC. Current profile trigger/constraints, profile RLS/grants, account RPC ownership and Storage policies remain UUID/auth.uid() based. No database/RPC/RLS/Storage changes required. Migration history: 13 canonical migrations plus known registration_email_check entry; unrelated reconciliation gap unchanged. No user rows or secrets read.

Owner supplied current Auth Redirect URLs in this conversation: http://localhost:3000/**, https://www.journeycreator.site/**, journeycreator://auth/callback (three entries). This is owner-provided configuration evidence, not independently observed dashboard evidence. Outdoor callback is absent. Inspected canonical and JBuild app.json, JBuild AndroidManifest.xml, src/lib/auth/google-model.ts, google.native.ts, src/app/auth/callback.tsx and auth tests. Canonical app scheme is journeycreator; Outdoor scheme is journeyoutdoor; current OAuth code hardcodes journeycreator.

Gate: released for bounded local callback implementation and isolated tests with current owner-supplied configuration evidence. Live readiness blocked until exact journeyoutdoor://auth/callback redirect is added under separate owner approval and a rebuilt Outdoor is tested. No schema preflight gap affects the local callback change.

Safe plan: derive the callback from trusted installed app configuration; authorize, browser listener and strict parser must agree. Reject cross-app/malformed/error/token-fragment callbacks. Preserve PKCE, pending-flow/deduplication, cancellation and Account/Create/journey destinations. Test both app identities with synthetic callbacks and existing session tests. No real login or live writes in automated tests. Rebuilt artifact and owner-led real-phone Google login remain required. No emulator planned. Rollback is a local diff reversal of this bounded change only; no data migration.

Implemented locally: native adapter resolves the callback from trusted Expo scheme configuration. Authorization, browser listener and strict parser share that exact callback. Development stays on journeycreator; Outdoor uses journeyoutdoor. Unknown/missing/ambiguous configuration disables Google safely, and cross-app callbacks fail closed. Existing email, PKCE and destinations remain unchanged.

Verification: 61/61 affected tests across google-native, google-callback, google-oauth-qa, auth-screen and auth-remix pass. TypeScript, scoped ESLint and whitespace checks pass. Full logs retained under ignored .local-tests/outdoor-google-callback. Independent QA and Code Reviewer confirmed the same snapshot and found no actionable issues; both reused passing evidence without duplicate suite runs. No full suite needed for the bounded adapter/model change.

Reviewed SHA256: model 47B1F3F14672356E979C5267FDA5EA4388E782CA64D712A33B3BC5AE2F2DD044; native 95515730E242CBF0E38E0F069B05FE433FE0AEB38BD309BC98DA1A23592DBBAD; test 86D1A50FA02AC8F8E58C518D30AC47FBEF0A6BEF2E7A1310B5572D2617C31535.

Delivery: local/unpublished. No JBuild sync, build/install, hosted change, phone login or emulator test. Owner requested no build and reports prior development login success. Outdoor end-to-end verification remains pending exact hosted redirect approval/addition and a future updated Outdoor build. No GitHub links because nothing published.
