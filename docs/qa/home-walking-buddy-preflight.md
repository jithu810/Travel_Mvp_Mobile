# Home Locate walking Buddy: backend preflight

Backend Developer, 2026-10-27, 08:03 IST. Decision: **no backend change required** for replacing the Home Locate traveling plane with animated bundled Buddy, using the existing loaded stop coordinates. Architect may release local implementation after recording acceptance. No live writes or publication authorized.

## Baseline and evidence

- Web main: `4ab53cc464f2f99e9d905712678ed5954d94300e`; only three untracked `.temp` directories under standalone/customize-stops installations. Mobile `codex/buddy-bubbles-outdoor`: `955ecac21ae554ae428c9efb36d2f8ab6406e935`, ahead two; existing dirty Jump/Run and Story/live-map prototype application, assets, tests and QA documentation preserved. This preflight changes only this report.
- Confirmed existing target through connected Supabase `get_project`: `gwybjhqgnrpouwcdvusi`, ACTIVE_HEALTHY, ap-northeast-2, PostgreSQL 17.11. This is a live project; only metadata SELECTs were executed.
- Fresh connected `list_migrations` matches all 13 files in Web `supabase/migrations`, from core_schema `20261001000000` through rpc_integrity_hardening `20261026051106`. No new/pending default-chain migration or untracked SQL was found. Historical standalone installers, JWT patches and superseded SQL remain outside the default chain; they are not migrations to apply for this feature.
- Catalog inspection timestamps: `2026-10-27 02:33:07.701656+00` and `02:33:40.835943+00`. Queries inspected actual function definitions/ACLs, journeys/journey_stops columns, constraints, indexes, owners/RLS, table grants, relevant public/storage policies and bucket configuration. No user rows, configuration secrets or environment files were read.

## Migration-to-live contract comparison

Inspected core/discovery/detail migration contracts, social_loop projection and current hardening policy/grant definitions alongside Mobile discovery queries and spherical playback helpers.

- Actual public `get_public_journeys` and `get_journey_detail` are stable invoker wrappers with empty search_path and anon/authenticated EXECUTE. Actual private `public_journeys` and `journey_detail` definitions are stable definers with empty search_path and explicit published-only or published-or-owner predicates. Detail returns ordered stop UUID, sequence, latitude/longitude and existing photo fields. The Home existing detail load already obtains the coordinates; walking rendering needs no new request, RPC argument or response property.
- Public discovery has existing additive creator/destination projections relative to initial discovery migration, matching later repository intent. Historical standalone policies and bucket setup remain existing deployment provenance; full database equivalence is not asserted. None changes the feature's already-used read contract.
- Both tables are postgres-owned with RLS enabled. Anon/authenticated retain SELECT and published-or-owner read policies; authenticated journey DELETE remains owner-scoped. Existing narrow journey_rpc mutation policies/grants match current hardening intent. No permission change is needed.
- Actual stop coordinate pair/bounds constraints, journey foreign key, unique journey/sequence, primary keys and sequence checks exist. Journey owner FK/publication checks and owner/discovery indexes exist. The existing geometry validates coordinates, splits missing stops, skips coincident legs and computes illustrative spherical paths locally. No columns, constraints, indexes or travel-track records are needed.
- `journey-media` and `profile-avatars` remain private, 15728640-byte JPEG/PNG/WebP buckets. Existing referenced/owner media read and owner-scoped insert policies, including thumbnail read, remain unchanged. Bundled Buddy animation requires no upload, signed URL, new bucket or policy.

Database / RPC/API / RLS / permissions / Storage impact: **none**. Preserve anonymous discovery gating, existing request cancellation and current detail normalization. Preview coordinates are decoration and must not enter GPS, arrival/completion, tracking or persistence.

## Safe validation and recovery

Use synthetic local stop fixtures and existing component/playback harnesses, without database writes: Locate fits the same route and walks between the same stops; sprite frames advance while traveling and pause appropriately at stops; valid, missing, coincident and date-line coordinates retain existing handling. Verify repeat Locate, card switching, manual pan/zoom, blur/background, reduced motion, Buddy disabled, image failure and map unmount. Confirm only one Buddy presentation, no extra watchers/API calls and no Story/Travel/editor regressions. Native phone inspection can use existing public journeys with no save/upload/start action needed.

No database fixture target is required because the backend is unchanged. If persistence, requests, GPS or permissions expand, pause for refreshed preflight and a verified disposable database with anonymous/owner/other-user tests before writes. Recovery means reverting only the new feature diff, preserving all pre-existing dirty work.

Missing feature-specific evidence: none. Gate recommendation: released for bounded local presentation work; Architect acceptance remains to be recorded. Supabase changes, commits, pushes and deployment are not authorized by this report.

Architect acceptance: **released 2026-10-27 08:05 IST**, for Home Locate walking Buddy local presentation only. Existing Story/live-map prototype and all dirty work remain preserved.
