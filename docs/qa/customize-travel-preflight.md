# Customize Stops: travel-only flow

Owner authorization: current conversation, 2026-10-28. Select/discard cards then open a temporary journey preview with map/cards for selected stops before entering Travel Mode; no old review/draft page, private copy or publication through Customize. Product owner subsequently requested a map/card preview instead of direct Travel entry; meaning of adding their own location is pending clarification. Remix remains the editable-copy flow.

## Baseline and impact

Repository: D:/Travel_Mvp_Mobile, main 6025168. Existing uncommitted instruction, editor, map, story and test changes are protected; implementation builds on their current state. No stash/reset/checkout/publication is authorized.

Inspected: src/components/journey/customize-stops.tsx, src/app/customize/[id].tsx, src/app/travel/[id].tsx, src/lib/remix/customize.ts, src/lib/journey/trip-session.ts, src/lib/journey/travel-preview.ts, src/hooks/use-trip-session.ts. Current Customize invokes remixSelectedJourney and displays a review/draft step; Travel normally loads a public journey and uses an in-memory tripStore keyed by journey ID.

Assessment: local selection/navigation change. Public journey loading, backend data contracts, authentication/authorization, persistence, RPC implementations and Storage access remain unchanged. Remove Customize's use of the existing draft RPC without changing that RPC or Remix. Selected itinerary and independent trip identity stay in memory; no new server queries, table writes, drafts or persisted GPS history. Existing Travel Mode Begin/permission and cleanup safeguards remain authoritative. No live Supabase check or live mutation is required/authorized. Reassess if implementation needs backend contract changes.

## Verification scope

Major navigation change: bounded Mobile implementation, QA and independent code review. Check selection/Undo and original ordering, all-discarded blocking, one-stop and malformed/expired selection handling, isolation from full-trip and other customized sessions, back/exit/resume, no write/auth/draft/review actions, ordinary Travel unchanged, and GPS permission still requires Begin Trip. Run affected automated suites and static checks; broaden regression to applicable repository suite. Phone checks must not create/save/publish data or begin live GPS unless separately authorized. Record actual evidence and limits after implementation. Reuse the same local itinerary identity when unchanged selections reopen preview/Travel so active progress remains reachable.

## Confirmed scope refinement

Product owner clarified both options are needed: append a newly chosen place to the temporary itinerary and use current GPS location as the trip starting point. Preview reuses existing journey map/card/sheet primitives, local place search/picker, and Travel Mode Begin Trip permission flow. Adding a place remains in memory only and must not mutate an active trip snapshot; existing public journey, database, RPC and Storage contracts stay unchanged. No location is requested automatically on opening preview. Preview offers map inspection before entering Travel. Missing registry after process termination remains an explicit unavailable state.

## Regression evidence so far

Initial full Mobile suite: 812 tests, 811 passed and one sandbox-restricted disposable PostgreSQL startup failure. The isolated PostgreSQL test was inspected (random loopback port, new synthetic cluster in .local-tests, no hosted target) and rerun outside sandbox: 1/1 passed. This covers that full-suite failure; no live backend operations occurred. Later preview/add-stop changes need targeted verification and renewed independent review.
