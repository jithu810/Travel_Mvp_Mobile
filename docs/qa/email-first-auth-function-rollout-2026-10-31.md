# Registration email function rollout

## Activation completed after owner CLI login

Owner reported "logged in now". Under the existing secret/deployment authorization, configured a fresh cryptographically random 48-byte `EMAIL_LOOKUP_HASH_SECRET` through the authenticated official CLI, without printing it or writing it to a file. CLI returned success. No `.env` files read.

Live checks then passed: `sreejith1043@gmail.com` returned HTTP 200 `{exists:true}`; synthetic `registration-smoke@example.invalid` returned HTTP 200 `{exists:false}`. Both responses have `Cache-Control: no-store`. A read-only Auth query independently confirmed the two expected existence results. The endpoint only wrote its designed quota counters; no Auth accounts, confirmation mail, journeys or uploaded files were created/changed. Database/function/secret activation is complete. These results supersede the earlier missing-secret/503 state below. No source changes, so prior 47 passing tests and independent review remain applicable. Phone verification and GitHub publication remain pending; Mobile source is still local.

## Earlier deployment checkpoint

Owner authorization: "yes proceed" after the explicit request to deploy `registration-email-check` and configure its server secret on project `gwybjhqgnrpouwcdvusi`.

Deployed reviewed `backend/email-registration/index.js` + `handler.ts` using the Supabase connector. Function `registration-email-check`, id `b52c652b-9aac-4ca0-808b-167c050a4942`, version 1, status ACTIVE, public gateway (`verify_jwt=false`) as specified in the approved rollout. The privileged RPC is still service-role-only; no service credential is sent to Mobile. The public function intentionally provides the approved account-existence check.

Secret configuration is **blocked**: connector has no secret-management method; official temporary Supabase CLI 2.121.0 is available but not authenticated. A fresh random server-only secret was generated in memory for the attempted set, never printed or written to a file, and the CLI returned authentication-required. No secret was configured. No `.env` files were accessed and app dependencies were not changed.

Live HTTP POST with synthetic `registration-smoke@example.invalid` returned **503**, the expected unavailable response without the hash secret. No signup/email/Auth user write or membership lookup occurred. Production registration is not active yet. Owner must authenticate the CLI through its browser flow, then Architect can set `EMAIL_LOOKUP_HASH_SECRET` under the existing authorization and verify the live branches. Do not ask the owner to paste access tokens/passwords into chat.

Database migration `20261031071032` remains applied. Mobile source remains local/unpublished. Native phone verification, successful hosted lookup and canonical repository migration reconciliation remain pending. Prior 47 passing tests and independent review cover the unchanged source; the deployed entrypoint built successfully but successful runtime lookup is unverified.
