# Home compact controls backend preflight

Backend Developer completed read-only preflight 2026-10-24 07:55–07:57 IST. Mobile baseline main 65ae609057af6e44649b7374c776b92a6114a2f0; untracked .github/, cd, eas preserved. Web backend/integrity-hardening 428182a0454c8f536c56024eeb0497f4f4a05c81 and all dirty work preserved.

Confirmed configured Mobile target matches connected Supabase project gwybjhqgnrpouwcdvusi (Seoul, PostgreSQL 17.11). Live catalog timestamp 2026-10-24 02:25:24 UTC. Inspected project, migration history, tables/columns/constraints/indexes/function definitions, owners/ACLs, RLS and bucket metadata; compared all 11 repository migration filenames and relevant SQL including pending integrity/selected-copy migrations.

No backend change: this presentation-only change retains public discovery/detail RPCs, anonymous client, private journey-media signed reads, local camera selection/reset, story navigation and place picker contracts. Existing published-or-owner predicates, invoker wrappers, grants, RLS and media policies remain sufficient. Notifications remain coming-soon presentation.

Existing drift: hosted migration history has zero entries. Current objects include core/discovery/detail/media/social/travel/destination and standalone selected-copy work; journey_rpc, private.journey_media_readable(text), private.selected_copy_requests are absent. Do not assume pending integrity/selected-copy migrations are applied. Drift is outside this cosmetic task.

Safe plan: local typecheck/lint/relevant synthetic checks; delayed native screenshots after loading, verify touch targets/callbacks/reset and collapsed/expanded clearances. No fixtures or database writes. Recovery removes only scoped task UI changes. Catalog checks are not penetration tests.

Architect gate: RELEASED for authorized local cosmetic Mobile implementation. Live Supabase changes NOT authorized. Code/report remain local/unpublished.
