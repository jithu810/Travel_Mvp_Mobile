# Travel-memory map backend preflight - 2026-11-03

Owner-agreed scope: profile Map tab beside Journeys/Saved/Drafts (own and public profiles); pins for every stop of the profile owner's published, non-demo journeys; stop photo thumbnail or existing stop art; tap opens that journey's Story at that stop; visible to anyone who can view the profile. Read-only; no drafts, Travel Mode visits, tracking or manual pins.

```text
Backend preflight owner / timestamp / feature scope: Architect (live collection) + Backend Developer (assessment) / 2026-11-03 / scope above.
Repository revision + dirty baseline / migration files inspected: Web main fa9c43d (dirty next-env.d.ts only, preserved; no untracked migrations); Mobile main 89ece92 clean. core_schema, journey_creation, social_loop, journey_media_thumbnail_v1_read, rpc_integrity_hardening.
Confirmed Supabase project + environment / schema inspection timestamp: gwybjhqgnrpouwcdvusi (live, owner-confirmed in session) / 2026-11-03.
Read-only checks actually run / evidence / migration-to-schema drift: list_projects, list_migrations (17 live); pg_proc for get_account_journeys/get_journey_detail/get_public_journeys/get_public_profile and private.journey_media_readable; RLS policies on journeys/journey_stops/profiles; table and column SELECT grants for anon/authenticated; constraints/FKs; indexes; storage.buckets journey-media (private, 15 MB, jpeg/png/webp); storage.objects journey_media_* policies. Live journeys_read, journey_stops_read, grants, FK, checks, indexes and journey_media_read/thumbnail_v1_read match repository intent. Drift unrelated to this feature: 4 live-only migrations (registration_email_check; 3 profile_connections files on unmerged Web branch); get_account_journeys live prosrc md5 d3d2960f… differs from Backend's repo hash (method unconfirmed) - feature does not use it. Separate reconciliation recommended.
Database / RPC/API / RLS / permissions / Storage impact: none. Existing anon SELECT on journeys/journey_stops + published-only RLS for anon; stop photos of published journeys already signable through journey_media_read (private.journey_media_readable) and thumbnail_v1_read.
Decision: no backend change
Required changes + dependencies OR evidence-backed no-change rationale: one anonymous publicSupabase read journeys(id,title,status,is_demo,user_id,updated_at,journey_stops(...)) filtered user_id/status=published/is_demo=false, ordered and limited. Must use publicSupabase (authenticated client would return owner drafts via user_id=auth.uid()) plus a client-side fail-closed guard.
Safe isolated test target / cases / expected results / recovery plan: no DB test needed. Mobile unit tests with mocked client: query shape/client choice; anon, other user and owner-with-drafts (draft rows dropped); empty; photo-less/unsafe paths -> art; invalid coordinates excluded; malformed/error fail closed; signing failure per pin; 100x50 bound; pin -> Story at stop with fallback to first stop. Recovery: revert Mobile commit; no live writes.
Missing evidence / blockers / next owner: none blocking. Next: Mobile Developer.
Architect gate: released (this record).
Live Supabase changes: not authorized (none required).
```
