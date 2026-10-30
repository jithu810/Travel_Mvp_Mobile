import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function load(file,modules={}){const exports={};new Function('require','exports',ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{assert.ok(name in modules,name);return modules[name];},exports);return exports;}
const variants=load('src/lib/media/image-variants.ts'),model=load('src/lib/discovery/model.ts',{'../../types/journey':{travelerTypes:[]}});
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const full=`journey-media/${owner}/${other}/stops/${owner}/${other}.full-v1.png`,thumb=variants.thumbnailStoragePath(full);
function harness(options={}){
 const signed=[],events=[];let identity=owner,count=0,listener,unsubscribed=false;
 const client={auth:{async getUser(){count++;return {data:{user:{id:options.identity?.(count) ?? identity}},error:options.authError};},onAuthStateChange(fn){listener=fn;return {data:{subscription:{unsubscribe(){unsubscribed=true;}}}};}},storage:{from(bucket){assert.equal(bucket,'journey-media');return {async createSignedUrls(paths,ttl){signed.push(paths);assert.equal(ttl,3600);await options.beforeResult?.({switchTo(id){identity=id;listener('SIGNED_IN',{user:{id}});},events});return {data:paths.map(path=>options.failThumbnail&&path.endsWith('.thumb-512-v1.jpg')?{error:'missing'}:{signedUrl:'https://example.test/'+path}),error:options.signError};}};}}};
 const {loadEditorPhotos}=load('src/lib/create/queries.ts',{'../auth/model':{accountCheckMessage:(_,m)=>m},'./editor-model':{},'../supabase/client':{supabase:client},'../discovery/model':model,'./model':{},'../media/image-variants':variants});
 return {run:(paths=[full],signal=new AbortController().signal)=>loadEditorPhotos(paths,owner,signal),signed,unsubscribed:()=>unsubscribed};
}
test('authenticated editor exposes original and companion raw-path keys only for flagged markers, deduplicates and tolerates missing companion',async()=>{
 const previous=process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED;
 try{
  process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED='true';let h=harness();let result=await h.run([full,full]);assert.ok(result[full]);assert.ok(result[thumb]);assert.equal(h.signed[0].length,2);assert.equal(h.unsubscribed(),true);
  h=harness({failThumbnail:true});result=await h.run();assert.ok(result[full]);assert.equal(result[thumb],undefined);
  delete process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED;h=harness();result=await h.run();assert.ok(result[full]);assert.equal(result[thumb],undefined);assert.equal(h.signed[0].length,1);
  process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED='true';h=harness();await h.run([full.replace('.full-v1','')]);assert.equal(h.signed[0].length,1);
 }finally{if(previous===undefined)delete process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED;else process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED=previous;}
});
test('editor verifies identity after signing and rejects transient account switches, auth failures and cancellation',async()=>{
 for(const options of [{identity:n=>n>1?other:owner},{authError:{message:'expired'}},{beforeResult:async({switchTo})=>{switchTo(other);switchTo(owner);}}]){
  const h=harness(options);await assert.rejects(h.run(),/unavailable/);assert.equal(h.unsubscribed(),true);
 }
 const controller=new AbortController();const h=harness({beforeResult:async()=>controller.abort()});await assert.rejects(h.run([full],controller.signal),/unavailable/);assert.equal(h.unsubscribed(),true);
});
test('editor never returns cached personal URLs across calls and filters local/unsafe paths',async()=>{
 const h=harness();await h.run();await h.run();assert.equal(h.signed.length,2);
 const unsafe=harness();assert.deepEqual(await unsafe.run(['file:///private.jpg','https://example.test/remote.jpg','journey-media/../bad.jpg']),{});assert.equal(unsafe.signed.length,0);
 const denied=harness({signError:{message:'denied'}});await assert.rejects(denied.run(),/unavailable/);
});
