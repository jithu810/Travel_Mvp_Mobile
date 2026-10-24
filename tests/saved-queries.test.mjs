import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const id = n => `33333333-3333-4333-8333-${String(n).padStart(12,'0')}`;
const row = n => ({id:id(n),title:'Old saved journey '+n,traveler_type:'solo',status:'published',saved:true,is_demo:false,creator_id:other,stops:[]});
function load(path, modules) {
  const exports = {};
  new Function('require','exports',ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{assert.ok(name in modules,name);return modules[name];},exports);
  return exports;
}
const model = load('src/lib/discovery/model.ts',{'../../types/journey':{travelerTypes:['solo','couple','friends','family']}});
function harness(rows, options={}) {
  const calls=[];let listener;let reads=0;let cleaned=false;
  const client = {auth:{
    onAuthStateChange(fn){listener=fn;return {data:{subscription:{unsubscribe(){cleaned=true;}}}};},
    async getUser(){reads++;return {data:{user:{id:options.identity?.(reads) ?? user}},error:options.authError};},
  },rpc(name,args){calls.push({name,args});return {range(start,end){calls.at(-1).range=[start,end];return {async abortSignal(signal){options.beforePage?.({listener,signal});if(options.pending)return new Promise(()=>{});return {data:options.malformed ? null : rows.slice(start,end+1),error:options.error};}};}};}};
  const {loadSavedJourneys}=load('src/lib/social/saved-queries.ts',{
    '../supabase/client':{supabase:client},'../discovery/model':model,
    '../discovery/queries':{resolvePhotos:async (rows,signal)=>{assert.equal(signal.aborted,false);options.photos?.();return rows;}},
  });
  return {run:signal=>loadSavedJourneys(user,signal ?? new AbortController().signal),calls,cleaned:()=>cleaned,change:id=>listener('SIGNED_IN',id?{user:{id}}:null)};
}
test('Saved pages beyond anonymous100 and retains other creators; no duplicate IDs',async()=>{
  const rows=Array.from({length:205},(_,n)=>row(n));rows[100]=rows[99];
  const h=harness(rows);const result=await h.run();assert.equal(result.length,204);assert.ok(result.some(j=>j.id===id(204)));
  assert.deepEqual(h.calls.map(c=>c.range),[[0,99],[100,199],[200,299]]);
  assert.ok(h.calls.every(c=>c.name==='get_account_journeys'&&c.args.collection==='saved'&&c.args.owner_id===user));assert.equal(h.cleaned(),true);
});
test('Saved rejects private/demo/unsaved/malformed rows and returns safe public fields',async()=>{
  const h=harness([row(1),{...row(2),status:'draft'},{...row(3),saved:false},{...row(4),is_demo:true},null,{...row(5),id:'bad'},{...row(6),status:undefined}]);
  const result=await h.run();assert.equal(result.length,1);assert.equal(result[0].id,id(1));assert.equal('creator_id' in result[0],false);
});
test('Saved rejects expired/mismatched and changed identities',async()=>{
  for(const options of [{authError:{message:'expired'}},{identity:()=>other},{identity:n=>n>1?other:user}]){
    const h=harness([row(1)],options);await assert.rejects(h.run(),/Sign in/);assert.equal(h.cleaned(),true);
  }
});
test('Saved rejects auth switches/signout while transport hangs and removes subscription',async()=>{
  for(const next of [other,null]){
    const h=harness([row(1)],{pending:true,beforePage:()=>queueMicrotask(()=>h.change(next))});
    await assert.rejects(h.run(),/cancelled/);assert.equal(h.cleaned(),true);
  }
});
test('Saved abort before and during transport does not return stale cards',async()=>{
  const a=new AbortController();a.abort();const before=harness([row(1)]);await assert.rejects(before.run(a.signal),/cancelled/);assert.equal(before.calls.length,0);
  const b=new AbortController();const during=harness([row(1)],{pending:true,beforePage:()=>queueMicrotask(()=>b.abort())});await assert.rejects(during.run(b.signal),/cancelled/);assert.equal(during.cleaned(),true);
});
test('Saved malformed and failed pages reject instead of claiming an empty collection',async()=>{
  for(const options of [{malformed:true},{error:{message:'offline'}}])await assert.rejects(harness([],options).run(),/Couldn’t load/);
});
