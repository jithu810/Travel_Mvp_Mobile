import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const user='10000000-0000-4000-8000-000000000001', peer='10000000-0000-4000-8000-000000000002', third='10000000-0000-4000-8000-000000000003';
const request='20000000-0000-4000-8000-000000000001';
const base={targetId:peer,friendStatus:'none',requestId:null,requestRevision:null,following:false,followRevision:0,friendsCount:0,followingCount:0,unreadCount:0};
const item={id:peer,person:{id:peer,username:'traveler_b',displayName:'Traveler B',avatar:null},requestId:null,revision:1,status:null,kind:null,readAt:null,createdAt:'2026-11-02T01:00:00Z'};
function harness(options={}) {
  const calls=[];let listener,cleaned=0,verifications=0;
  const client={auth:{onAuthStateChange(fn){listener=fn;return {data:{subscription:{unsubscribe(){cleaned++;}}}};},async getUser(){verifications++;return {data:{user:{id:options.identity?.(verifications)??user}},error:options.authError};}},
    rpc(name,args){calls.push({name,args});return {async abortSignal(signal){options.beforeRpc?.({listener,signal});if(options.throw)throw new Error(options.throw);if(options.pending)return new Promise(()=>{});return {data:options.data??(name==='list_profile_connections'?{items:[],nextCursor:null}:{...base,targetId:args.target_id}),error:options.error};}};}};
  const storage={storage:{from(bucket){assert.equal(bucket,'profile-avatars');return {async createSignedUrls(paths,expiry){assert.equal(expiry,3600);options.sign?.(paths);return {data:paths.map(()=>({signedUrl:'https://example.com/avatar.jpg'}))};}};}}};
  const exports={};
  const modules={'../supabase/client':{supabase:options.clientNull?null:client},'../supabase/public':{publicSupabase:storage},'../discovery/model':{isJourneyId:value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),object:value=>value&&typeof value==='object'&&!Array.isArray(value)?value:null}};
  new Function('require','exports','setTimeout','clearTimeout',ts.transpileModule(readFileSync('src/lib/connections/queries.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{assert.ok(name in modules,name);return modules[name];},exports,(fn,delay)=>setTimeout(fn,options.timeout??delay),clearTimeout);
  return {...exports,port:()=>exports.connectionPort(peer,user,'opaque'),calls,cleaned:()=>cleaned,change:id=>listener('SIGNED_IN',id?{user:{id}}:null)};
}
const signal=()=>new AbortController().signal;
test('summary strict projection validates relationship state and discards private fields',()=>{
  const h=harness();assert.deepEqual(h.normalizeConnectionSummary({...base,email:'secret'},peer),base);
  for(const patch of [{targetId:third},{friendsCount:-1},{following:'true'},{friendStatus:'friends'},{requestRevision:0},{followRevision:Infinity}])assert.equal(h.normalizeConnectionSummary({...base,...patch},peer),null);
});
test('read verifies identity before/after and uses exact RPC without mutation',async()=>{
  const h=harness();assert.deepEqual(await h.port().read(signal()),base);
  assert.deepEqual(h.calls,[{name:'get_profile_connections',args:{target_id:peer}}]);assert.equal(h.cleaned(),1);
});
test('write supports a list peer distinct from bound profile and preserves desired-state arguments',async()=>{
  const h=harness();const value=await h.port().write(third,{action:'follow',enabled:false,expectedRevision:2},signal());
  assert.equal(value.targetId,third);assert.deepEqual(h.calls[0],{name:'mutate_profile_connection',args:{target_id:third,action:'follow',request_id:null,expected_revision:2,enabled:false,notification_ids:null}});
});
test('list strips identities and signs only safe owner-prefixed public avatar references',async()=>{
  let signed;
  const h=harness({data:{items:[{...item,person:{...item.person,avatar:`profile-avatars/${peer}/avatar.jpg`,email:'secret'}}],nextCursor:null},sign:paths=>{signed=paths;}});
  const page=await h.port().list('following',null,signal());assert.deepEqual(signed,[`${peer}/avatar.jpg`]);assert.equal(page.items[0].person.avatar,'https://example.com/avatar.jpg');assert.equal('email' in page.items[0].person,false);
});
test('malformed pages, duplicates, wrong kinds and unknown counts fail closed',async()=>{
  for(const data of [{items:[item,item],nextCursor:null},{items:[{...item,revision:null}],nextCursor:null},{items:[{...item,kind:'friend_request'}],nextCursor:null},{items:[],nextCursor:5}]){
    const h=harness({data});await assert.rejects(h.port().list('following',null,signal()),/verify connections/);
  }
  const h=harness({data:{...base,targetId:third}});await assert.rejects(h.port().read(signal()),/verify connections/);
});
test('legal whitespace-only profile names use handle or Traveler without breaking own inbox',async()=>{
  for(const username of [item.person.username,null]){
    const h=harness({data:{items:[{...item,person:{...item.person,username,displayName:' \t\n\u00a0 '}}],nextCursor:null}});
    const page=await h.port().list('following',null,signal());assert.equal(page.items[0].person.displayName,username??'Traveler');
  }
});
test('authentication mismatch or initial abort prevents any RPC',async()=>{
  const h=harness({identity:()=>third});await assert.rejects(h.port().read(signal()),/Sign in/);assert.equal(h.calls.length,0);
  const h2=harness();const c=new AbortController();c.abort();await assert.rejects(h2.port().read(c.signal),/cancelled|load connections/);assert.equal(h2.calls.length,0);assert.equal(h2.cleaned(),1);
});
test('changed identity after read rejects stale data; auth switch cancels a hanging mutation',async()=>{
  const h=harness({identity:n=>n===1?user:third});await assert.rejects(h.port().read(signal()),/Sign in/);
  const pending=harness({pending:true});const task=pending.port().write(peer,{action:'request',requestId:request},signal());
  await new Promise(resolve=>setImmediate(resolve));pending.change(third);await assert.rejects(task,/unconfirmed/);assert.equal(pending.cleaned(),1);
});
test('caller cancellation of hung reads cleans auth subscription',async()=>{
  const h=harness({pending:true});const c=new AbortController();const task=h.port().list('inbox',null,c.signal);await new Promise(resolve=>setImmediate(resolve));c.abort();await assert.rejects(task,/cancelled/);assert.equal(h.cleaned(),1);
});
test('deadline bounds hanging transport, marks write unconfirmed and never retries',async()=>{
  const h=harness({pending:true,timeout:10});await assert.rejects(h.port().write(peer,{action:'request',requestId:request},signal()),/unconfirmed/);assert.equal(h.cleaned(),1);assert.equal(h.calls.length,1);
});
test('missing RPC is feature unavailable and server/network messages never leak',async()=>{
  const h=harness({error:{code:'PGRST202',message:'secret'}});await assert.rejects(h.port().read(signal()),/^Error: Connections are not available in this build yet\.$/);
  for(const options of [{throw:'Bearer credential-value'},{error:{code:'other',message:'Bearer credential-value'}}]){
    const x=harness(options);await assert.rejects(x.port().write(peer,{action:'request',requestId:request},signal()),error=>/unconfirmed/.test(error.message)&&!/credential/.test(error.message));
  }
});
test('invalid mutation has no RPC; stale revisions are explicit and no retry occurs',async()=>{
  const h=harness();await assert.rejects(h.port().write(peer,{action:'accept',requestId:request,expectedRevision:0},signal()),/Invalid/);assert.equal(h.calls.length,0);
  const stale=harness({error:{code:'40001'}});await assert.rejects(stale.port().write(peer,{action:'follow',enabled:true,expectedRevision:0},signal()),/changed/);assert.equal(stale.calls.length,1);
});
