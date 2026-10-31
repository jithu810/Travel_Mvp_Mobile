# Google account chooser follow-up — 2026-10-31

## Latest owner device confirmation

On 2026-10-31, after Google reported branding verified/published and Codex reopened Journey Google Test through Metro8081 on CPH2813/Android16, the owner confirmed the flow worked and said login now asks to sign in with "travel buddy". The configured OAuth branding is Journey Buddy. Record this as **owner-reported successful branded Google sign-in**, replacing the Supabase project hostname in the reported login prompt; the agent did not capture this consent screen or perform the live sign-in.

This confirmation does not separately establish the exact branding spelling, repeated account selection after sign-out, switching to a different account, same-email identity linking, cancellation, or restart persistence. Those broader cases remain pending specific evidence. No additional app changes or tests were needed for this documentation checkpoint. Earlier pending statements below are historical except for these remaining cases. Mobile changes remain local/unpublished.

Owner reports successful physical-device first Google consent/login, sign-out, then Google from registration silently reusing the browser account. This is owner-reported evidence; identity linking, all cancellation paths and persistence are not independently verified.

## Scope and baseline

- Preserve the complete local unpublished Google implementation/build/docs baseline on `feature/backlog-phase1` at `a8f0c74` (tracked status/roadmap/manifests/auth/tests modified; Google helper/callback/tests and QA reports untracked). No unrelated work overwritten.
- Sensitive auth initiation follow-up, bounded to adding Google's account-selection prompt to the existing shared native OAuth request. No new native popup, dependency, rebuild, live configuration, signup/sign-in, database changes or publication.
- Inspected `src/lib/auth/google.native.ts`, `tests/google-native.test.mjs`, prior task/preflight reports and current Google OpenID Connect prompt documentation. Existing PKCE, flow ID, callback validation, session exchange, sign-out, profile creation and ownership rules stay unchanged.
- Backend delta assessment requested from Backend Developer; affected edits paused pending its recommendation. Reuse existing full read-only preflight for unchanged schema/RPC/RLS/Storage scope unless material drift/risk is found.
- Exclusive implementation ownership: Mobile Developer, native adapter and its test only. Architect owns this note and product status. QA/reviewer read-only except assigned QA report updates.
- Verification: exact OAuth request plus repeated attempts request account chooser, existing Google callback/error/cancel tests, TypeScript/scoped lint, targeted independent QA and review. Device chooser display remains pending owner retry through Metro; no real account actions performed by the agent.

Reference: https://developers.google.com/identity/openid-connect/openid-connect (`prompt=select_account`).

Architect gate released after Backend Developer delta review: reuse today's full live preflight, since only the provider UI parameter changes; no material schema/migration/provider-config/PKCE/linking/RPC/RLS/grants/Storage impact. No additional live inspection or hosted change required. Existing backend evidence is reused, not represented as a new schema audit.

Final result: shared native adapter now sends `queryParams: { prompt: 'select_account' }` for every initiation. Developer's 39 affected tests, TypeScript and scoped lint passed; independent QA's six adapter tests and whitespace checks passed. Independent reviewer found no actionable findings; scopes, redirects and PKCE binding remain unchanged, and no extra consent prompt is forced. No additional build, device action, live sign-in or publication performed. Owner should retry through Metro; actual browser account chooser is still unverified by the agent. Browser-based OAuth remains the intended UX, not a native account-picker popup.

## Independent targeted QA

QA inspected the stable native request and repeated-attempt regression, then ran `node --test tests/google-native.test.mjs`: 6/6 passed. The exact request includes `queryParams: { prompt: 'select_account' }` together with the existing Google provider, callback and browser-redirect suppression. The cancellation/retry/next-sign-in test verifies all three new authorization requests include the prompt, the cancelled attempt does not exchange, and successful attempts retain their respective flow IDs. Existing adapter failure, Create/cold return, legacy marker, invalid destination and web fallback cases also pass. `git diff --check` passed.

Prior unchanged callback/email/session evidence is reused; broad suites were not repeated. No application/test edits, environment access, device/Metro operation, build/install, live login or publication by QA. No actionable findings in this local mocked scope. Actual account-chooser display on the owner's device remains pending owner retry; the prior successful Google login is owner-reported, not independent QA evidence.
