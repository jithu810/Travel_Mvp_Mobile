import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
function load(file,modules={},timers=globalThis){const exports={};new Function('require','exports','setTimeout','clearTimeout',ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>{assert.ok(name in modules,name);return modules[name];},exports,timers.setTimeout,timers.clearTimeout);return exports;}
const {createRequestCache}=load('src/lib/discovery/request-cache.ts');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(setImmediate);
const signal=()=>new AbortController().signal;
test('cache coalesces, expires, bounds entries and never caches failures',async()=>{
 let now=0,calls=0;const cache=createRequestCache(1,45,()=>now);const fetch=async()=>++calls;
 assert.deepEqual(await Promise.all([cache.get('a',signal(),fetch),cache.get('a',signal(),fetch)]),[1,1]);
 assert.equal(await cache.get('a',signal(),fetch),1);now=46;assert.equal(await cache.get('a',signal(),fetch),2);
 await cache.get('b',signal(),fetch);assert.equal(await cache.get('a',signal(),fetch),4);
 cache.clear();await assert.rejects(cache.get('a',signal(),async()=>{throw Error('offline');}),/offline/);assert.equal(await cache.get('a',signal(),fetch),5);
});
test('subscriber abort is independent, final abort stops upstream and bounded pending rejects',async()=>{
 const cache=createRequestCache(1,45),d=deferred(),a=new AbortController(),b=new AbortController();let upstream;
 const fetch=s=>{upstream=s;return d.promise;};
 const first=cache.get('a',a.signal,fetch),second=cache.get('a',b.signal,fetch);await tick();a.abort();await assert.rejects(first,/cancelled/);assert.equal(upstream.aborted,false);
 await assert.rejects(cache.get('b',signal(),fetch),/Too many/);b.abort();await assert.rejects(second,/cancelled/);assert.equal(upstream.aborted,true);
 d.resolve('late');await tick();assert.equal(await cache.get('a',signal(),async()=> 'fresh'),'fresh');
});
test('invalidation prevents late old request repopulation',async()=>{
 const cache=createRequestCache(1,45),old=deferred();const before=cache.get('a',signal(),()=>old.promise);await tick();cache.clear();
 assert.equal(await cache.get('a',signal(),async()=> 'new'),'new');old.resolve('old');assert.equal(await before,'old');assert.equal(await cache.get('a',signal(),async()=> 'wrong'),'new');
});
const id='11111111-1111-4111-8111-111111111111';
const row={id,title:'Public',is_demo:false,traveler_type:'solo',cover_image_path:'journey-media/user/journey/a.jpg',stops:[]};
const model=load('src/lib/discovery/model.ts',{'../../types/journey':{travelerTypes:['solo','couple','friends','family']}});
function queries(options={}){
 const calls=[],signs=[];let active=0,peak=0;
 const client={rpc(name,args){calls.push({name,args});return {abortSignal:async()=>({data:args.journey_filter ? (options.withdrawn ? []:[row]):[row],error:null})};},storage:{from(){return {async createSignedUrls(paths){signs.push(paths);active++;peak=Math.max(peak,active);await options.wait?.();active--;return {data:paths.map(path=>options.fail?.(path)?{error:'missing'}:{signedUrl:'https://test.invalid/'+path}),error:null};}};}}};
 const api=load('src/lib/discovery/queries.ts',{'../supabase/public':{publicSupabase:client},'./model':model,'./request-cache':{createRequestCache},'../media/image-variants':load('src/lib/media/image-variants.ts')},options.timers);
 return {api,calls,signs,peak:()=>peak};
}
test('public collection and simultaneous per-path signing reused; explicit refresh bypasses both',async()=>{
 const h=queries();await Promise.all([h.api.loadPublicJourneys(signal()),h.api.loadPublicJourneys(signal())]);assert.equal(h.calls.length,1);assert.equal(h.signs.flat().length,1);
 await h.api.loadPublicJourneys(signal());assert.equal(h.calls.length,1);h.api.invalidatePublicJourneys();await h.api.loadPublicJourneys(signal());assert.equal(h.calls.length,2);assert.equal(h.signs.length,2);
});
test('hung signing transport releases worker slots at deadline and late response cannot replace fresh signatures',async()=>{
 const deadlines=[];let calls=0;const hanging=deferred();
 const h=queries({timers:{setTimeout:fn=>{deadlines.push(fn);return fn;},clearTimeout(){}},wait:()=>++calls<=2?hanging.promise:Promise.resolve()});
 const rows=Array.from({length:64},(_,n)=>({id:String(n),cover:'journey-media/user/journey/hung'+n+'.jpg',stops:[]}));
 const first=h.api.resolvePhotos(rows,signal());await tick();assert.equal(calls,2);deadlines.splice(0).forEach(fn=>fn());const missing=await first;assert.ok(missing.every(j=>j.cover===null));
 const fresh=await h.api.resolvePhotos([{id:'fresh',cover:'journey-media/user/journey/fresh.jpg',stops:[]}],signal());assert.ok(fresh[0].cover);assert.equal(calls,3);
 hanging.resolve();await tick();assert.equal((await h.api.resolvePhotos([{id:'fresh',cover:'journey-media/user/journey/fresh.jpg',stops:[]}],signal()))[0].cover,fresh[0].cover);
});
test('batch signing is bounded, deduplicated and partial failures retry individually',async()=>{
 let fail=true;const h=queries({fail:path=>fail&&path.endsWith('/0.jpg'),wait:tick});
 const rows=Array.from({length:90},(_,n)=>({id:String(n),cover:'journey-media/user/journey/'+n+'.jpg',stops:[]}));
 const [a,b]=await Promise.all([h.api.resolvePhotos(rows,signal()),h.api.resolvePhotos(rows,signal())]);assert.equal(a[0].cover,null);assert.equal(b[89].cover,a[89].cover);assert.equal(h.signs.flat().length,90);assert.ok(h.signs.every(paths=>paths.length<=32));assert.ok(h.peak()<=2);
 fail=false;const result=await h.api.resolvePhotos(rows,signal());assert.ok(result[0].cover);assert.equal(h.signs.flat().length,91);
});
test('signing overflow is bounded with fallback and detail visibility always bypasses public cache',async()=>{
 const h=queries({wait:tick,withdrawn:true});const rows=Array.from({length:600},(_,n)=>({id:String(n),cover:'journey-media/user/journey/'+n+'.jpg',stops:[]}));
 const result=await h.api.resolvePhotos(rows,signal());assert.ok(h.signs.flat().length<=512);assert.ok(result.some(row=>row.cover===null));
 await h.api.loadPublicJourneys(signal());assert.equal(await h.api.loadPublicJourney(id,signal()),null);assert.ok(h.calls.some(call=>call.args.journey_filter===id));assert.equal(h.calls.some(call=>call.name==='get_journey_detail'),false);
});
test('thumbnail signing is opt-in and marked-only, preserves original and falls back on missing companion',async()=>{
 const previous=process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED;
 const base='journey-media/'+id+'/'+id+'/cover/'+id;
 try {
  delete process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED;let h=queries();let result=await h.api.resolvePhotos([{id,cover:base+'.full-v1.jpg',stops:[]}],signal());assert.equal(h.signs.flat().length,1);assert.equal(result[0].coverThumbnail,undefined);
  process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED='true';h=queries();result=await h.api.resolvePhotos([{id,cover:base+'.full-v1.jpg',stops:[]}],signal());assert.equal(h.signs.flat().length,2);assert.match(result[0].cover,/full-v1/);assert.match(result[0].coverThumbnail,/thumb-512/);
  h=queries({fail:path=>path.includes('thumb-512')});result=await h.api.resolvePhotos([{id,cover:base+'.full-v1.jpg',stops:[]}],signal());assert.ok(result[0].cover);assert.equal(result[0].coverThumbnail,null);
  h=queries();await h.api.resolvePhotos([{id,cover:base+'.jpg',stops:[]}],signal());assert.equal(h.signs.flat().length,1);
 } finally {if(previous===undefined)delete process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED;else process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED=previous;}
});
test('stop thumbnails resolve in shared bounded signer without replacing full Story photo or probing legacy/disabled paths',async()=>{
 const previous=process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED,base='journey-media/'+id+'/'+id+'/stops/'+id+'/'+id;
 const rows=[{id,cover:null,stops:[{id:'one',photo:base+'.full-v1.png'},{id:'two',photo:base+'.full-v1.png'},{id:'legacy',photo:base+'.jpg'},{id:'remote',photo:'https://example.test/photo.jpg'}]}];
 try {
  process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED='true';let h=queries();let result=await h.api.resolvePhotos(rows,signal());assert.match(result[0].stops[0].photo,/full-v1\.png/);assert.match(result[0].stops[0].photoThumbnail,/thumb-512-v1/);assert.equal(result[0].stops[0].photoThumbnail,result[0].stops[1].photoThumbnail);assert.equal(h.signs.flat().length,3);assert.equal(result[0].stops[2].photoThumbnail,undefined);assert.equal(result[0].stops[3].photo,'https://example.test/photo.jpg');
  h=queries({fail:p=>p.includes('.thumb-')});result=await h.api.resolvePhotos(rows,signal());assert.ok(result[0].stops[0].photo);assert.equal(result[0].stops[0].photoThumbnail,null);
  delete process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED;h=queries();result=await h.api.resolvePhotos(rows,signal());assert.equal(result[0].stops[0].photoThumbnail,undefined);assert.equal(h.signs.flat().length,2);
 }finally{if(previous===undefined)delete process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED;else process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED=previous;}
});
