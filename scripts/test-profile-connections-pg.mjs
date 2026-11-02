import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fixtureSql, migrationDirectory } from '../../Travel_Mvp/scripts/lib/offline-db.mjs';

// Local synthetic tests only. No connection-string/host/database/environment-file inputs.
const args = process.argv.slice(2);
const usage = 'Usage: node scripts/test-profile-connections-pg.mjs --postgres-bin <local-bin-directory> [--acl-correction-only inherit|noinherit | --managed-auth-only]';
assert.ok([2, 3, 4].includes(args.length), usage);
assert.equal(args[0], '--postgres-bin');
const aclOnly = args.length === 4;
const authOnly = args.length === 3;
if (authOnly) assert.equal(args[2], '--managed-auth-only');
if (aclOnly) { assert.equal(args[2], '--acl-correction-only'); assert.ok(['inherit', 'noinherit'].includes(args[3]), usage); }
assert.ok(!args[1].includes('://'), 'Only a local runtime directory is accepted');
const bin = await realpath(resolve(args[1]));
const suffix = process.platform === 'win32' ? '.exe' : '';
const executable = name => join(bin, name + suffix);
const expectedSqlHash = 'a94bbf39041bc6c4d4a2ec6b8edd77411eefe9953f9134256fa536825ba05c7f';
const sqlPath = new URL('../docs/backend/profile-connections.sql', import.meta.url);
const sql = await readFile(sqlPath, 'utf8');
assert.equal(createHash('sha256').update(sql).digest('hex'), expectedSqlHash, 'Proposal changed: review and update the pinned hash before testing');
const correctionHash = '0c7f093d44ee70a2d056dd773ccba925f416b2f6a7fcce001acb4bc700703c61';
const correctionSql = aclOnly || authOnly ? await readFile(new URL('../docs/backend/profile-connections-execute-acl.sql', import.meta.url), 'utf8') : null;
if (correctionSql) assert.equal(createHash('sha256').update(correctionSql).digest('hex'), correctionHash, 'Corrective SQL changed: review its exact hash before testing');
// Filled only after Backend Developer freezes the exact reviewed identity proposal.
const identityHash = 'ccdb7d94cff9e7b0b425f0f1055fcaeed239b896c5a2170f948dc3dc7d6a03c2';
const identitySql = authOnly ? await readFile(new URL('../docs/backend/profile-connections-auth-identity.sql', import.meta.url), 'utf8') : null;
if (authOnly) {
  assert.ok(identityHash, 'Managed-Auth testing is gated on Backend Developer proposal hash freeze');
  assert.equal(createHash('sha256').update(identitySql).digest('hex'), identityHash, 'Identity proposal changed after review');
}
const scratch = await mkdtemp(join(tmpdir(), 'journey-connections-pg17-test-'));
const cluster = join(scratch, 'data');
const log = join(scratch, 'server.log');
const evidence = { runtime: null, proposalSha256: expectedSqlHash, correctionSha256: correctionSql ? correctionHash : null,
  identitySha256: authOnly ? identityHash : null,
  mode: aclOnly ? `acl-correction-${args[3]}` : authOnly ? 'managed-auth' : 'concurrency', scratch, cluster, host: '127.0.0.1', cases: [] };
