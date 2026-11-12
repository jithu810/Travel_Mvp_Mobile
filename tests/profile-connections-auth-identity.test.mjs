import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { offlineDb, migrations } from '../../travel-mvp-web/scripts/lib/offline-db.mjs';

const originalHash='a94bbf39041bc6c4d4a2ec6b8edd77411eefe9953f9134256fa536825ba05c7f';
const aclHash='0c7f093d44ee70a2d056dd773ccba925f416b2f6a7fcce001acb4bc700703c61';
const names=['connection_summary','connection_list','connection_mutate','get_profile_connections','list_profile_connections','mutate_profile_connection'];
const fnsSql=`select p.proname,p.prosrc,p.proacl::text,p.proconfig,p.prosecdef,p.provolatile,pg_get_userbyid(p.proowner) owner
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('private','public') and p.proname=any($1::text[]) order by p.proname`;
const policiesSql=`select p.polname,p.polroles,pg_get_expr(p.polqual,p.polrelid) qual,pg_get_expr(p.polwithcheck,p.polrelid) check_expr from pg_policy p
  join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname like 'connection_%' order by p.polname`;
const authSql=`select n.nspacl::text schema_acl,pg_get_userbyid(n.nspowner) schema_owner,p.prosrc,p.proacl::text function_acl,pg_get_userbyid(p.proowner) function_owner
  from pg_namespace n join pg_proc p on p.pronamespace=n.oid where n.nspname='auth' and p.proname='uid'`;

async function managedFixture() {
  const db=await offlineDb();
  await migrations(db,name=>!name.includes('profile_connections'));
  await db.exec(`create role managed_auth nologin noinherit nosuperuser nobypassrls;
    create role bridge_migrator nologin inherit nosuperuser nobypassrls createrole;
    create role default_extra nologin nosuperuser nobypassrls;
    create or replace function auth.uid() returns uuid language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'))::uuid
    $$;
    alter schema auth owner to managed_auth;
    alter function auth.uid() owner to managed_auth;
    revoke all on function auth.uid() from public,anon,authenticated;
    grant execute on function auth.uid() to public;
    grant usage on schema auth to bridge_migrator;
    grant usage,create on schema private,public to bridge_migrator with grant option;
    alter table public.profiles owner to bridge_migrator;
    set role bridge_migrator;`);
  const original=await readFile('docs/backend/profile-connections.sql','utf8');
  const acl=await readFile('docs/backend/profile-connections-execute-acl.sql','utf8');
  assert.equal(createHash('sha256').update(original).digest('hex'),originalHash);
  assert.equal(createHash('sha256').update(acl).digest('hex'),aclHash);
  await db.exec(original);
  await db.exec(acl);
  await db.exec('reset role');
  return db;
}

