# Profile connections: PostgreSQL17 concurrency verification

Final lint-only cleanup by Architect: removed an unused synthetic user constant from the qualified driver. No SQL, process, isolation, barrier, assertion or cleanup statement changed. Current driver SHA256 `ae1ea0d794e060e2f5ad71467c02cb8faf2e9af491cac4764e3c5bdb59040031`; the completed native run and independent source/evidence review used `1d8ccf4d342547d37a88cc3c35e1d5569738cc1ebe630aa6c324d55db4e104ca`. Scoped ESLint passes after cleanup; unchanged native scenarios were not repeated solely for that deletion.

## Scope and authorization

Owner approved the local runtime and isolated testing, then clarified that the pending work should finish. This record covers only that bounded verification. No live activation or publication is authorized.

Assigned QA paths: `scripts/test-profile-connections-pg.mjs` and this record only. Other work and all Web files preserved. No dependency, live project, credential, environment-file, phone, Metro or product data changes.

## Runtime and isolation

Owner approved download and isolated tests only. Official EDB PostgreSQL17.11 runtime archive SHA256: `80379B2C04D51C30225532E0AE04509899141E9957ED096FE749D7FD9DF8F82F` (download verified by Architect). Runtime: `C:/Users/sreej/AppData/Local/Temp/journey-connections-pg17-20261102/pgsql/bin`.

Command:

```powershell
node scripts/test-profile-connections-pg.mjs --postgres-bin C:/Users/sreej/AppData/Local/Temp/journey-connections-pg17-20261102/pgsql/bin
```

Driver accepts only a local binary directory, constructs a fresh `mkdtemp` cluster, supplies fixed loopback host/database and an unused local port, ignores psql startup configuration, strips inherited PG settings, and verifies the actual server data directory equals the freshly created directory before fixture SQL. It imports the existing synthetic Auth/Storage fixture and applies the 13 canonical migrations read-only from Web, then the exact review proposal SHA256 `A94BBF39041BC6C4D4A2EC6B8EDD77411EEFE9953F9134256FA536825BA05C7F`. No hosted connection input is supported.

## Actual results

The qualifying native run completed successfully on 2026-11-02 at 08:36 IST using PostgreSQL17.11, `127.0.0.1:52248`, database `postgres`, fresh data directory `C:/Users/sreej/AppData/Local/Temp/journey-connections-pg17-test-ILhjFw/data`.

The exact proposal applied successfully under a non-superuser `connection_migrator` fixture after all canonical migrations. The migration leaves its three private functions owned by `connection_rpc`, with no retained migrator SET/INHERIT capability and no `connection_rpc` CREATE permission on the private schema. This is real PostgreSQL17 evidence for that synthetic fixture only; it does not establish live execution permission.

The corrected suite passed **13/13 ordered real two-session cases**. Every counted case observed the first backend in PgSleep, the second actual RPC in an advisory Lock wait, and `pg_blocking_pids(second)` containing the first backend before the first transaction committed. This is actual overlap/serialization evidence, not just two promises launched together.

Ordinary sessions acquire locks only through the production RPC; the second session always invokes the RPC directly. Only the first-session deliberately failed stale-follow case retains an outer test lock, allowing that stale attempt to catch exactly SQLSTATE40001 and hold the first transaction during the barrier. Its second session still has no injected lock. All 13 cases ran against this corrected source.

Corrected frozen runner SHA256: `1D8CCF4D342547D37A88CC3C35E1D5569738CC1EBE630AA6C324D55DB4E104CA`.

| Cases | Result |
| --- | --- |
| Opposite sends, A first and B first | One pending request/event, zero auto-accept/friendships |
| Accept/cancel, both orders | First terminal transition wins; accepted state has one friendship/accept event, cancelled state has none |
| Accept/decline, both orders | First terminal transition wins with matching counts and no duplicate events |
| Accept/remove, both orders, then late accept | Removal after acceptance stays removed; removal before acceptance does not invent a friendship; subsequent remove plus late accept never resurrects |
| Stale follow/unfollow, both orders | Exactly expected SQLSTATE40001; disabled state/revision2 retained |
| Duplicate accept | One accepted generation, friendship and acceptance event |
| Same actor, distinct peer pairs, 19 prior hourly requests, both orders | One success, one SQLSTATE54000; total remains20 requests/events |

Limits: synthetic local users, READ COMMITTED transactions and the pinned proposal only. This does not prove hosted rollout, phone writes, push delivery, denial-of-service resistance, multiple database isolation levels or real-user load. Existing PGlite/client suites cover additional authorization/adapter behavior; they were not rerun for this concurrency-only assignment. The first deliberately caught stale transaction commits no successful mutation; that case establishes ordering of attempts rather than two successful commits.

## Cleanup and retained evidence

The native run finished and the driver's exact-data-directory `pg_ctl -m fast -w stop` completed. Server log confirms shutdown, and `postmaster.pid` is absent. All fixture data and logs are retained in the approved temporary area; no recursive deletion was used.

Qualifying evidence: `C:/Users/sreej/AppData/Local/Temp/journey-connections-pg17-test-ILhjFw/evidence.json` and `server.log`. Evidence includes each backend PID, wait type/event, blocker PID array, expected SQLSTATE and final counts/state. Final server log says database system is shut down at 08:36:31 IST; `postmaster.pid` is absent. Test process exited0.

Earlier harness iterations: sandbox `pg_ctl` failed restricted-token error87 (`...test-6yKy00`); escalated Windows inherited-pipe handling timed out after starting `...test-xG4AAX`, which was explicitly stopped using only its exact data directory; `...test-ZcjFjP` rejected PostgreSQL's `/32` loopback text formatting before fixture SQL and stopped normally. An earlier completed `...test-tsVCOI` run injected pair locks before both RPC bodies, so its advisory waits could be harness-caused; **do not count that run as qualifying concurrency verification**. Its output claiming 13/13 races is superseded by this limitation. All these clusters are stopped. The corrected qualifying run above replaces that evidence. No recursive deletion or remote database operation was used.

Independent reviewer should inspect the corrected frozen runner and qualifying barrier evidence. No live activation is authorized.
