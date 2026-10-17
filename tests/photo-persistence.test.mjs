import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const output=mkdtempSync(join(tmpdir(),'journey-photo-save-'));after(()=>rmSync(output,{recursive:true,force:true}));
const program=ts.createProgram(['src/lib/create/photo-save.ts','src/lib/create/photo-queries.ts'],{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,types:['node'],esModuleInterop:true,outDir:output,rootDir:resolve('src'),strict:true,skipLibCheck:true});
const diagnostics=ts.getPreEmitDiagnostics(program).concat(program.emit().diagnostics);assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:f=>f,getCurrentDirectory:()=>process.cwd(),getNewLine:()=> '\n'}));
const require=createRequire(import.meta.url), model=require(join(output,'lib/create/model.js')),{createPhotoSaveController,photoObjectName}=require(join(output,'lib/create/photo-save.js'));
const id='11111111-1111-4111-8111-111111111111',owner='22222222-2222-4222-8222-222222222222',sid='33333333-3333-4333-8333-333333333333',other='44444444-4444-4444-8444-444444444444';
const version='2026-10-14T10:00:00.123456Z';
const photo=(n=1)=>({uri:'file:///prepared-'+n,width:800,height:600,size:1024,mime:'image/png'});
const form=()=>({...model.newForm(id),title:'Coast',traveler:'family',days:'3',description:'Journey note',descriptionWasNull:false,destination:{name:'Coast',label:'Coast',latitude:0,longitude:0,mapboxId:null},destinationSlug:'original-coast',updatedAt:version,coverPath:'journey-media/inherited/cover.webp',stops:[{id:sid,name:'Beach',description:'Memory note',latitude:0,longitude:0,mapboxId:'keep-place',day:'2',rating:'0',photoPath:'journey-media/inherited/stop.webp'}]});
function controller(options={}) {
 const writes=[],uploads=[],checks=[],progress=[];let serial=0,saveFailure=null,uploadFailure=null,database=form();
 const metadata=model.createSaveController(async payload=>{writes.push(payload);if(saveFailure)throw saveFailure;const updated_at='2026-10-14T11:00:'+String(++serial).padStart(2,'0')+'Z';database={...database,stops:payload.stops,updatedAt:updated_at};return {id,status:payload.status,updated_at};});
 const ports={save:metadata.save,uuid:()=>other,checkDraft:async input=>{checks.push(input);if(options.checkFailure)throw options.checkFailure;return {ownerId:owner,stopIds:options.newStop?database.stops.map(s=>s.id):input.stops.map(s=>s.id)};},upload:async(objectName,candidate,signal)=>{uploads.push({objectName,candidate,signal});if(options.pendingUpload)await options.pendingUpload;if(uploadFailure)throw uploadFailure;}};
 const api=createPhotoSaveController(ports);
 return {...api,writes,uploads,checks,progress,save:(input,candidates={},status='draft',checkpoint=()=>{})=>api.save(input,status,candidates,new AbortController().signal,p=>progress.push(p),checkpoint),setSaveFailure:f=>{saveFailure=f;},setUploadFailure:f=>{uploadFailure=f;}};
}
test('explicit cover and memory save uploads immutable object names then persists only raw paths and every other field',async()=>{
 const c=controller(),input=form(),before=JSON.stringify(input);const result=await c.save(input,{cover:photo(),[sid]:photo(2)});assert.equal(result.kind,'saved');assert.equal(c.uploads.length,2);
 assert.equal(c.uploads[0].objectName,owner+'/'+id+'/cover/'+other+'.png');assert.equal(c.uploads[1].objectName,owner+'/'+id+'/stops/'+sid+'/'+other+'.png');
 assert.equal(c.writes[0].cover_image_path,'journey-media/'+c.uploads[0].objectName);assert.equal(c.writes[0].stops[0].photo_path,'journey-media/'+c.uploads[1].objectName);assert.equal(c.writes[0].updated_at,version);assert.equal(c.writes[0].destination_slug,'original-coast');
 assert.equal(c.writes[0].stops[0].id,sid);assert.equal(c.writes[0].stops[0].rating,0);assert.equal(c.writes[0].stops[0].day_number,2);assert.equal(c.writes[0].stops[0].description,'Memory note');assert.equal(c.writes[0].stops[0].mapbox_place_id,'keep-place');assert.equal(JSON.stringify(input),before);assert.equal(JSON.stringify(c.writes).includes('file:///'),false);
 assert.ok(c.progress.includes('Uploading photo 2 of 2...'));assert.equal(result.form.coverPath,c.writes[0].cover_image_path);
 await c.save(result.form);assert.equal(c.uploads.length,2,'Metadata save never reuploads existing paths');
});
test('unmodified memory media is preserved when only cover changes; removal writes null without Storage operations',async()=>{
 const c=controller();let result=await c.save(form(),{cover:photo()});assert.equal(c.writes[0].stops[0].photo_path,form().stops[0].photoPath);
 result=await c.save({...result.form,coverPath:null,stops:result.form.stops.map(s=>({...s,photoPath:null}))});assert.equal(result.kind,'saved');assert.equal(c.writes.at(-1).cover_image_path,null);assert.equal(c.writes.at(-1).stops[0].photo_path,null);assert.equal(c.uploads.length,1);
});
test('new private journey and new memory are saved before upload, advancing the exact checkpoint version',async()=>{
 const c=controller({newStop:true});const fresh={...form(),updatedAt:null,coverPath:null,stops:[{...form().stops[0],id:other,photoPath:null}]};let checkpoint;
 const result=await c.save(fresh,{[other]:photo()},'draft',saved=>{checkpoint=saved;});assert.equal(result.kind,'saved');assert.equal(c.writes.length,2);assert.equal(c.writes[0].stops[0].photo_path,null);assert.equal(c.writes[1].updated_at,checkpoint.updatedAt);assert.equal(c.uploads.length,1);assert.equal(c.checks[0].updatedAt,checkpoint.updatedAt);
});
test('existing draft with a new memory checkpoints metadata first and can retry a photo failure with the confirmed version',async()=>{
 const c=controller({newStop:true}),input={...form(),stops:[...form().stops,{...form().stops[0],id:other,photoPath:null}]};let current=input;
 c.setUploadFailure(new model.SaveFailure('Rejected'));const first=await c.save(input,{[other]:photo()},'draft',f=>{current=f;});assert.equal(first.kind,'error');assert.equal(first.uncertain,false);assert.notEqual(current.updatedAt,version);assert.equal(c.writes[0].stops.length,2);
 c.setUploadFailure(null);assert.equal((await c.save(current,{[other]:photo()})).kind,'saved');assert.equal(c.writes.at(-1).updated_at,current.updatedAt);
});
test('known upload rejection retains selection and old saved cover, never sending a local URI or candidate path to RPC',async()=>{
 const c=controller(),input=form(),candidate=photo();c.setUploadFailure(new model.SaveFailure('Storage denied'));const result=await c.save(input,{cover:candidate});assert.equal(result.kind,'error');assert.equal(result.uncertain,false);assert.equal(c.writes.length,0);assert.equal(input.coverPath,form().coverPath);assert.equal(candidate.uri,'file:///prepared-1');
 c.setUploadFailure(null);assert.equal((await c.save(input,{cover:candidate})).kind,'saved');assert.equal(c.uploads[0].objectName,c.uploads[1].objectName,'Known rejection retries the same allocated immutable name');
});
test('RPC rejection after successful upload retains the exact path and retries metadata without duplicate upload',async()=>{
 const c=controller(),input=form();c.setSaveFailure(new model.SaveFailure('RPC rejected'));assert.equal((await c.save(input,{cover:photo()})).kind,'error');assert.equal(c.getUploads()[0].state,'uploaded');assert.equal(input.coverPath,form().coverPath);
 c.setSaveFailure(null);assert.equal((await c.save(input,{cover:photo()})).kind,'saved');assert.equal(c.uploads.length,1);assert.equal(c.writes[0].cover_image_path,c.writes[1].cover_image_path);
});
test('partially completed photo batches reuse earlier uploads after a later photo is rejected',async()=>{
 const input=form(),uploads=[];let failed=true;const metadata=model.createSaveController(async p=>({id,status:p.status,updated_at:version}));
 const api=createPhotoSaveController({save:metadata.save,checkDraft:async()=>({ownerId:owner,stopIds:[sid]}),uuid:()=>other,upload:async(name)=>{uploads.push(name);if(name.includes('/stops/')&&failed)throw new model.SaveFailure('Rejected');}});
 const candidates={cover:photo(),[sid]:photo(2)};assert.equal((await api.save(input,'draft',candidates,new AbortController().signal)).kind,'error');failed=false;assert.equal((await api.save(input,'draft',candidates,new AbortController().signal)).kind,'saved');assert.equal(uploads.filter(p=>p.includes('/cover/')).length,1);
});
test('ambiguous upload and conflicting or ambiguous RPC outcomes block all blind write retries',async()=>{
 for(const mode of ['upload','rpc']) {const c=controller();if(mode==='upload')c.setUploadFailure(new model.SaveFailure('Unconfirmed upload',true));else c.setSaveFailure(new model.SaveFailure('Changed draft',true));
  const result=await c.save(form(),{cover:photo()});assert.equal(result.uncertain,true);assert.equal((await c.save(form(),{cover:photo()})).kind,'blocked');assert.equal(c.uploads.length,1);assert.equal(c.getUploads()[0].state,mode==='upload'?'unknown':'uploaded');}
});
test('duplicate saves stay locked while upload is pending and state only confirms saved after RPC success',async()=>{
 let finish;const pending=new Promise(resolve=>{finish=resolve;});const c=controller({pendingUpload:pending});const first=c.save(form(),{cover:photo()});await new Promise(setImmediate);assert.equal((await c.save(form(),{cover:photo()})).kind,'blocked');assert.equal(c.writes.length,0);finish();assert.equal((await first).kind,'saved');assert.equal(c.uploads.length,1);
});
test('validation, missing draft ownership, local path contamination and invalid photo keys cannot upload',async()=>{
 const c=controller({checkFailure:new model.SaveFailure('Wrong owner')});assert.equal((await c.save(form(),{cover:photo()})).kind,'error');assert.equal(c.uploads.length,0);
 for(const patch of [{title:''},{coverPath:'file:///bad'}])assert.equal((await controller().save({...form(),...patch},{cover:photo()})).kind,'error');assert.equal((await controller().save(form(),{unknown:photo()})).kind,'error');
 for(const args of [['bad',id,'cover',other,'image/png'],[owner,id,'../bad',other,'image/png'],[owner,id,'cover',other,'image/heic']])assert.throws(()=>photoObjectName(...args));
});
let authOwner=owner,rows=[],readCalls=[],uploadCalls=[],uploadError=null,uploadedPath=null,readError=false;
const client={auth:{getUser:async()=>({data:{user:authOwner?{id:authOwner}:null},error:null})},from:table=>{const entry={table,filters:[]};const query={select:c=>{entry.columns=c;return query;},eq:(k,v)=>{entry.filters.push([k,v]);return query;},abortSignal:signal=>{assert.equal(signal.aborted,false);return query;},maybeSingle:async()=>{readCalls.push(entry);return rows.shift();},then:(resolve,reject)=>{readCalls.push(entry);return Promise.resolve(rows.shift()).then(resolve,reject);}};return query;},storage:{from:bucket=>{assert.equal(bucket,'journey-media');return {upload:async(name,body,opts)=>{uploadCalls.push({name,body,opts});return {data:uploadError?null:{path:uploadedPath||name},error:uploadError};}};}}};
require.cache[join(output,'lib/supabase/client.js')]={exports:{supabase:client}};
require.cache[join(output,'lib/create/photo-device.js')]={exports:{readPreparedPhoto:async()=>{if(readError)throw Error('Local file missing');return new ArrayBuffer(4);}}};
const {checkPhotoDraft,uploadJourneyPhoto}=require(join(output,'lib/create/photo-queries.js'));
function queue(versionOverride=version) {authOwner=owner;readCalls=[];rows=[{data:{id,user_id:owner,status:'draft',updated_at:versionOverride,is_demo:false},error:null},{data:[{id:sid}],error:null}];}
test('repository derives identity from getUser and verifies private owner/version and existing memory IDs without a write',async()=>{
 queue();assert.deepEqual(await checkPhotoDraft(form(),owner,new AbortController().signal),{ownerId:owner,stopIds:[sid]});assert.ok(readCalls[0].filters.some(([k,v])=>k==='user_id'&&v===owner));assert.ok(readCalls[0].filters.some(([k,v])=>k==='status'&&v==='draft'));
 queue('2026-10-14T12:00:00Z');await assert.rejects(checkPhotoDraft(form(),owner,new AbortController().signal),e=>e.uncertain===true);queue();authOwner=other;await assert.rejects(checkPhotoDraft(form(),owner,new AbortController().signal));assert.equal(readCalls.length,0);authOwner=owner;
});
test('native Storage integration sends ArrayBuffer, safe object-only name, content type and upsert false',async()=>{
 uploadCalls=[];uploadError=null;const name=photoObjectName(owner,id,'cover',other,'image/png');await uploadJourneyPhoto(name,photo(),owner,new AbortController().signal);assert.equal(uploadCalls.length,1);assert.equal(uploadCalls[0].name,name);assert.ok(uploadCalls[0].body instanceof ArrayBuffer);assert.deepEqual(uploadCalls[0].opts,{contentType:'image/png',cacheControl:'3600',upsert:false});
 await assert.rejects(uploadJourneyPhoto('journey-media/'+name,photo(),owner,new AbortController().signal));await assert.rejects(uploadJourneyPhoto(name,photo(),other,new AbortController().signal));assert.equal(uploadCalls.length,1);
});
test('local read failures never upload; denied versus ambiguous/collision Storage outcomes are classified safely',async()=>{
 const name=photoObjectName(owner,id,sid,other,'image/png');uploadCalls=[];readError=true;await assert.rejects(uploadJourneyPhoto(name,photo(),owner,new AbortController().signal),e=>!e.uncertain);assert.equal(uploadCalls.length,0);readError=false;
 for(const [code,uncertain] of [['403',false],['413',false],['409',true],['500',true],['',true]]) {uploadError={statusCode:code};await assert.rejects(uploadJourneyPhoto(name,photo(),owner,new AbortController().signal),e=>e.uncertain===uncertain);}uploadError=null;
 uploadedPath='different/path';await assert.rejects(uploadJourneyPhoto(name,photo(),owner,new AbortController().signal),e=>e.uncertain===true);uploadedPath=null;
});
test('implementation has no remote delete/upsert or new backend endpoint',()=>{
 for(const f of ['src/lib/create/photo-save.ts','src/lib/create/photo-queries.ts'])assert.equal(/\.remove\(|upsert:\s*true|\bfetch\(/.test(readFileSync(f,'utf8')),false);
});

test('replacement candidates allocate fresh names without overwriting earlier objects',async()=>{
 let n=0;const uploads=[];const metadata=model.createSaveController(async p=>({id,status:p.status,updated_at:version}));
 const api=createPhotoSaveController({save:metadata.save,checkDraft:async()=>({ownerId:owner,stopIds:[sid]}),uuid:()=>n++?sid:other,upload:async name=>{uploads.push(name);}});
 const first=await api.save(form(),'draft',{cover:photo()},new AbortController().signal);assert.equal(first.kind,'saved');const second=await api.save(first.form,'draft',{cover:photo(2)},new AbortController().signal);assert.equal(second.kind,'saved');assert.notEqual(uploads[0],uploads[1]);assert.notEqual(first.form.coverPath,second.form.coverPath);
});
test('cancellation during an upload prevents a later RPC and preserves the exact confirmed upload path',async()=>{
 const abort=new AbortController();const metadata=model.createSaveController(async()=>{throw Error('RPC must not run');});
 const api=createPhotoSaveController({save:metadata.save,checkDraft:async()=>({ownerId:owner,stopIds:[sid]}),uuid:()=>other,upload:async()=>{abort.abort();}});
 const result=await api.save(form(),'draft',{cover:photo()},abort.signal);assert.equal(result.kind,'error');assert.equal(api.getUploads()[0].state,'uploaded');
});
