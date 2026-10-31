# Registration email check: approved database rollout

Owner approved: "ok i approve to change db", in response to the named project/action request. Scope executed: database only on Supabase `gwybjhqgnrpouwcdvusi`. Edge deployment and server secret configuration remain pending separate approval.

Applied `registration_email_check`, migration version `20261031071032` at 2026-10-31 07:10 UTC / 12:40 Asia/Kolkata. Source `backend/email-registration/rollout-proposal.sql`, SHA256 `7FE699F5CC3B4818CD62EE2C8715E5E1D75897B56210B4A2058A88E778D78CBD`, matches independently reviewed and isolated-tested snapshot. Pre-apply read-only check confirmed function/table did not already exist. Migration tool returned success and history confirms application.

Post-apply catalog verification: function exists, SECURITY DEFINER with empty search_path, executable by service_role, denied to anon/authenticated; limiter table has RLS and no anon/authenticated table privileges. Counter table empty. No Auth user records were changed and no production functional lookup calls were made. Isolated rate-limit/lookup tests from earlier snapshot remain the behavioral evidence; deployed endpoint/phone verification remains pending.

Security advisor reports the new private limiter table as RLS-enabled with no policies, intentionally denying direct access ([explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)). Other advisor notices concern existing functions and Auth settings, outside this approved rollout. No other database settings or grants were changed.

Application and rollout artifacts remain local/unpublished. This report supersedes earlier "no hosted changes" statements for the database portion only. Remaining activation work: separately approved `registration-email-check` Edge Function deployment, `EMAIL_LOOKUP_HASH_SECRET` provisioning, hosted contract checks and phone verification. Canonical repository migration-history reconciliation remains pending; no Web files changed.
