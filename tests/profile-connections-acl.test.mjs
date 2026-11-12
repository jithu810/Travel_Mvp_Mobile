import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { offlineDb, migrations } from '../../travel-mvp-web/scripts/lib/offline-db.mjs';

const originalHash='a94bbf39041bc6c4d4a2ec6b8edd77411eefe9953f9134256fa536825ba05c7f';
const functionNames=['connection_summary','connection_list','connection_mutate','get_profile_connections','list_profile_connections','mutate_profile_connection'];
const functionsSql=`select n.nspname,p.proname,pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig,p.prosrc,
  has_function_privilege('anon',p.oid,'execute') anon_execute,has_function_privilege('authenticated',p.oid,'execute') auth_execute,
  exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE') public_execute
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname=any($1::text[]) order by p.proname`;

for(const inheritance of ['inherit','noinherit']) test(`exact live original state; non-super ${inheritance} corrective actor restricts execute without changing bodies or rows`,async()=>{
  const db=await offlineDb();
  const actor='10000000-0000-4000-8000-000000000001';
  try {
    // Replay prerequisite canonical history; relationship SQL is deliberately
    // applied below under the controlled non-super migration actor.
    await migrations(db,name=>!name.includes('profile_connections'));
    const original=await readFile('docs/backend/profile-connections.sql','utf8');
    assert.equal(createHash('sha256').update(original).digest('hex'),originalHash,'never rewrite applied original');
    // Mirrors the hosted non-superuser INHERIT migration actor. Schema/column
    // grant options and ownership are fixture setup only, never hosted operations.
    await db.exec(`create role acl_migrator nologin inherit nosuperuser nobypassrls createrole;
      grant usage,create on schema public,private to acl_migrator with grant option;
      grant usage on schema auth to acl_migrator with grant option;
      grant execute on function auth.uid() to acl_migrator with grant option;
      alter table public.profiles owner to acl_migrator;
      set role acl_migrator;`);
    // PostgreSQL ACL permission warnings do not abort this transaction. Its
    // 'commit succeeded' result therefore cannot substitute for ACL inspection.
    await db.exec(original);
    await db.exec('reset role');
    const before=(await db.query(functionsSql,[functionNames])).rows;
    assert.equal(before.length,6);
    const bad=before.find(row=>row.proname==='connection_mutate');
    assert.equal(bad.anon_execute,true,'reproduce the observed hosted ACL defect');
    assert.equal(bad.public_execute,true);
    for(const fn of before.filter(row=>row.proname!=='connection_mutate')){assert.equal(fn.anon_execute,false);assert.equal(fn.public_execute,false);assert.equal(fn.auth_execute,true);}
    await db.query('insert into auth.users(id) values($1)',[actor]);
    const tablesBefore=(await db.query("select c.oid,c.relname,c.relrowsecurity,c.relacl::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relkind='r' and c.relname like 'connection_%' order by c.relname")).rows;
    const memberships=(await db.query("select m.grantor,m.admin_option,m.inherit_option,m.set_option from pg_auth_members m join pg_roles r on r.oid=m.roleid join pg_roles member on member.oid=m.member where r.rolname='connection_rpc' and member.rolname='acl_migrator' order by m.grantor")).rows;
    // Install the original as the actual hosted INHERIT actor, then vary only
    // the corrective operator. Original installation under NOINHERIT is a
    // different (three-helper ACL) defect and outside this sole-mutator patch.
    await db.exec(`alter role acl_migrator ${inheritance}`);
    await db.exec('set role acl_migrator');
    await db.exec(await readFile('docs/backend/profile-connections-execute-acl.sql','utf8'));
    // Retrying the reviewed correction changes neither grants nor role powers.
    await db.exec(await readFile('docs/backend/profile-connections-execute-acl.sql','utf8'));
    await db.exec('reset role');
    const after=(await db.query(functionsSql,[functionNames])).rows;
    for(const fn of after){
      assert.equal(fn.anon_execute,false,fn.proname);assert.equal(fn.public_execute,false,fn.proname);assert.equal(fn.auth_execute,true,fn.proname);
      const previous=before.find(row=>row.proname===fn.proname);
      for(const key of ['owner','prosecdef','proconfig','prosrc'])assert.deepEqual(fn[key],previous[key],`${fn.proname} unchanged ${key}`);
    }
    assert.deepEqual((await db.query("select c.oid,c.relname,c.relrowsecurity,c.relacl::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relkind='r' and c.relname like 'connection_%' order by c.relname")).rows,tablesBefore);
    assert.deepEqual((await db.query("select m.grantor,m.admin_option,m.inherit_option,m.set_option from pg_auth_members m join pg_roles r on r.oid=m.roleid join pg_roles member on member.oid=m.member where r.rolname='connection_rpc' and member.rolname='acl_migrator' order by m.grantor")).rows,memberships,'automatic ADMIN-only membership preserved; temporary grant removed');
    assert.equal((await db.query("select pg_has_role('acl_migrator','connection_rpc','SET') permitted")).rows[0].permitted,false);
    assert.equal((await db.query("select pg_has_role('acl_migrator','connection_rpc','USAGE') permitted")).rows[0].permitted,false);
    assert.equal((await db.query("select has_schema_privilege('connection_rpc','private','create') permitted")).rows[0].permitted,false);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[actor]);
    const summary=(await db.query('select public.get_profile_connections($1) result',[actor])).rows[0].result;
    assert.equal(summary.targetId,actor);assert.equal(summary.friendsCount,0);assert.equal(summary.unreadCount,0);
    await db.exec('reset role;set role anon');
    await assert.rejects(db.query('select public.get_profile_connections($1)',[actor]),error=>error.code==='42501');
    await assert.rejects(db.query("select private.connection_mutate($1,'read',null,null,null,null)",[actor]),error=>error.code==='42501');
    await db.exec('reset role');
    assert.equal((await db.query('select count(*)::int n from public.profiles where id=$1',[actor])).rows[0].n,1);
  } finally {await db.close();}
});
