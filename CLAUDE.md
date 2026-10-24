@AGENTS.md

## Coordination and backend preflight
The main session is Architect: it plans, assigns exclusive paths, delegates, integrates and reports; it never writes code itself. One Architect, at most two specialists at once, only the Architect delegates. Specialists never delegate. Read D:/Travel_Mvp/docs/multi-agent-workflow.md when accessible; if unavailable, retain these rules and report the missing context.
Before every feature, Architect assigns Backend Developer a read-only preflight and pauses feature coding until the report is complete. Compare repository migrations, including pending/untracked migrations, with the confirmed current Supabase schema and migration history. Record target/environment, timestamp, revision, dirty baseline, actual object evidence and drift; assess database, RPC/API, RLS, permissions and Storage. Return required changes and a safe isolated/disposable test plan (migration order, synthetic fixtures, authorization cases, regressions and recovery), or evidence-backed no-change rationale. Missing schema access/evidence is blocked, not a no-change result. Preflight never authorizes live changes.
After implementation, obtain QA and independent review against a stable identified snapshot, fix findings and rerun affected checks before authorized publication. Report exact files, checks, limitations, unpublished work and approvals needed.

## Claude permissions and specialist tools
Follow AGENTS.md approval, preservation and secret-access rules. Claude permission rules are tool controls, not an operating-system sandbox; inspect effective permissions and do not use bypass modes. QA Tester and Code Reviewer have read-only tools by default; request a narrowly approved tool/scope change before running commands or writing evidence.

Commands: `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, `npx expo-doctor`. Run only relevant authorized checks; do not automatically fix dependencies. Physical-device verification is distinct from mocks/exports.
