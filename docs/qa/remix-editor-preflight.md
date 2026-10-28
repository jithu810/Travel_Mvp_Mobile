# Remix editor backend preflight

Architect / Backend Developer, 2026-10-27 (Asia/Kolkata). **Current decision: UI-only; live schema check not required. Implementation gate released.**

## Product-owner exception and repository assessment

The product owner explicitly approved skipping the live backend preflight for this UI task and updating the shared policy for both repositories. `D:/Travel_Mvp/docs/multi-agent-workflow.md`, both AGENTS.md files and reusable Architect/Backend Developer role instructions now distinguish UI-only repository assessments from the full live-schema preflight.

Architect inspected `src/app/create.tsx`, `src/app/draft/[id].tsx`, the JourneyOptions remix navigation and shared Story map/Buddy components; Mobile Developer independently traced all three remix landing routes, existing Account/customize direct-editor routes and editor hydration. Backend Developer inspected the existing remix/save query contracts and relevant Web migrations as recorded below. The scoped change only changes the navigation destination after existing remix handling and local map/sprite presentation for `sourceId` drafts. It reuses existing owner-checked editor loading and unchanged copy/save queries, parameters, Storage access and media handling. Authentication, authorization, persistence and backend contracts stay unchanged. No live-schema equivalence is claimed.

Local verification: synthetic component fixtures and clocks for new/existing remix routing, legacy redirect, sourceId-only Run/Idle map behavior, card selection, mutation/lifecycle cleanup, reduced motion and existing Story/normal-editor behavior; relevant regression suites, typecheck and lint; read-only phone navigation using existing drafts when available. No live remix creation, saves or uploads are authorized for testing.

Architect gate: released for the bounded UI scope. If implementation changes query/write semantics, authentication/authorization, persistence or Storage behavior, pause affected work and request the full preflight. Live Supabase changes remain unauthorized.

## Scope and baseline

Remove the intermediate remix draft page with its Continue editing action, route into the editor, and use the Story-style numbered map for remix drafts only (`sourceId` opt-in). Buddy should use Run while moving between selected cards and Idle at the selected stop. Existing Story walking behavior and ordinary new/owned draft previews remain unchanged. No write-contract change is proposed.

Mobile baseline: `main` at `b159a74`, clean at preflight inspection. Web baseline: `main` at `4ab53cc`, with three existing untracked nested Supabase `.temp` directories preserved: customize-stops-jwt-correction, customize-stops-jwt-rerunnable and standalone-customize-stops. No application, migration or dependency files were changed. No environment files were read.

## Completed read-only evidence

- Read both repositories' AGENTS instructions, Web multi-agent workflow, Backend role and Supabase skill.
- Inspected Mobile remix query and editor references. Full remix uses `copy_journey(source_id)` after public-source availability gating; selected remix uses `copy_journey_selected(source_id, selected_stop_ids, draft_id)`. Existing editor saves through `save_journey(payload)`. `src/app/draft/[id].tsx` contains the Continue editing route to `/create?draft=<id>`.
- Inventoried Web SQL files, including default migrations through `20261026051106_rpc_integrity_hardening.sql`, historical standalone/customize-stops migrations and superseded selected-copy SQL. Git status showed no untracked SQL migrations; only the three existing metadata directories above.
- Read relevant repository remix-without-media, customize-stops capture and integrity-hardening migration definitions. Repository intent preserves source lineage and ordered stop coordinates, makes remix media empty rather than inheriting source paths, and retains authenticated ownership and RPC permission boundaries.
- Supabase `list_projects` succeeded during this preflight and confirmed the existing target `gwybjhqgnrpouwcdvusi` (jithu810's Project), ACTIVE_HEALTHY, ap-northeast-2, PostgreSQL 17.11.0.002. This confirms project identity and service inventory access, not current database definitions.
- A batched current-catalog SELECT and migration-history request did not return usable results before interruption after approximately 394 seconds. One narrower catalog-only SELECT also returned no usable result before interruption after approximately 100 seconds. No further retries were made. These calls requested only metadata; no user records or live writes were requested.

## Historical live-preflight attempt under the previous policy

Current function definitions/ACLs, tables/constraints/indexes, RLS/grants, Storage policies/bucket metadata and migration history were **not obtained**. Therefore repository migrations cannot yet be compared with the current target schema, feature-specific drift cannot be ruled out, and no evidence-backed no-backend-change decision is claimed. Historical preflight reports are context only and do not substitute for current inspection.

Under the previous blanket-preflight policy, the apparent UI-only scope remained provisional pending current metadata. The current repository assessment and explicit owner approval above supersede that implementation gate. No new database column, API argument, RLS/grant or Storage behavior is proposed. Preserve remix/save retry, ambiguity, ownership, media and attribution safeguards when removing the landing page.

The former full-preflight gate was paused because these metadata requests failed. That historical blocker is superseded for this bounded UI-only task by the product-owner approval and repository assessment above. A future backend-impacting or uncertain task still requires the full current-schema comparison. **Live Supabase changes: not authorized.**

## Safe verification for the UI scope

Use synthetic fixtures and local component clocks for direct routing, legacy draft redirects, owner/not-owner/loading/error handling, sourceId-only map selection, Run while travelling and Idle at arrival, rapid next/previous selection, missing/coincident/invalid coordinates, reduced motion, preference off, lifecycle cleanup and single Buddy ownership. Regress ordinary editor drafts, Story, Home and Travel. Preserve existing copy/save arguments, ambiguous-write handling and source attribution. Run relevant automated suites, typecheck and lint; verify map rendering and animation on the connected phone without creating, saving or uploading live data.

No isolated database write target is needed for the proposed presentation-only scope. If the completed schema comparison or implementation reveals any persistence/API change, pause again and define a verified disposable local database with synthetic anonymous/owner/other-user authorization cases, migration order and recovery before any writes. No live remix/save test records, uploads or migrations are authorized by this task.

This report is local and unpublished. No commits, pushes or deployments were performed.