// Strip inherited PG* settings, connection-service/password configuration and unrelated credentials.
const env = Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'LANG'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
env.PATH = bin + (process.platform === 'win32' ? ';' : ':') + (env.PATH || env.Path || '');
const clients = new Set();
function start(name, argv, timeout = 30000, input = '') {
  // On Windows pg_ctl's server child can retain inherited pipe handles after
  // pg_ctl exits. Its own status is sufficient; the server writes only to -l.
  const control = name === 'pg_ctl';
  const child = spawn(executable(name), argv, { env, windowsHide: true, stdio: control ? 'ignore' : ['pipe', 'pipe', 'pipe'] });
  clients.add(child);
  let stdout = '', stderr = '';
  child.stdout?.on('data', bytes => { stdout += bytes; });
  child.stderr?.on('data', bytes => { stderr += bytes; });
  child.stdin?.on('error', () => { /* Process failure is reported by error/close below. */ });
  child.stdin?.end(input);
  const done = new Promise((fulfill, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${name} timed out`)); }, timeout);
    child.once('error', error => { clearTimeout(timer); clients.delete(child); reject(error); });
    child.once('close', code => { clearTimeout(timer); clients.delete(child); fulfill({ code, stdout, stderr }); });
  });
  return { child, done };
}
async function command(name, argv, timeout) {
  const result = await start(name, argv, timeout).done;
  assert.equal(result.code, 0, `${name} failed: ${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}
const port = await new Promise((fulfill, reject) => {
  const listener = createServer();
  listener.once('error', reject);
  listener.listen(0, '127.0.0.1', () => { const chosen = listener.address().port; listener.close(error => error ? reject(error) : fulfill(chosen)); });
});
evidence.port = port;
const psqlArgs = ['-X', '--no-password', '-h', '127.0.0.1', '-p', String(port), '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-At'];
let connectionUser = authOnly ? 'qa_native_admin' : 'postgres';
let identityVerified = false;
function psql(source, timeout = 30000) { return start('psql', [...psqlArgs, '-U', connectionUser, '-f', '-'], timeout, source); }
async function query(source) {
  assert.ok(identityVerified, 'Fixture queries prohibited before fresh-cluster identity verification');
  const result = await psql(source).done;
  assert.equal(result.code, 0, `${result.stderr}\n${result.stdout}`);
  return result.stdout.trim();
}
async function jsonQuery(source) { return JSON.parse(await query(source)); }
const user = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const request = n => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const a = user(1), b = user(2);
const literal = value => value === null ? 'null' : typeof value === 'boolean' || typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
function mutate(actor, target, action, id = null, revision = null, enabled = null) {
  return `set local role authenticated; set local request.jwt.claim.sub=${literal(actor)};
    select public.mutate_profile_connection(${literal(target)},${literal(action)},${literal(id)},${literal(revision)},${literal(enabled)},null);`;
}
function pairLock(actor, target) {
  const [low, high] = [actor, target].sort();
  return `select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('connection:${low}:${high}',0));`;
}
const sleep = ms => new Promise(fulfill => setTimeout(fulfill, ms));
async function activities(firstName, secondName) {
  return jsonQuery(`select coalesce(json_agg(json_build_object('pid',pid,'name',application_name,'state',state,'waitType',wait_event_type,'wait',wait_event,'blockers',pg_blocking_pids(pid))),'[]') from pg_stat_activity where application_name in (${literal(firstName)},${literal(secondName)});`);
}
async function waitFor(check, message, timeout = 3500) {
  const until = Date.now() + timeout;
  while (Date.now() < until) { const result = await check(); if (result) return result; await sleep(35); }
  throw new Error(message);
}
async function reset() {
  await query('truncate private.connection_notifications,private.connection_friendships,private.connection_requests,private.connection_follows;');
}
async function prepareRequest(id = request(1)) {
  await query(`begin; ${mutate(a, b, 'request', id)} commit;`);
}
async function outcome(id = request(1)) {
  return jsonQuery(`select json_build_object(
    'status',(select status from private.connection_requests where id=${literal(id)}),
    'revision',(select revision from private.connection_requests where id=${literal(id)}),
    'friendships',(select count(*) from private.connection_friendships),
    'requests',(select count(*) from private.connection_requests),
    'requestEvents',(select count(*) from private.connection_notifications where kind='friend_request'),
    'acceptEvents',(select count(*) from private.connection_notifications where kind='friend_accepted'),
    'follows',coalesce((select json_agg(json_build_object('enabled',enabled,'revision',revision)) from private.connection_follows),'[]'));`);
}
function operation(actor, target, action, id = null, revision = null, enabled = null, error = null) {
  return { actor, target, action, id, revision, enabled, error };
}
async function race(name, first, second, inspect) {
  const sequence = evidence.cases.length + 1;
  const firstName = `connections-race-${sequence}-first`, secondName = `connections-race-${sequence}-second`;
  const body = op => op.catchStale
    ? `set local role authenticated; set local request.jwt.claim.sub=${literal(op.actor)};
      do $qa$ begin
        begin
          perform public.mutate_profile_connection(${literal(op.target)},'follow',null,${literal(op.revision)},${literal(op.enabled)},null);
          raise exception 'Expected stale follow revision to fail';
        exception when sqlstate '40001' then raise notice 'QA_EXPECTED_SQLSTATE:40001'; end;
      end $qa$;`
    : mutate(op.actor, op.target, op.action, op.id, op.revision, op.enabled);
  const source = (op, app, delay) => `set application_name=${literal(app)}; begin;
    ${delay && op.catchStale ? pairLock(op.actor, op.target) : ''} ${body(op)}
    ${delay ? 'select pg_sleep(5);' : ''} commit;`;
  const firstClient = psql(source(first, firstName, true), 15000);
  await waitFor(async () => (await activities(firstName, secondName)).find(row => row.name === firstName && row.wait === 'PgSleep'), `${name}: first session never reached pg_sleep`);
  const secondClient = psql(source(second, secondName, false), 15000);
  const barrier = await waitFor(async () => {
    const rows = await activities(firstName, secondName);
    const one = rows.find(row => row.name === firstName && row.wait === 'PgSleep');
    const two = rows.find(row => row.name === secondName && row.waitType === 'Lock' && row.wait === 'advisory');
    return one && two?.blockers.includes(one.pid) ? { first: one, second: two } : null;
  }, `${name}: no proof second session blocked on first before commit`);
  const results = await Promise.all([firstClient.done, secondClient.done]);
  for (const [index, op] of [first, second].entries()) {
    const result = results[index];
    if (op.error) {
      assert.notEqual(result.code, 0, `${name}: expected SQLSTATE ${op.error}`);
      assert.match(result.stderr, new RegExp(`ERROR:\\s+${op.error}:`), `${name}: wrong failure: ${result.stderr}`);
    } else {
      assert.equal(result.code, 0, `${name}: ${result.stderr}`);
      if (op.catchStale) assert.match(result.stderr, /QA_EXPECTED_SQLSTATE:40001/);
    }
  }
  const result = await inspect();
  evidence.cases.push({ name, barrier, expectedErrors: [first.error, second.error], result });
  console.log(`PASS ${name}: second backend ${barrier.second.pid} blocked on first ${barrier.first.pid} before commit`);
}
async function aclCorrection() {
  const functionSnapshot = () => jsonQuery(`select json_agg(row_to_json(f) order by f.schema,f.name) from (
    select n.nspname schema,p.proname name,pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig,p.prosrc,
      has_function_privilege('anon',p.oid,'execute') anon_execute,
      has_function_privilege('authenticated',p.oid,'execute') auth_execute,
      exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE') public_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private')
      and p.proname in ('connection_summary','connection_list','connection_mutate','get_profile_connections','list_profile_connections','mutate_profile_connection')
    ) f;`);
  const tableSnapshot = () => jsonQuery(`select json_agg(row_to_json(t) order by t.name) from (
    select c.oid,c.relname name,c.relrowsecurity,c.relacl::text acl from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='private' and c.relkind='r' and c.relname like 'connection_%'
    ) t;`);
  const policySnapshot = () => jsonQuery(`select json_agg(row_to_json(p) order by p.polname) from (
    select p.polname,p.polcmd,p.polpermissive,p.polroles,pg_get_expr(p.polqual,p.polrelid) qual,pg_get_expr(p.polwithcheck,p.polrelid) check_expression
    from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='private' and c.relname like 'connection_%'
    ) p;`);
  const membershipSnapshot = () => jsonQuery(`select coalesce(json_agg(row_to_json(m) order by m.grantor),'[]') from (
    select pg_get_userbyid(a.grantor) grantor,a.admin_option,a.inherit_option,a.set_option
    from pg_auth_members a join pg_roles r on r.oid=a.roleid join pg_roles member on member.oid=a.member
    where r.rolname='connection_rpc' and member.rolname='connection_migrator'
    ) m;`);
  const rowSnapshot = () => jsonQuery(`select json_build_object(
    'profiles',(select count(*) from public.profiles),
    'requests',(select count(*) from private.connection_requests),
    'friendships',(select count(*) from private.connection_friendships),
    'follows',(select count(*) from private.connection_follows),
    'inbox',(select count(*) from private.connection_notifications));`);
  // Always install the original with the observed INHERIT actor. Vary only
  // the correction operator; original NOINHERIT is a different defect shape.
  const before = await functionSnapshot();
  assert.equal(before.length, 6);
  for (const fn of before) {
    const soleBadHelper = fn.schema === 'private' && fn.name === 'connection_mutate';
    assert.equal(fn.public_execute, soleBadHelper, `Original PUBLIC shape: ${fn.name}`);
    assert.equal(fn.anon_execute, soleBadHelper, `Original anon shape: ${fn.name}`);
    assert.equal(fn.auth_execute, true, `Original authenticated shape: ${fn.name}`);
  }
  await query(`insert into auth.users(id) values (${literal(a)}); alter role connection_migrator ${args[3]};`);
  const tablesBefore = await tableSnapshot(), policiesBefore = await policySnapshot();
  const membershipsBefore = await membershipSnapshot(), rowsBefore = await rowSnapshot();
  const initialPowers = await jsonQuery(`select json_build_object('superuser',(select rolsuper from pg_roles where rolname='connection_migrator'),
    'inheritFlag',(select rolinherit from pg_roles where rolname='connection_migrator'),
    'setRole',pg_has_role('connection_migrator','connection_rpc','SET'),
    'inheritRole',pg_has_role('connection_migrator','connection_rpc','USAGE'),
    'createSchema',has_schema_privilege('connection_rpc','private','create'));`);
  assert.equal(initialPowers.superuser, false); assert.equal(initialPowers.inheritFlag, args[3] === 'inherit');
  assert.equal(initialPowers.setRole, false); assert.equal(initialPowers.inheritRole, false); assert.equal(initialPowers.createSchema, false);
  for (const attempt of [1, 2]) {
    await query(`set role connection_migrator; ${correctionSql} reset role;`);
    const after = await functionSnapshot();
    assert.equal(after.length, 6);
    for (const fn of after) {
      assert.equal(fn.public_execute, false, `${attempt}: PUBLIC ${fn.name}`);
      assert.equal(fn.anon_execute, false, `${attempt}: anon ${fn.name}`);
      assert.equal(fn.auth_execute, true, `${attempt}: authenticated ${fn.name}`);
      const previous = before.find(row => row.schema === fn.schema && row.name === fn.name);
      for (const key of ['owner', 'prosecdef', 'proconfig', 'prosrc']) assert.deepEqual(fn[key], previous[key], `${attempt}: unchanged ${fn.name}.${key}`);
    }
    assert.deepEqual(await tableSnapshot(), tablesBefore, `${attempt}: table ACL/RLS unchanged`);
    assert.deepEqual(await policySnapshot(), policiesBefore, `${attempt}: policies unchanged`);
    assert.deepEqual(await membershipSnapshot(), membershipsBefore, `${attempt}: only original ADMIN membership remains`);
    assert.deepEqual(await rowSnapshot(), rowsBefore, `${attempt}: row counts unchanged`);
    const powers = await jsonQuery(`select json_build_object('superuser',(select rolsuper from pg_roles where rolname='connection_migrator'),
      'inheritFlag',(select rolinherit from pg_roles where rolname='connection_migrator'),
      'setRole',pg_has_role('connection_migrator','connection_rpc','SET'),
      'inheritRole',pg_has_role('connection_migrator','connection_rpc','USAGE'),
      'createSchema',has_schema_privilege('connection_rpc','private','create'));`);
    assert.deepEqual(powers, initialPowers, `${attempt}: temporary capabilities removed`);
    evidence.cases.push({ name: `${args[3]} correction attempt ${attempt}`, beforeAcl: before.map(({ prosrc, ...fn }) => fn),
      afterAcl: after.map(({ prosrc, ...fn }) => fn), powers, memberships: membershipsBefore, rows: rowsBefore,
      unchangedFunctionBodiesOwnersAndSearchPaths: true, unchangedTableAclsRlsPolicies: true });
    console.log(`PASS ${args[3]} correction attempt ${attempt}: six ACLs restricted; bodies/owners/search_path/table ACLs/policies/rows/membership unchanged`);
  }
  evidence.passed = 2;
}
async function managedAuthIdentity() {
  // The bootstrap owner is used only to construct a managed-host analogue in
  // this already-verified fresh local cluster, never as the migration operator.
  await query(`create role qa_managed_auth nologin nosuperuser;
    create role service_role nologin;
    create role qa_extra_default nologin;
    create or replace function auth.uid() returns uuid language sql stable as
      $uid$ select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
        (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'))::uuid $uid$;
    alter schema auth owner to qa_managed_auth;
    alter function auth.uid() owner to qa_managed_auth;
    revoke all on schema auth from postgres;
    grant usage on schema auth to postgres;
    grant usage,create on schema public,private to postgres with grant option;
    alter table public.profiles owner to postgres;`);
  const authSnapshot = () => jsonQuery(`select json_build_object(
    'schemaOwner',(select pg_get_userbyid(nspowner) from pg_namespace where nspname='auth'),
    'schemaAcl',(select nspacl::text from pg_namespace where nspname='auth'),
    'uidOwner',(select pg_get_userbyid(proowner) from pg_proc where oid='auth.uid()'::regprocedure),
    'uidBody',(select prosrc from pg_proc where oid='auth.uid()'::regprocedure),
    'uidAcl',(select proacl::text from pg_proc where oid='auth.uid()'::regprocedure),
    'installerSuper',(select rolsuper from pg_roles where rolname='postgres'),
    'installerUsage',has_schema_privilege('postgres','auth','USAGE'),
    'installerUsageGrant',has_schema_privilege('postgres','auth','USAGE WITH GRANT OPTION'),
    'installerExecute',has_function_privilege('postgres','auth.uid()','EXECUTE'),
    'installerExecuteGrant',has_function_privilege('postgres','auth.uid()','EXECUTE WITH GRANT OPTION'),
    'installerSetAuth',pg_has_role('postgres','qa_managed_auth','SET'));`);
  const authBefore = await authSnapshot();
  assert.equal(authBefore.schemaOwner, 'qa_managed_auth'); assert.equal(authBefore.uidOwner, 'qa_managed_auth');
  assert.equal(authBefore.installerSuper, false); assert.equal(authBefore.installerUsage, true);
  assert.equal(authBefore.installerExecute, true); assert.equal(authBefore.installerUsageGrant, false);
  assert.equal(authBefore.installerExecuteGrant, false); assert.equal(authBefore.installerSetAuth, false);
  await query(`set role postgres; ${sql} ${correctionSql} reset role;`);
  const allFunctions = () => jsonQuery(`select json_agg(row_to_json(f) order by f.schema,f.name) from (
    select n.nspname schema,p.proname name,p.oid,pg_get_userbyid(p.proowner) owner,p.prosecdef,p.provolatile,p.proconfig,p.prosrc,p.proacl::text acl,
      has_function_privilege('anon',p.oid,'execute') anon_execute,
      has_function_privilege('authenticated',p.oid,'execute') auth_execute,
      exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE') public_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where (n.nspname='private' and p.proname in ('connection_summary','connection_list','connection_mutate'))
       or (n.nspname='public' and p.proname in ('get_profile_connections','list_profile_connections','mutate_profile_connection'))
    ) f;`);
  const tablePolicies = () => jsonQuery(`select json_build_object(
    'tables',(select json_agg(json_build_object('oid',c.oid,'name',c.relname,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity) order by c.relname)
      from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname like 'connection_%' and c.relkind='r'),
    'policies',(select json_agg(json_build_object('oid',p.oid,'name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,'roles',p.polroles,
      'qual',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname)
      from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname like 'connection_%'));`);
  const powers = () => jsonQuery(`select json_build_object(
    'connAuthUsage',has_schema_privilege('connection_rpc','auth','USAGE'),
    'connUidExecute',has_function_privilege('connection_rpc','auth.uid()','EXECUTE'),
    'connPrivateCreate',has_schema_privilege('connection_rpc','private','CREATE'),
    'installerSetConn',pg_has_role('postgres','connection_rpc','SET'),
    'installerInheritConn',pg_has_role('postgres','connection_rpc','USAGE'),
    'membership',(select coalesce(json_agg(json_build_object('grantor',pg_get_userbyid(a.grantor),'admin',a.admin_option,'inherit',a.inherit_option,'set',a.set_option) order by a.grantor),'[]')
      from pg_auth_members a join pg_roles r on r.oid=a.roleid join pg_roles m on m.oid=a.member where r.rolname='connection_rpc' and m.rolname='postgres'));`);
  const existingObjects = () => jsonQuery(`select json_build_object(
    'schemas',(select json_agg(json_build_object('oid',n.oid,'name',n.nspname,'owner',n.nspowner,'acl',n.nspacl::text) order by n.oid)
      from pg_namespace n where n.nspname in ('public','private','auth','storage')),
    'relations',(select json_agg(json_build_object('oid',c.oid,'name',n.nspname||'.'||c.relname,'owner',c.relowner,'kind',c.relkind,
      'acl',c.relacl::text,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity) order by c.oid)
      from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private','auth','storage')),
    'columns',(select json_agg(json_build_object('relation',a.attrelid,'number',a.attnum,'acl',a.attacl::text) order by a.attrelid,a.attnum)
      from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('public','private','auth','storage') and a.attnum>0),
    'otherFunctions',(select json_agg(json_build_object('oid',p.oid,'name',n.nspname||'.'||p.proname,'owner',p.proowner,
      'acl',p.proacl::text,'source',p.prosrc,'config',p.proconfig,'definer',p.prosecdef,'volatility',p.provolatile) order by p.oid)
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private','auth','storage')
      and not(n.nspname='private' and p.proname in ('connection_summary','connection_list','connection_mutate','connection_uid'))),
    'allPolicies',(select json_agg(json_build_object('oid',p.oid,'relation',p.polrelid,'name',p.polname,'roles',p.polroles,
      'command',p.polcmd,'permissive',p.polpermissive,'qual',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.oid)
      from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('public','private','auth','storage')),
    'defaults',(select json_agg(json_build_object('oid',d.oid,'role',d.defaclrole,'namespace',d.defaclnamespace,'kind',d.defaclobjtype,'acl',d.defaclacl::text) order by d.oid)
      from pg_default_acl d));`);
  const before = await allFunctions(), policyBefore = await tablePolicies(), powersBefore = await powers();
  assert.equal(before.length, 6); assert.equal(policyBefore.policies.length, 6);
  assert.equal(powersBefore.connAuthUsage, false); assert.equal(powersBefore.connUidExecute, true);
  assert.equal(powersBefore.connPrivateCreate, false); assert.equal(powersBefore.installerSetConn, false);
  assert.equal(powersBefore.installerInheritConn, false);
  for (const fn of before) { assert.equal(fn.anon_execute, false); assert.equal(fn.public_execute, false); assert.equal(fn.auth_execute, true); }
  await query(`insert into auth.users(id) values (${literal(a)}),(${literal(b)}),(${literal(user(3))});`);
  const authSql = (actor, source, format = 'sub', role = 'authenticated') => `begin; set local role ${role};
    set local request.jwt.claim.sub=${literal(format === 'sub' ? actor : '')};
    set local request.jwt.claims=${literal(format === 'json' ? JSON.stringify(actor ? { sub: actor } : {}) : '')};
    ${source} commit;`;
  const asJson = async (actor, source, format = 'sub') => {
    const output = await query(authSql(actor, source, format));
    const result = output.split(/\r?\n/).find(line => line.startsWith('{') || line.startsWith('['));
    assert.ok(result, `Missing JSON result: ${output}`); return JSON.parse(result);
  };
  const denied = async (actor, source, code, format = 'sub', role = 'authenticated') => {
    const result = await psql(authSql(actor, source, format, role)).done;
    assert.notEqual(result.code, 0, 'Expected permission/identity rejection');
    assert.match(result.stderr, new RegExp(`ERROR:\\s+${code}:`), result.stderr);
  };
  await denied(a, `select public.get_profile_connections(${literal(b)});`, '42501');
  await denied(a, "select public.list_profile_connections('incoming',null,20);", '42501');
  await denied(a, `select public.mutate_profile_connection(${literal(b)},'request',${literal(request(1))});`, '42501');
  evidence.cases.push({ name: 'managed Auth original runtime reproduction', expectedSqlstate: '42501', auth: authBefore, connectionPowers: powersBefore });
  console.log('PASS original+ACL reproduce 42501 on summary/list/mutation with no installer Auth grant options');

  // Deliberately hostile function defaults exercise removal of every non-owner
  // grantee, including roles not known by name to the correction proposal.
  await query('alter default privileges for role postgres in schema private grant execute on functions to anon,authenticated,service_role,qa_extra_default;');
  const untouchedBefore = await existingObjects();
  await query(`set role postgres; ${identitySql} reset role;`);
  assert.deepEqual(await existingObjects(), untouchedBefore, 'All untouched Auth/Storage/existing RPC/schema/relation/column/policy/default ACL metadata unchanged');
  assert.deepEqual(await authSnapshot(), authBefore, 'Managed Auth ownership/source/ACL and installer capabilities unchanged');
  assert.deepEqual(await tablePolicies(), policyBefore, 'All relationship table ACL/RLS policies unchanged');
  assert.deepEqual(await powers(), powersBefore, 'No widened Auth usage or retained temporary role capabilities');
  const after = await allFunctions(); assert.equal(after.length, 6);
  for (const fn of after) {
    const previous = before.find(row => row.schema === fn.schema && row.name === fn.name);
    for (const key of ['oid', 'owner', 'prosecdef', 'provolatile', 'proconfig', 'acl', 'anon_execute', 'auth_execute', 'public_execute']) assert.deepEqual(fn[key], previous[key], `${fn.name}.${key}`);
    const changed = fn.schema === 'private';
    if (changed) assert.equal(previous.prosrc.split('auth.uid()').length - 1, 1, 'Exactly one reviewed initializer');
    assert.equal(fn.prosrc, changed ? previous.prosrc.replace('auth.uid()', 'private.connection_uid()') : previous.prosrc, `${fn.name}: only actor initializer changes`);
  }
  const helper = await jsonQuery(`select json_build_object('owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'volatility',p.provolatile,
    'config',p.proconfig,'args',p.pronargs,'body',p.prosrc,
    'grantees',(select json_agg(json_build_object('role',case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,'privilege',a.privilege_type) order by a.grantee)
      from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a)) from pg_proc p where p.oid='private.connection_uid()'::regprocedure;`);
  assert.equal(helper.owner, 'postgres'); assert.equal(helper.definer, true); assert.equal(helper.volatility, 's');
  assert.deepEqual(helper.config, ['search_path=""']); assert.equal(helper.args, 0);
  assert.equal(helper.body.replace(/\s/g, ''), 'selectauth.uid()');
  assert.deepEqual(helper.grantees.map(row => row.role).sort(), ['connection_rpc', 'postgres']);
  assert.ok(helper.grantees.every(row => row.privilege === 'EXECUTE'));
  for (const role of ['anon', 'authenticated', 'service_role', 'qa_extra_default']) {
    await denied(a, 'select private.connection_uid();', '42501', 'sub', role);
  }
  evidence.cases.push({ name: 'identity bridge ACL/body/metadata invariants', helper, connectionPowers: powersBefore,
    unchangedManagedAuthAndPolicies: true, onlyThreeInitializerReplacements: true,
    unchangedExistingAuthStorageAndRpcMetadata: true });
  console.log('PASS postgres-owned bridge: owner+connection_rpc only, hostile defaults stripped, exact 3 initializer changes and no widened grants');

  for (const format of ['sub', 'json']) {
    await reset();
    const summary = await asJson(a, `select public.get_profile_connections(${literal(b)});`, format);
    assert.equal(summary.friendStatus, 'none'); assert.equal(summary.following, false);
    assert.equal((await asJson(a, "select public.list_profile_connections('incoming',null,20);", format)).items.length, 0);
    const sent = await asJson(a, `select public.mutate_profile_connection(${literal(b)},'request',${literal(request(1))});`, format);
    assert.equal(sent.friendStatus, 'outgoing');
    const incoming = await asJson(b, "select public.list_profile_connections('incoming',null,20);", format);
    assert.equal(incoming.items.length, 1); assert.equal(incoming.items[0].person.id, a);
    const inbox = await asJson(b, "select public.list_profile_connections('inbox',null,20);", format);
    assert.equal(inbox.items.length, 1); assert.equal(inbox.items[0].kind, 'friend_request');
    assert.equal((await asJson(user(3), "select public.list_profile_connections('inbox',null,20);", format)).items.length, 0);
    assert.equal((await asJson(user(3), "select public.list_profile_connections('incoming',null,20);", format)).items.length, 0);
    assert.equal((await asJson(user(3), `select public.get_profile_connections(${literal(a)});`, format)).friendStatus, 'none');
    await denied(user(3), `select public.mutate_profile_connection(${literal(a)},'accept',${literal(request(1))},1);`, '42501', format);
    await denied(user(3), 'select * from private.connection_requests;', '42501', format);
    const accepted = await asJson(b, `select public.mutate_profile_connection(${literal(a)},'accept',${literal(request(1))},1);`, format);
    assert.equal(accepted.friendStatus, 'friends'); assert.equal(accepted.friendsCount, 1); assert.equal(accepted.following, false);
    const followed = await asJson(a, `select public.mutate_profile_connection(${literal(b)},'follow',null,0,true);`, format);
    assert.equal(followed.following, true); assert.equal(followed.followingCount, 1); assert.equal(followed.friendsCount, 1);
    assert.equal((await asJson(a, "select public.list_profile_connections('following',null,20);", format)).items.length, 1);
    assert.equal((await asJson(b, "select public.list_profile_connections('friends',null,20);", format)).items.length, 1);
    assert.equal((await asJson(a, "select public.list_profile_connections('inbox',null,20);", format)).items[0].kind, 'friend_accepted');
    const read = await asJson(b, `select public.mutate_profile_connection(${literal(b)},'read',null,null,null,array[${literal(inbox.items[0].id)}::uuid]);`, format);
    assert.equal(read.unreadCount, 0);
    for (const source of [`select public.get_profile_connections(${literal(a)});`, "select public.list_profile_connections('inbox',null,20);", `select public.mutate_profile_connection(${literal(b)},'request',${literal(request(2))});`]) {
      await denied('', source, '28000', format);
      await denied(a, source, '42501', format, 'anon');
    }
    evidence.cases.push({ name: `${format} claim format full synthetic relationship flow`, summary: true, list: true,
      requestAcceptFollowInbox: true, nullIdentityDenied: true, anonymousDenied: true, thirdUserIsolation: true });
    console.log(`PASS ${format} claims: summary/list/request/accept/follow/inbox/read and null/anon/third-user isolation`);
  }
  assert.deepEqual(await tablePolicies(), policyBefore); assert.deepEqual(await authSnapshot(), authBefore);
  assert.deepEqual(await powers(), powersBefore);
  assert.deepEqual(await existingObjects(), untouchedBefore);
  evidence.passed = evidence.cases.length; assert.equal(evidence.passed, 4);
}
let serverStarted = false;
try {
  evidence.runtime = await command('postgres', ['--version']);
  assert.match(evidence.runtime, /PostgreSQL\) 17\.11\b/);
  await command('initdb', ['-D', cluster, '-A', 'trust', '-U', connectionUser, '--no-locale', '--encoding=UTF8'], 45000);
  serverStarted = true;
  await command('pg_ctl', ['-D', cluster, '-l', log, '-o', `-h 127.0.0.1 -p ${port} -c max_connections=30`, '-w', '-t', '30', 'start'], 40000);
  const identity = await psql("select json_build_object('directory',current_setting('data_directory'),'version',current_setting('server_version'),'address',host(inet_server_addr()),'port',inet_server_port(),'database',current_database());").done;
  assert.equal(identity.code, 0, identity.stderr);
  const actual = JSON.parse(identity.stdout.trim());
  const normalized = value => resolve(value).replaceAll('\\', '/').toLowerCase();
  assert.equal(normalized(await realpath(actual.directory)), normalized(await realpath(cluster)));
  assert.equal(actual.address, '127.0.0.1'); assert.equal(actual.port, port); assert.equal(actual.database, 'postgres');
  assert.match(actual.version, /^17\.11\b/);
  identityVerified = true; evidence.identity = actual;
  console.log(`Verified fresh isolated cluster: ${actual.directory}, ${actual.address}:${port}, PostgreSQL ${actual.version}`);
  if (authOnly) await query('create role postgres nologin nosuperuser inherit createrole nobypassrls;');
  await query(fixtureSql);
  const allNames = (await readdir(migrationDirectory)).filter(name => name.endsWith('.sql')).sort();
  // Relationship history is replayed explicitly below under the controlled
  // operator. Replaying its canonical copy first would install it twice.
  const names = allNames.filter(name => !name.includes('profile_connections'));
  evidence.excludedCanonicalConnections = allNames.filter(name => name.includes('profile_connections'));
  evidence.canonicalMigrations = [];
  for (const name of names) {
    const source = await readFile(new URL(name, migrationDirectory), 'utf8');
    await query(source);
    evidence.canonicalMigrations.push({ name, sha256: createHash('sha256').update(source).digest('hex') });
  }
  if (authOnly) {
    await managedAuthIdentity();
    console.log('PASS 4/4 native managed-Auth identity cases; no Auth grant options or widened role access.');
  } else {
  // Real PostgreSQL17 application with the same non-superuser fixture as independent DB tests.
  await query(`create role connection_migrator nologin ${aclOnly ? 'inherit' : 'noinherit'} nosuperuser nobypassrls createrole;
    grant usage,create on schema public,private to connection_migrator with grant option;
    grant usage on schema auth to connection_migrator with grant option;
    grant execute on function auth.uid() to connection_migrator with grant option;
    alter table public.profiles owner to connection_migrator;`);
  await query(`set role connection_migrator; ${sql} reset role;`);
  const privileges = await jsonQuery(`select json_build_object('superuser',(select rolsuper from pg_roles where rolname='connection_migrator'),
    'createSchema',has_schema_privilege('connection_rpc','private','create'),
    'setRole',pg_has_role('connection_migrator','connection_rpc','SET'),'inheritRole',pg_has_role('connection_migrator','connection_rpc','USAGE'),
    'owners',(select json_agg(pg_get_userbyid(proowner)) from pg_proc where pronamespace='private'::regnamespace and proname in ('connection_summary','connection_list','connection_mutate')));`);
  assert.equal(privileges.superuser, false); assert.equal(privileges.createSchema, false);
  assert.equal(privileges.setRole, false); assert.equal(privileges.inheritRole, false);
  assert.deepEqual(privileges.owners, ['connection_rpc', 'connection_rpc', 'connection_rpc']);
  evidence.nonSuperuserMigration = privileges;
  if (aclOnly) {
    await aclCorrection();
    console.log(`PASS ${args[3]} original live-shape reproduction and 2/2 native corrective ACL applications.`);
  } else {
  await query(`insert into auth.users(id) values ${Array.from({ length: 24 }, (_, index) => `(${literal(user(index + 1))})`).join(',')};`);

  for (const reverse of [false, true]) {
    await reset();
    const ops = [operation(a, b, 'request', request(1)), operation(b, a, 'request', request(2))];
    if (reverse) ops.reverse();
    await race(`opposite sends ${reverse ? 'B then A' : 'A then B'}`, ...ops, async () => {
      const value = await outcome(ops[0].id);
      assert.equal(value.status, 'pending'); assert.equal(value.requests, 1); assert.equal(value.friendships, 0);
      assert.equal(value.requestEvents, 1); assert.equal(value.acceptEvents, 0); return value;
    });
  }
  for (const action of ['cancel', 'decline']) for (const reverse of [false, true]) {
    await reset(); await prepareRequest();
    const ops = [operation(b, a, 'accept', request(1), 1), operation(action === 'cancel' ? a : b, action === 'cancel' ? b : a, action, request(1), 1)];
    if (reverse) ops.reverse();
    await race(`accept/${action}: ${reverse ? action : 'accept'} commits first`, ...ops, async () => {
      const value = await outcome(); const accepted = !reverse;
      assert.equal(value.status, accepted ? 'accepted' : action === 'cancel' ? 'cancelled' : 'declined');
      assert.equal(value.revision, 2); assert.equal(value.friendships, accepted ? 1 : 0);
      assert.equal(value.requestEvents, 1); assert.equal(value.acceptEvents, accepted ? 1 : 0); return value;
    });
  }
  for (const reverse of [false, true]) {
    await reset(); await prepareRequest();
    const ops = [operation(b, a, 'accept', request(1), 1), operation(a, b, 'remove', request(1))];
    if (reverse) ops.reverse();
    await race(`accept/remove: ${reverse ? 'remove' : 'accept'} commits first`, ...ops, async () => {
      const before = await outcome();
      assert.equal(before.status, reverse ? 'accepted' : 'removed'); assert.equal(before.friendships, reverse ? 1 : 0);
      if (reverse) await query(`begin; ${mutate(a, b, 'remove', request(1))} commit;`);
      await query(`begin; ${mutate(b, a, 'accept', request(1), 1)} commit;`);
      const value = await outcome(); assert.equal(value.status, 'removed'); assert.equal(value.friendships, 0);
      assert.equal(value.revision, 3); assert.equal(value.requestEvents, 1); assert.equal(value.acceptEvents, 1); return { before, afterLateAccept: value };
    });
  }
  for (const reverse of [false, true]) {
    await reset();
    await query(`begin; ${mutate(a, b, 'follow', null, 0, true)} commit;`);
    const valid = operation(a, b, 'follow', null, 1, false);
    // First session must reach pg_sleep, so a stale operation is wrapped in a SQL savepoint below.
    const stale = operation(a, b, 'follow', null, 0, true, '40001');
    if (reverse) {
      // A stale failed transaction cannot hold a lock through commit. Hold the pair first,
      // catch only the expected stale SQLSTATE in that first transaction, then sleep.
      stale.error = null; stale.catchStale = true;
    }
    const ops = reverse ? [stale, valid] : [valid, stale];
    await race(`follow/unfollow stale revision: ${reverse ? 'stale attempt' : 'unfollow'} first`, ...ops, async () => {
      const value = await outcome(); assert.deepEqual(value.follows, [{ enabled: false, revision: 2 }]); return value;
    });
  }
  await reset(); await prepareRequest();
  await race('duplicate accept', operation(b, a, 'accept', request(1), 1), operation(b, a, 'accept', request(1), 1), async () => {
    const value = await outcome(); assert.equal(value.status, 'accepted'); assert.equal(value.revision, 2);
    assert.equal(value.friendships, 1); assert.equal(value.requestEvents, 1); assert.equal(value.acceptEvents, 1); return value;
  });
  for (const reverse of [false, true]) {
    await reset();
    for (let index = 0; index < 19; index++) await query(`begin; ${mutate(a, user(index + 2), 'request', request(100 + index))} commit;`);
    const ops = [operation(a, user(21), 'request', request(201)), operation(a, user(22), 'request', request(202))];
    if (reverse) ops.reverse(); ops[1].error = '54000';
    await race(`sender quota across different pairs: peer ${reverse ? '22' : '21'} first`, ...ops, async () => {
      const value = await outcome(ops[0].id); assert.equal(value.status, 'pending'); assert.equal(value.requests, 20);
      assert.equal(value.requestEvents, 20); assert.equal(value.friendships, 0); assert.equal(value.acceptEvents, 0); return value;
    });
  }
  evidence.passed = evidence.cases.length;
  assert.equal(evidence.passed, 13);
  console.log(`PASS ${evidence.passed}/13 ordered real two-session races; non-superuser schema application also passed.`);
  }
  }
} catch (error) {
  evidence.failure = String(error.stack || error);
  process.exitCode = 1;
  console.error(evidence.failure);
} finally {
  for (const child of clients) child.kill();
  if (serverStarted) {
    try {
      evidence.shutdown = await command('pg_ctl', ['-D', cluster, '-m', 'fast', '-w', '-t', '20', 'stop'], 30000);
    } catch (error) { evidence.shutdownError = String(error); process.exitCode = 1; }
  }
  await writeFile(join(scratch, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(`Evidence retained: ${join(scratch, 'evidence.json')}`);
}
