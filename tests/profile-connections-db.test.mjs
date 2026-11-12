import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { offlineDb, migrations, as } from '../../travel-mvp-web/scripts/lib/offline-db.mjs';

async function pageNormalizer() {
  const exports={};
  const modules={'../supabase/client':{supabase:null},'../supabase/public':{publicSupabase:null},'../discovery/model':{
    object:value=>value&&typeof value==='object'&&!Array.isArray(value)?value:null,
    isJourneyId:value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)}};
  new Function('require','exports',ts.transpileModule(await readFile('src/lib/connections/queries.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{assert.ok(name in modules);return modules[name];},exports);
  return exports.normalizeConnectionPage;
}

// In-memory PGlite only: no DSN, .env, socket, hosted RPC or credentials.
test('connections schema, participant isolation, transitions, durable inbox and stale replay', async () => {
  const db = await offlineDb();
  const a='10000000-0000-4000-8000-000000000001', b='10000000-0000-4000-8000-000000000002', c='10000000-0000-4000-8000-000000000003';
  const r=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const query=async(sql,args=[])=> (await db.query(sql,args)).rows;
  const summary=async id=>(await query('select public.get_profile_connections($1) result',[id]))[0].result;
  const list=async(collection,cursor=null,limit=20)=>(await query('select public.list_profile_connections($1,$2,$3) result',[collection,cursor,limit]))[0].result;
  const mutate=async(id,action,request=null,revision=null,enabled=null,ids=null)=>(await query('select public.mutate_profile_connection($1,$2,$3,$4,$5,$6) result',[id,action,request,revision,enabled,ids]))[0].result;
  const deny=async(promise,code)=>assert.rejects(promise,error=>error.code===code);
  try {
    await migrations(db,name=>!name.includes('profile_connections'));
    await db.exec(await readFile('docs/backend/profile-connections.sql','utf8'));
    await query('insert into auth.users(id) values ($1),($2),($3)',[a,b,c]);
    await query("update public.profiles set display_name='   ' where id=$1",[a]);
    await as(db,'anon');
    await deny(summary(b),'42501');
    await deny(mutate(b,'request',r(1)),'42501');
    await as(db,'authenticated',a);
    await deny(query('select * from private.connection_requests'),'42501');
    await deny(query('insert into private.connection_friendships(user_low,user_high,request_id) values($1,$2,$3)',[a,b,r(1)]),'42501');
    await deny(mutate(a,'request',r(1)),'22023');
    const outgoing=await mutate(b,'request',r(1));
    assert.equal(outgoing.friendStatus,'outgoing'); assert.equal(outgoing.requestRevision,1);
    assert.equal((await mutate(b,'request',r(1))).requestId,r(1));
    await as(db,'authenticated',b);
    assert.equal((await summary(a)).friendStatus,'incoming');
    assert.equal((await mutate(a,'request',r(2))).friendStatus,'incoming','opposite request never accepts');
    let inbox=await list('inbox');
    assert.equal(inbox.items.length,1); assert.equal(inbox.items[0].kind,'friend_request'); assert.equal(inbox.items[0].status,'pending');
    assert.equal(inbox.items[0].person.displayName,inbox.items[0].person.username,'whitespace-only legal display name uses usable public handle');
    assert.ok((await pageNormalizer())(inbox,'inbox'),'real requester whitespace-name projection remains valid for recipient adapter');
    assert.ok((await pageNormalizer())(await list('incoming'),'incoming'));
    const notice=inbox.items[0].id;
    assert.equal((await summary(b)).unreadCount,1);
    await mutate(b,'read',null,null,null,[notice]);
    assert.equal((await summary(b)).unreadCount,0);
    assert.ok((await list('inbox')).items[0].readAt);
    await as(db,'authenticated',c);
    assert.deepEqual((await list('inbox')).items,[]);
    await deny(mutate(b,'accept',r(1),1),'42501');
    await deny(mutate(c,'read',null,null,null,[notice]),'42501');
    await as(db,'authenticated',a);
    await deny(mutate(b,'accept',r(1),1),'42501');
    await as(db,'authenticated',b);
    await deny(mutate(a,'accept',r(1),9),'40001');
    assert.equal((await mutate(a,'accept',r(1),1)).friendStatus,'friends');
    assert.equal((await mutate(a,'accept',r(1),1)).friendStatus,'friends','accept retry safe');
    assert.equal((await list('friends')).items[0].requestId,r(1));
    assert.equal((await list('inbox')).items[0].status,'accepted','durable event reflects current request');
    assert.equal((await summary(a)).following,false,'friendship does not imply Follow');
    await as(db,'authenticated',a);
    inbox=await list('inbox'); assert.equal(inbox.items.length,1); assert.equal(inbox.items[0].kind,'friend_accepted');
    assert.equal((await summary(b)).friendsCount,1);
    const following=await mutate(b,'follow',null,0,true);
    assert.equal(following.following,true); assert.equal(following.followRevision,1);
    assert.equal((await list('following')).items[0].revision,1);
    assert.equal((await mutate(b,'follow',null,1,false)).following,false);
    await deny(mutate(b,'follow',null,0,true),'40001');
    assert.equal((await summary(b)).friendsCount,1,'unfollow keeps friendship');
    assert.equal((await mutate(b,'remove',r(1))).friendStatus,'none');
    await as(db,'authenticated',b);
    assert.equal((await mutate(a,'accept',r(1),1)).friendStatus,'none','late accept cannot resurrect');
    await as(db,'authenticated',a);
    assert.equal((await mutate(b,'request',r(1))).friendStatus,'none','old send cannot resurrect');
    await mutate(b,'request',r(3));
    await as(db,'authenticated',b);
    await mutate(a,'decline',r(3),1);
    await as(db,'authenticated',a);
    await mutate(b,'request',r(4));
    await mutate(b,'cancel',r(4),1);
    await as(db,'authenticated',b);
    assert.equal((await mutate(a,'accept',r(4),1)).friendStatus,'none','cancel wins before accept');
    assert.equal((await list('inbox')).items.length,3,'one request event per generation');
    const page=await list('inbox',null,1); assert.equal(page.items.length,1); assert.ok(page.nextCursor);
    const next=await list('inbox',page.nextCursor,1); assert.notEqual(next.items[0].id,page.items[0].id);
    await deny(list('inbox','invalid'),'22023');
    await deny(list('other'),'22023');
    await db.exec('reset role');
    const role=(await query("select rolcanlogin,rolinherit,rolsuper,rolbypassrls from pg_roles where rolname='connection_rpc'"))[0];
    assert.deepEqual(role,{rolcanlogin:false,rolinherit:false,rolsuper:false,rolbypassrls:false});
    const fns=await query("select n.nspname,p.proname,p.prosecdef,p.proconfig,has_function_privilege('anon',p.oid,'execute') anon_exec from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname in ('get_profile_connections','list_profile_connections','mutate_profile_connection','connection_summary','connection_list','connection_mutate')");
    assert.equal(fns.length,6); for(const fn of fns){assert.equal(fn.anon_exec,false);assert.equal(fn.prosecdef,fn.nspname==='private');assert.deepEqual(fn.proconfig,['search_path=""']);}
    await as(db,'authenticated',''); await deny(summary(a),'28000');
    await db.exec('reset role');
    await query('delete from auth.users where id=$1',[a]);
    assert.equal((await query('select count(*)::int n from private.connection_requests'))[0].n,0);
    assert.equal((await query('select count(*)::int n from private.connection_notifications'))[0].n,0);
    assert.equal((await query('select count(*)::int n from private.connection_follows'))[0].n,0);
    // Sender limits count terminal requests too, so cancel/re-send cannot flood indefinitely.
    await query('insert into auth.users(id) values($1)',[a]);
    await as(db,'authenticated',a);
    for(let n=10;n<30;n++){await mutate(b,'request',r(n));await mutate(b,'cancel',r(n),1);}
    await deny(mutate(b,'request',r(30)),'54000');
    await as(db,'authenticated',b);
    const notices=await list('inbox'); assert.equal(notices.items.length,20);
    await deny(mutate(b,'read',null,null,null,[notices.items[0].id,r(999)]),'42501');
    assert.equal((await summary(b)).unreadCount,20,'invalid read batch makes no partial acknowledgement');
    await mutate(b,'read',null,null,null,[notices.items[0].id]);
    const readAt=(await list('inbox')).items.find(item=>item.id===notices.items[0].id).readAt;
    await mutate(b,'read',null,null,null,[notices.items[0].id]);
    assert.equal((await list('inbox')).items.find(item=>item.id===notices.items[0].id).readAt,readAt,'read acknowledgement is idempotent');
    await db.exec('reset role');
    // Rollback is tested only against this synthetic disposable database.
    await db.exec(await readFile('docs/backend/profile-connections-rollback.sql','utf8'));
    assert.equal((await query("select to_regclass('private.connection_requests') as object"))[0].object,null);
    assert.equal((await query("select count(*)::int n from pg_roles where rolname='connection_rpc'"))[0].n,0);
    assert.ok((await query("select to_regprocedure('public.get_public_profile(text)') as existing"))[0].existing,'existing API survives rollback');
  } finally { await db.close(); }
});

test('proposal transfers ownership under a non-superuser migration owner and removes temporary powers',async()=>{
  const db=await offlineDb();
  try {
    await migrations(db,name=>!name.includes('profile_connections'));
    await db.exec(`create role connection_migrator nologin noinherit nosuperuser nobypassrls createrole;
      grant usage,create on schema public,private to connection_migrator with grant option;
      grant usage on schema auth to connection_migrator with grant option;
      grant execute on function auth.uid() to connection_migrator with grant option;
      alter table public.profiles owner to connection_migrator;
      set role connection_migrator;`);
    await db.exec(await readFile('docs/backend/profile-connections.sql','utf8'));
    await db.exec('reset role');
    const rows=(await db.query(`select p.proname,pg_get_userbyid(p.proowner) owner from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='private' and p.proname in ('connection_summary','connection_list','connection_mutate')`)).rows;
    assert.equal(rows.length,3);for(const row of rows)assert.equal(row.owner,'connection_rpc');
    assert.equal((await db.query("select has_schema_privilege('connection_rpc','private','create') permitted")).rows[0].permitted,false);
    const membership=(await db.query("select r.rolname role,member.rolname member,grantor.rolname grantor,m.admin_option,m.inherit_option,m.set_option from pg_auth_members m join pg_roles r on r.oid=m.roleid join pg_roles member on member.oid=m.member join pg_roles grantor on grantor.oid=m.grantor where r.rolname='connection_rpc' and member.rolname='connection_migrator'")).rows;
    // PG17 CREATEROLE automatically leaves a bootstrap-granted ADMIN-only record.
    // The explicit migration grant is gone; that record grants neither SET nor INHERIT.
    assert.ok(membership.every(row=>row.grantor==='postgres'&&row.admin_option&&!row.inherit_option&&!row.set_option));
    assert.equal((await db.query("select pg_has_role('connection_migrator','connection_rpc','SET') permitted")).rows[0].permitted,false);
    assert.equal((await db.query("select pg_has_role('connection_migrator','connection_rpc','USAGE') permitted")).rows[0].permitted,false);
  } finally {await db.close();}
});
