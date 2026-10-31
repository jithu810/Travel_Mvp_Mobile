# Email-first registration independent QA

QA Tester / 2026-10-31 / local unpublished snapshot based on `b154220dbffb71ec120f51118be8815c03a74c6d`, branch `feature/backlog-phase1`. Sensitive authentication scope. No live requests, account mutation, email delivery, device operations, deployment or secret access performed by QA.

## Result

No blocking acceptance issue found in the tested local scope. Existing-email checks lead directly to sign-in with the entered email retained; new-email checks alone reveal display name/password. Failed or malformed checks remain on email with retry. Sign-in continues to use email/password. Existing component coverage also exercises invalid input before lookup, Enter/Continue parity, duplicate request locks, mode/back/input disabling, late lookup results after blur/refocus, password clearing, final signup payload, intent/session return destinations, outages and explicit duplicate signup errors.

Reviewed and reused implementer results against matching SHA256 snapshots: 40 mobile auth/adapter/model/intent tests and 5 backend tests passed; repository TypeScript, scoped ESLint and diff whitespace checks passed. Backend suite includes a disposable loopback PostgreSQL cluster, synthetic users, anon/authenticated denial, service-role lookup, SSO/case/whitespace handling, expiry/global quotas, concurrent eight requests admitting exactly three, and no Auth-user mutation. QA did not repeat that costly identical cluster run or unrelated repository suites.

Independent execution added `tests/email-registration-qa.test.mjs`: **2/2 pass**. These run the actual transpiled Edge handler through a synthetic Functions HTTP response into the actual Mobile query adapter. Both existing/new results, server case normalization and stable HMAC keys passed. Quota denial, thrown backend failure and malformed RPC responses all reject rather than indicate a new email; internal error text stays hidden. The test client has only a Functions port, so signup is not invoked. New-test scoped ESLint and diff whitespace checks passed.

## Snapshot identification

| Path | SHA256 |
| --- | --- |
| src/app/auth.tsx | CFFC5157E298ED8C038F20847FE7CB3C66C029D3DFAD386BCDE3CA8DCEA6DE0C |
| src/lib/auth/model.ts | EEC11C292FBA59095CE5EBFCAC52598649730D798A2DD122D9C79CDEA4A64EF9 |
| src/lib/auth/queries.ts | 9ED44263B8685917A15C59CAD893F97B446DF23387AC2B6C62AECEC6C1F4A0E4 |
| tests/auth-screen.test.mjs | D1B70E895DD37E7BCC291F47B1BAF9833F38C85A5C8D45F3810BCEE3EDE3B126 |
| tests/auth-remix.test.mjs | 880533CD72086F2E8342E966CC96D422FFDB060534ADAD7FE4B2CD39B349D862 |
| tests/email-registration-query.test.mjs | 3BF7EA545653E8CD2C282B9AA8942749420B4F3EC0113ED0A8F59FE0582C02D7 |
| backend/email-registration/rollout-proposal.sql | 7FE699F5CC3B4818CD62EE2C8715E5E1D75897B56210B4A2058A88E778D78CBD |
| backend/email-registration/handler.ts | 419E6F1F681EA317A47DC043AA628640C92CAEE3E6AC57D37206024327DBABF0 |
| backend/email-registration/index.js | 7A4AEABEFC8264D399BB66BD0E221C007A8D7A55136F93E56B71DED3501DC2FE |
| tests/email-registration-backend.test.mjs | 50B33E697950BE7142CEC36E2DA3837BD65F074565AE0309CF944BBA6FDC5255 |
| tests/email-registration-qa.test.mjs | BD0B4EE6DF6307393E79947BE1FC3942CC6DD19B45B2C6B1E260156B1CEFF752 |

## Limits and rollout gates

No native/emulator/physical-device or hosted Deno execution evidence. The live endpoint is absent until separately approved SQL rollout, server-secret provisioning and Function deployment/configuration. Consequently this local Mobile change must not be described as working against production yet; without the endpoint it intentionally stays on email with an error. Real SDK gateway behavior, Deno module/runtime compatibility, deployed permissions and phone keyboard/layout/branching remain unverified.

Membership disclosure is inherent in the requested immediate branch. Pilot global minute/day and HMAC-email quotas limit disclosure but allow distributed enumeration within quotas and quota-exhaustion denial of service; no per-IP limiter/CAPTCHA is claimed. Full Auth email scan is explicitly bounded to current pilot size and requires reassessment for growth. Existing provider-only/unconfirmed accounts count as registered; the flow does not provide password recovery or provider sign-in. Independent source/security review is a separate Architect-owned result.
