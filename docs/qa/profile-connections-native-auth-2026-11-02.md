# Profile connections: independent native managed-Auth verification

## Scope and exact inputs

Local synthetic PostgreSQL17 QA only, before separate live approval for the new identity proposal. No hosted query/migration, environment-file/credential access, real-user data, phone action, dependency installation or Web write was performed by this assignment. Architect supplied the observed hosted failure; the native fixture independently reproduces it.

Approved portable runtime: PostgreSQL17.11, `C:/Users/sreej/AppData/Local/Temp/journey-connections-pg17-20261102/pgsql/bin`.

Pinned immutable original: `A94BBF39041BC6C4D4A2EC6B8EDD77411EEFE9953F9134256FA536825BA05C7F`.

Pinned previously approved EXECUTE correction: `0C7F093D44EE70A2D056DD773CCBA925F416B2F6A7FCCE001ACB4BC700703C61`.

Pinned new identity proposal `docs/backend/profile-connections-auth-identity.sql`: `CCDB7D94CFF9E7B0B425F0F1055FCAEED239B896C5A2170F948DC3DC7D6A03C2`.

Tested driver `scripts/test-profile-connections-pg.mjs`: `91437CA1290DA378357EF56811F4AFB179B508240C3CBB918D3C59E0B4E2E79C`.

## Managed-Auth fixture

The driver still accepts only a local binary directory and known test mode. It constructs a new mkdtemp data directory, binds to fixed loopback with an unused port, ignores psql startup configuration/inherited PG settings, and verifies the actual server data directory, loopback address, port and PostgreSQL version before fixture SQL. It never accepts a DSN, remote host or existing database target.

This mode initializes the fresh cluster with bootstrap `qa_native_admin`, then creates a distinct **non-superuser INHERIT CREATEROLE postgres** migration operator. The separate bootstrap identity matters: PostgreSQL17's automatic ADMIN-only role membership grantor remains distinct from temporary grants issued by postgres, matching managed-host membership semantics rather than demoting the bootstrap OID10 role.

After the 13 prerequisite canonical migrations, the test gives the Auth schema and `auth.uid()` to a distinct managed-Auth role. The installer has Auth schema USAGE and UID EXECUTE, **neither WITH GRANT OPTION**, and cannot SET ROLE to the managed-Auth owner. `connection_rpc` has no Auth schema USAGE but does have UID EXECUTE via the existing PUBLIC function grant. These facts are asserted before any identity correction.

The managed UID fixture implements both request claim forms: a nonempty `request.jwt.claim.sub` takes precedence; otherwise it uses the `sub` field from `request.jwt.claims` JSON. Missing/empty claims produce null. It reads only the current request settings.

The exact original and approved ACL patch are applied as SET ROLE postgres. All six public/private connection functions deny PUBLIC/anon and allow authenticated EXECUTE. Calls to summary, list and mutation then reproduce **SQLSTATE42501** because the connection-role actor initializer still names the managed Auth namespace.

## Command and actual results

```powershell
node scripts/test-profile-connections-pg.mjs --postgres-bin C:/Users/sreej/AppData/Local/Temp/journey-connections-pg17-20261102/pgsql/bin --managed-auth-only
```

Final process exited0: **4/4 native case groups passed**.

| Group | Actual checks |
| --- | --- |
| Original runtime reproduction | Non-superuser installer has no Auth grant options; connection role lacks Auth USAGE; summary/list/mutation each fail42501 despite correct six-function EXECUTE ACLs |
| Bridge and metadata invariants | New helper owned by postgres, STABLE SECURITY DEFINER, no arguments, empty search_path, body only `select auth.uid()`; EXECUTE grantees exactly owner and connection_rpc; hostile defaults granting anon/authenticated/service_role/an additional hypothetical role all stripped |
| Direct sub claim | Actual authenticated summary/list, request, recipient incoming/inbox, accept, independent Follow, friends/following lists, acceptance event and read acknowledgement; null identity28000; anonymous42501; third-user inbox/incoming/relationship isolation and denied accept/private table read |
| JSON claims | The same complete synthetic flow and denials using JSON claim fallback with empty direct sub |

Before applying the new identity patch, the test deliberately installs function default grants to anon, authenticated, service_role and an extra unknown role. The helper's catalog ACL is checked exactly after the patch, and direct helper calls by all four excluded roles fail42501.

All six original function object identities, owners, ACLs, security/volatility flags and search_path arrays remain unchanged. Each of the three private sources changes **only one exact `auth.uid()` occurrence to `private.connection_uid()`**; all three public wrapper sources remain identical. The six relationship RLS policies and four table ACL/RLS definitions are identical.

The broader metadata invariant also compares every untouched public/private/auth/storage schema, relation and column ACL, RLS policy, default ACL, and other function body/owner/ACL before and after correction and after the functional checks. Managed Auth ownership/source/grants do not change. `connection_rpc` still lacks Auth USAGE; it gains no schema CREATE privilege. Installer SET/INHERIT capability and original distinct-grantor ADMIN-only membership return to their pre-patch state. No temporary role capability remains.

## Native identity and cleanup

Qualifying final identity: PostgreSQL17.11, `127.0.0.1:51644`, database `postgres`, fresh data directory `C:/Users/sreej/AppData/Local/Temp/journey-connections-pg17-test-OGk8XX/data`.

Evidence and server log are retained in its parent directory: `evidence.json`, `server.log`. The process exited0, the specific-data-directory finally block stopped that cluster, server log confirms shutdown, and `postmaster.pid` is absent. Earlier passing development run `...test-rxI9Zg` is also stopped; final evidence supersedes it by adding the broader untouched-object invariant. No recursive deletion was used.

## Limits and handoff

This verifies the exact reviewed proposal on a native PostgreSQL17 managed-Auth analogue, not every hosted environment. Live application still needs separate product-owner approval naming the new action/project, followed by hosted metadata and end-to-end checks.

The earlier 13/13 native concurrency cases were not rerun: only the caller-identity expression changes; pair/sender locks, transitions, revisions, quotas and event logic are byte-identical. Independent review should assess the pinned proposal and the new native mode/evidence before approval is requested.
