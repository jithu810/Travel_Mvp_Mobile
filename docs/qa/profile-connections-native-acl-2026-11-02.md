# Profile connections: independent native PostgreSQL17 ACL verification

## Scope and isolation

This bounded QA task verifies the separately reviewed EXECUTE correction locally before any new live approval. It performs no live reads/writes, hosted RPC, credentials/environment-file access, phone operation or Web repository write. The reported hosted defect was supplied by Architect; QA reproduces that shape independently in synthetic native databases.

Runtime: approved official EDB PostgreSQL17.11 portable binaries at `C:/Users/sreej/AppData/Local/Temp/journey-connections-pg17-20261102/pgsql/bin`. No package/dependency installation.

The existing driver now excludes canonical filenames containing `profile_connections` before explicit controlled installation of the immutable original. This avoids duplicate installation after the canonical `20261102144322_profile_connections_v1.sql` was added. The same fixed localhost/database, fresh mkdtemp cluster, psql configuration isolation, explicit data-directory/port/version identity verification before fixture SQL, and exact-data-directory shutdown gates remain.

Pinned immutable original SHA256: `A94BBF39041BC6C4D4A2EC6B8EDD77411EEFE9953F9134256FA536825BA05C7F`.

Pinned correction `docs/backend/profile-connections-execute-acl.sql` SHA256: `0C7F093D44EE70A2D056DD773CCBA925F416B2F6A7FCCE001ACB4BC700703C61`.

Tested runner SHA256: `BC0A7D952A48C1D1208D1FD703683893D6D8A8E59F73D94E6310AEF9D0D55230`.

## Commands and actual results

```powershell
node scripts/test-profile-connections-pg.mjs --postgres-bin C:/Users/sreej/AppData/Local/Temp/journey-connections-pg17-20261102/pgsql/bin --acl-correction-only inherit
node scripts/test-profile-connections-pg.mjs --postgres-bin C:/Users/sreej/AppData/Local/Temp/journey-connections-pg17-20261102/pgsql/bin --acl-correction-only noinherit
```

Both commands exited0: **2/2 independent native fixtures; 4/4 correction applications passed**.

| Correction actor | Fresh verified native identity | Result |
| --- | --- | --- |
| Non-superuser INHERIT | PostgreSQL17.11, `127.0.0.1:50989`, database `postgres`, `C:/Users/sreej/AppData/Local/Temp/journey-connections-pg17-test-3hf4pO/data` | Initial application and repeat pass |
| Non-superuser NOINHERIT | PostgreSQL17.11, `127.0.0.1:50993`, database `postgres`, `C:/Users/sreej/AppData/Local/Temp/journey-connections-pg17-test-57pI7z/data` | Initial application and repeat pass |

Each fresh fixture applies the 13 prerequisite canonical migrations, then installs the exact original under the same non-superuser INHERIT operator shape. The NOINHERIT case changes only the corrective operator's inheritance flag after original installation. It deliberately does not install the original under NOINHERIT, which reproduces a different three-helper ACL problem outside this sole-mutator correction's scope.

Before correction, all six function ACLs are inspected: only `private.connection_mutate` has PUBLIC/anon EXECUTE; the other five already deny both, and all six allow authenticated EXECUTE. This is asserted, not inferred from migration success or warnings.

After EACH correction application, all six functions deny PUBLIC and anon EXECUTE while allowing authenticated EXECUTE. Function source bodies, owners, security-definer flags and search_path arrays are byte/value-identical to the baseline. The four relationship tables' object identities, ACLs and RLS flags and every relationship policy expression/role/command remain unchanged. Synthetic profile/relationship row counts remain unchanged.

The migration operator remains non-superuser with the selected inheritance flag, has no retained SET or inherited usage of `connection_rpc`, and `connection_rpc` has no CREATE permission on the private schema. The original automatic ADMIN-only membership record is preserved exactly; temporary explicit membership disappears after each application. Applying the same patch twice is idempotent under both inheritance settings.

## Cleanup and evidence

Both clusters were stopped by the driver's specific-data-directory `pg_ctl -m fast -w stop` finally block. Server logs confirm shutdown and `postmaster.pid` is absent in both clusters. No recursive deletion was performed; native test data/logs remain in the approved temporary area.

Each corresponding parent directory contains `evidence.json` and `server.log`. Evidence includes exact original/correction hashes, skipped canonical relationship filename, confirmed native data directory/version/loopback identity, all six before/after ACL rows, retained-powers assertions, original ADMIN membership and row-count snapshots.

## Limits and prior evidence

No live correction was executed by QA. Hosted execution still requires separate product-owner approval and subsequent hosted ACL verification. Native tests cover the exact reviewed SQL and operator shapes; they do not establish hosted policy/environment equivalence beyond the supplied observed shape.

The earlier 13/13 qualifying native race evidence in `profile-connections-concurrency-2026-11-02.md` remains applicable to unchanged function bodies and locks. This task did not rerun those races. The new runner hash reflects the prerequisite migration filter and isolated ACL-only test mode, not application logic changes.

PostgreSQL17 role INHERIT/SET grant options and ACL revocation behavior were checked against official documentation: [GRANT](https://www.postgresql.org/docs/17/sql-grant.html), [REVOKE](https://www.postgresql.org/docs/17/sql-revoke.html). Supabase skill's changelog fetch was attempted but the web renderer rejected its Markdown content type; no Supabase SDK/platform feature was implemented in this task.