for(const inheritance of ['inherit','noinherit']) test(`managed Auth runtime identity bridge with ${inheritance} non-super installer; RLS/claims/ACLs preserved`,async()=>{
  const db=await managedFixture();
  const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',c='10000000-0000-4000-8000-000000000003';
  const request='20000000-0000-4000-8000-000000000001';
  const rows=async(sql,args=[])=>(await db.query(sql,args)).rows;
  const actor=async(id,json=false)=>{
    await db.exec('reset role;set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[json?'':id??'',json?JSON.stringify(id?{sub:id}:{}):'']);
  };
  const summary=async id=>(await rows('select public.get_profile_connections($1) result',[id]))[0].result;
  const list=async collection=>(await rows('select public.list_profile_connections($1) result',[collection]))[0].result;
  const mutate=async(id,action,revision=null)=>(await rows('select public.mutate_profile_connection($1,$2,$3,$4) result',[id,action,request,revision]))[0].result;
  try {
    const perms=(await rows(`select has_schema_privilege('connection_rpc','auth','usage') role_auth,
      has_schema_privilege('bridge_migrator','auth','usage') installer_auth,
      has_schema_privilege('bridge_migrator','auth','usage with grant option') installer_grant,
      has_function_privilege('bridge_migrator','auth.uid()','execute with grant option') installer_execute_grant`))[0];
    assert.deepEqual(perms,{role_auth:false,installer_auth:true,installer_grant:false,installer_execute_grant:false});
    await rows('insert into auth.users(id) values($1),($2),($3)',[a,b,c]);
    await actor(a);
    for(const operation of [()=>summary(a),()=>list('inbox'),()=>mutate(b,'request')])await assert.rejects(operation(),error=>error.code==='42501'&&/schema auth/.test(error.message));
    await db.exec('reset role');
    const before=(await rows(fnsSql,[names]));
    const policiesBefore=await rows(policiesSql);
    const authBefore=await rows(authSql);
    const memberSql=`select m.grantor,m.admin_option,m.inherit_option,m.set_option from pg_auth_members m join pg_roles r on r.oid=m.roleid join pg_roles member on member.oid=m.member where r.rolname='connection_rpc' and member.rolname='bridge_migrator' order by m.grantor`;
    const memberships=await rows(memberSql);
    await db.exec(`alter role bridge_migrator ${inheritance};set role bridge_migrator;
      alter default privileges in schema private grant execute on functions to default_extra;`);
    await db.exec(await readFile('docs/backend/profile-connections-auth-identity.sql','utf8'));
    await db.exec('reset role');
    const after=await rows(fnsSql,[names]);
    for(const fn of after){
      const previous=before.find(row=>row.proname===fn.proname);
      assert.equal(fn.prosrc,fn.proname.startsWith('connection_')?previous.prosrc.replace('auth.uid()','private.connection_uid()'):previous.prosrc,`${fn.proname} only identity expression changes`);
      for(const key of ['proacl','proconfig','prosecdef','provolatile','owner'])assert.deepEqual(fn[key],previous[key],`${fn.proname} unchanged ${key}`);
    }
    assert.deepEqual(await rows(policiesSql),policiesBefore,'all six policies unchanged');
    assert.deepEqual(await rows(authSql),authBefore,'managed Auth unchanged');
    assert.deepEqual(await rows(memberSql),memberships,'temporary membership removed');
    const helper=(await rows(`select pg_get_userbyid(p.proowner) owner,p.prosrc,p.prosecdef,p.provolatile,p.proconfig,
      has_function_privilege('anon',p.oid,'execute') anon_execute,has_function_privilege('authenticated',p.oid,'execute') auth_execute,
      has_function_privilege('default_extra',p.oid,'execute') extra_execute,has_function_privilege('connection_rpc',p.oid,'execute') role_execute,
      exists(select 1 from aclexplode(p.proacl) x where x.grantee=0 and x.privilege_type='EXECUTE') public_execute
      from pg_proc p where p.oid='private.connection_uid()'::regprocedure`))[0];
    assert.deepEqual(helper,{owner:'bridge_migrator',prosrc:' select auth.uid() ',prosecdef:true,provolatile:'s',proconfig:['search_path=""'],anon_execute:false,auth_execute:false,extra_execute:false,role_execute:true,public_execute:false});
    assert.equal((await rows("select has_schema_privilege('connection_rpc','auth','usage') permitted"))[0].permitted,false);
    assert.equal((await rows("select has_schema_privilege('connection_rpc','private','create') permitted"))[0].permitted,false);
    assert.equal((await rows("select pg_has_role('bridge_migrator','connection_rpc','SET') permitted"))[0].permitted,false);
    assert.equal((await rows("select pg_has_role('bridge_migrator','connection_rpc','USAGE') permitted"))[0].permitted,false);
    await actor(null);
    await assert.rejects(summary(a),error=>error.code==='28000');
    await actor(a);
    assert.equal((await summary(a)).friendsCount,0);
    assert.equal((await mutate(b,'request')).friendStatus,'outgoing');
    await actor(c);
    assert.equal((await list('inbox')).items.length,0);
    await assert.rejects(mutate(a,'accept',1),error=>error.code==='42501');
    await actor(b,true);
    assert.equal((await summary(a)).friendStatus,'incoming');
    assert.equal((await list('inbox')).items[0].kind,'friend_request');
    assert.equal((await mutate(a,'accept',1)).friendStatus,'friends');
    assert.equal((await list('friends')).items[0].person.id,a);
    await actor(a,true);
    assert.equal((await list('inbox')).items[0].kind,'friend_accepted');
    await assert.rejects(db.query('select private.connection_uid()'),error=>error.code==='42501');
    await db.exec('reset role;set role anon');
    await assert.rejects(db.query('select private.connection_uid()'),error=>error.code==='42501');
    await assert.rejects(summary(a),error=>error.code==='42501');
    await db.exec('reset role');
    // Existing policy expressions are stored OIDs and need no auth schema lookup.
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[c]);
    await db.exec('set role connection_rpc');
    assert.equal((await rows('select count(*)::int n from private.connection_friendships'))[0].n,0);
    await db.exec('reset role');
  } finally {await db.close();}
});

test('identity proposal source guard refuses unexpected baseline atomically',async()=>{
  const db=await managedFixture();
  try {
    await db.exec('set role bridge_migrator;grant connection_rpc to current_user with inherit true,set true');
    const definition=(await db.query("select pg_get_functiondef('private.connection_summary(uuid)'::regprocedure) definition")).rows[0].definition;
    await db.exec(definition.replace("'Profile unavailable'","'Unexpected profile logic'"));
    await db.exec('revoke connection_rpc from current_user');
    await assert.rejects(db.exec(await readFile('docs/backend/profile-connections-auth-identity.sql','utf8')),/differs from reviewed identity baseline/);
    await db.exec('rollback;reset role');
    assert.equal((await db.query("select to_regprocedure('private.connection_uid()') missing")).rows[0].missing,null);
  } finally {await db.close();}
});
