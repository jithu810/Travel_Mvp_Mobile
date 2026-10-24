# Bundled fallback photo preflight — 2026-10-24

Backend Developer scope-delta inspection 08:07:43 IST / 02:37:43 UTC, confirmed project gwybjhqgnrpouwcdvusi. Mobile baseline 65ae609057af6e44649b7374c776b92a6114a2f0 plus previous local compact-controls changes; preserve all. Web protected backend work and eleven migration filenames unchanged.

Current discovery/detail definitions, owners/ACLs, journey/stop SELECT policies, RLS and table permissions match prior Home preflight. Private journey-media bucket remains 15 MiB image-only and owner/published-reference reads. Hosted migration history empty; prior integrity-hardening/selected-copy drift remains outside scope; no claim of full parity.

No backend change: shared fallback uses bundled local image and native caption, no remote path/upload, database fields, constraints/indexes, RPC/API contracts, RLS/grants, Storage or auth change. Preserve real-photo precedence and failed-image recovery.

Safe plan: local missing/failed/valid photo fixtures, compact/expanded Home and stop context, accessibility/fallback labels, parent taps, bundled asset/offline resolution, URI recovery. Type/lint/regressions and delayed device captures, no database fixtures/writes.

Architect gate RELEASED for local fallback implementation. Live changes NOT authorized. Local/unpublished.
