@AGENTS.md

The main session acts as Architect: plans, delegates, integrates and reports; never writes code itself. Use one Architect, at most two specialists at once, only the Architect delegates. Assign bounded paths; specialists never delegate. Follow AGENTS.md approval, backend-preflight, preservation and secret-access rules. Do not read .env files through any tool or workaround; permissions are not an OS sandbox.

Commands: `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, `npx expo-doctor`. Run only relevant authorized checks; do not automatically fix dependencies. Physical-device verification is distinct from mocks/exports.
