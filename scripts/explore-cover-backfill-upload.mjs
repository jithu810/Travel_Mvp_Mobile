// Explicitly invoked maintenance helper. No .env files, keys or tokens are read.
// Signed URLs remain transient in memory. This helper never changes DB records.
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { TARGET, SOURCE_MANIFEST_SHA, REVIEW_PLAN_SHA, sha256, validateOperation, buildActivationSql } from './explore-cover-backfill-plan.mjs';

export function bindApprovedFiles(manifestBytes, reviewBytes, snapshot, receipts, readLocal) {
  if (sha256(manifestBytes) !== SOURCE_MANIFEST_SHA || sha256(reviewBytes) !== REVIEW_PLAN_SHA) throw new Error('Actual approved manifest/review file hash mismatch');
  const manifest=JSON.parse(manifestBytes),review=JSON.parse(reviewBytes);
  if(manifest.projectRef!==TARGET||review.projectRef!==TARGET||manifest.items.length!==9||review.items.length!==9||snapshot.sources.length!==9)throw new Error('Approved manifest scope changed');
  const items=review.items.map((entry,index)=>{
    const declared=manifest.items[index];const source=snapshot.sources.find(item=>item.storagePath===entry.currentReference);
    const receipt=receipts.items.find(item=>item.storagePath===entry.currentReference);
    if(declared.storagePath!==entry.currentReference||!source||source.references?.length!==1||source.stopReferenceCount!==0||source.destinationExisting!==0||!receipt)throw new Error('Source/reference scope drift');
    const reference=source.references[0];
    if(!reference.hasAuthorization||entry.expectedSourceSha256!==receipt.sha256||Number(source.expectedBytes)!==entry.originalBytes)throw new Error('Source authorization/content mismatch');
    if(sha256(readLocal(entry.localOriginal))!==entry.expectedSourceSha256||sha256(readLocal(entry.localThumbnail))!==entry.thumbnailSha256)throw new Error('Prepared local file changed');
    return {journeyId:reference.journeyId,ownerId:reference.ownerId,status:reference.status,oldPath:entry.currentReference,newPath:entry.canonicalOriginal,thumbnailPath:entry.thumbnail,
      expectedUpdatedAt:reference.updatedAt,rowDigest:reference.rowDigest,stopsDigest:reference.stopsDigest,authorizationDigest:reference.authorizationDigest,
      sourceObject:{id:source.objectId,version:source.version,size:Number(source.expectedBytes),mime:source.mimeType,etag:receipt.etag},
      originalSha256:entry.expectedSourceSha256,thumbnailSha256:entry.thumbnailSha256,thumbnailSize:entry.thumbnailBytes,
      localOriginal:entry.localOriginal,localThumbnail:entry.localThumbnail};
  });
  const plan={projectRef:TARGET,bucket:'journey-media',sourceManifestSha256:SOURCE_MANIFEST_SHA,reviewPlanSha256:REVIEW_PLAN_SHA,items};
  validateOperation(plan,{requireDestinations:false});return plan;
}

export async function uploadVerifiedBatch(plan, journeyIds, ports) {
  validateOperation(plan,{requireDestinations:false});
  if(!journeyIds.length||new Set(journeyIds).size!==journeyIds.length||journeyIds.some(id=>!plan.items.some(item=>item.journeyId===id)))throw new Error('Batch outside approved scope');
  const selected=plan.items.filter(item=>journeyIds.includes(item.journeyId));
  if(!await ports.confirmOwner(selected[0].ownerId)||selected.some(item=>item.ownerId!==selected[0].ownerId))throw new Error('Authenticated owner mismatch');
  // Preflight every selected source and destination before the first upload.
  for(const item of selected){
    const original=await ports.readRemote(item.oldPath);
    if(sha256(original.bytes)!==item.originalSha256||original.bytes.length!==item.sourceObject.size||original.etag!==item.sourceObject.etag)throw new Error('Remote original hash/ETag drift');
    for(const p of [item.newPath,item.thumbnailPath])if(await ports.exists(p))throw new Error('Destination collision; reconcile read-only before retry');
  }
  for(const item of selected){
    for(const [key,storagePath,local,hash,size,mime] of [
      ['fullObject',item.newPath,item.localOriginal,item.originalSha256,item.sourceObject.size,item.sourceObject.mime],
      ['thumbnailObject',item.thumbnailPath,item.localThumbnail,item.thumbnailSha256,item.thumbnailSize,'image/jpeg']]){
      const bytes=ports.readLocal(local);
      if(bytes.length!==size||sha256(bytes)!==hash)throw new Error('Local prepared file changed');
      if(!await ports.confirmOwner(item.ownerId))throw new Error('Authenticated owner changed');
      await ports.record({event:'upload-started',journeyId:item.journeyId,path:storagePath,sha256:hash,bytes:size});
      // Any transport error has an uncertain outcome; stop, never retry/upsert.
      await ports.uploadCreateOnly(storagePath,bytes,mime);
      const remote=await ports.readRemote(storagePath);
      if(remote.bytes.length!==size||sha256(remote.bytes)!==hash)throw new Error('Uploaded bytes failed hash verification');
      await ports.record({event:'content-verified',journeyId:item.journeyId,path:storagePath,sha256:hash,bytes:size,etag:remote.etag});
      // SQL object ID/version/metadata must be freshly attached by the Architect
      // after independent read-only catalog inspection before SQL generation.
      item[key]={verifiedSha256:hash};
      await ports.persist(plan);
    }
  }
  return plan;
}

export function storageExistenceResult(result) {
  // Installed storage-js intentionally retains the HEAD 400/404 error alongside
  // data:false for an absent object. Other errors must remain fail-closed.
  if(result?.data===true&&!result.hasError)return true;
  if(result?.data===false&&(!result.hasError||result.errorStatus===404||(result.errorStatus===400&&result.missingObject===true)))return false;
  throw new Error('Destination existence could not be verified');
}

async function connectOwner() {
  const WebSocket=createRequire(import.meta.url)('ws');
  const targets=await(await fetch('http://127.0.0.1:8081/json/list')).json();
  const target=targets.find(item=>item.appId==='com.sree8100.journeycreatormobile.googletest');
  if(!target)throw new Error('Approved native development target unavailable');
  const socket=new WebSocket(target.webSocketDebuggerUrl,{origin:'http://127.0.0.1:8081'});
  await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject)});
  let sequence=0;const pending=new Map();
  socket.on('message',data=>{const message=JSON.parse(data);const job=pending.get(message.id);if(job){pending.delete(message.id);clearTimeout(job.timer);job.resolve(message)}});
  async function evaluate(expression){
    const id=++sequence;
    const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Native inspection timed out; do not retry a write'))},20000);pending.set(id,{resolve,timer});socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true}}))});
    if(result.error||result.result?.exceptionDetails)throw new Error('Native inspection failed');return result.result?.result?.value;
  }
  const pause=()=>new Promise(resolve=>setTimeout(resolve,150));
  async function call(expression){
    const launched=await evaluate(`(()=>{if(globalThis.__exploreCoverMaintJob)return false;const m=[...globalThis.__r.getModules().values()].find(x=>/src[\\/]lib[\\/]supabase[\\/]client/.test(x.verboseName||''));const c=m?.publicModule?.exports?.supabase;if(!c)return false;globalThis.__exploreCoverMaintJob={done:false};Promise.resolve().then(()=>(${expression})(c)).then(value=>{globalThis.__exploreCoverMaintJob={done:true,value}},()=>{globalThis.__exploreCoverMaintJob={done:true,error:true}});return true})()`);
    if(!launched)throw new Error('Existing owner client unavailable or maintenance operation busy');
    for(let i=0;i<150;i++){
      const result=await evaluate('globalThis.__exploreCoverMaintJob');
      if(result?.done){await evaluate('delete globalThis.__exploreCoverMaintJob');if(result.error)throw new Error('Owner client request failed');return result.value}await pause();
    }
    throw new Error('Owner request outcome uncertain; stop and reconcile');
  }
  return {call,close:()=>socket.close()};
}

function safeUrl(value,storagePath,upload=false){
  const url=new URL(value);const expected=`/storage/v1/object/${upload?'upload/sign':'sign'}/${storagePath}`;
  if(url.protocol!=='https:'||url.hostname!==`${TARGET}.supabase.co`||decodeURIComponent(url.pathname)!==expected)throw new Error('Unexpected signed URL target');
  return url.toString();
}

async function main(){
  const root=path.resolve('.expo/explore-backfill-2026-11-01');
  const readJson=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8').replace(/^\uFEFF/,''));
  const readLocal=name=>{if(path.basename(name)!==name)throw new Error('Local path escaped review directory');return fs.readFileSync(path.join(root,'review',name))};
  const args=process.argv.slice(2);
  let plan;
  if(fs.existsSync(path.join(root,'operation-plan.json'))){
    plan=readJson('operation-plan.json');
    const rebound=bindApprovedFiles(fs.readFileSync(path.join(root,'manifest.json')),fs.readFileSync(path.join(root,'review/review-plan.json')),readJson('live-preflight-snapshot.json'),readJson('download-receipts.json'),readLocal);
    if(JSON.stringify(plan.items.map(({fullObject,thumbnailObject,...item})=>item))!==JSON.stringify(rebound.items))throw new Error('Operation does not match approved files/snapshot');
  }else{
    plan=bindApprovedFiles(fs.readFileSync(path.join(root,'manifest.json')),fs.readFileSync(path.join(root,'review/review-plan.json')),readJson('live-preflight-snapshot.json'),readJson('download-receipts.json'),readLocal);
    fs.writeFileSync(path.join(root,'operation-plan.json'),JSON.stringify(plan,null,2),{flag:'wx'});
  }
  const canary=plan.items.reduce((a,b)=>a.sourceObject.size<b.sourceObject.size?a:b);
  const selected=args.includes('--remaining-eight')?plan.items.filter(item=>item!==canary):[canary];
  if(args.includes('--write-activation-sql')){
    const sql=buildActivationSql(plan,selected.map(item=>item.journeyId));
    fs.writeFileSync(path.join(root,args.includes('--remaining-eight')?'activate-remaining-eight.sql':'activate-canary.sql'),sql,{flag:'wx'});
    console.log(JSON.stringify({sqlPrepared:true,items:selected.length,liveWrites:0}));return;
  }
  const client=await connectOwner();
  try{
    const confirmOwner=owner=>client.call(`async c=>{const r=await c.auth.getUser();return !r.error&&r.data.user?.id===${JSON.stringify(owner)}}`);
    const ownerState=await client.call(`async c=>{const r=await c.auth.getUser();return {hasUser:Boolean(r.data?.user),authError:Boolean(r.error),ownerMatches:!r.error&&r.data.user?.id===${JSON.stringify(canary.ownerId)}}}`);
    if(!ownerState.ownerMatches){console.log(JSON.stringify({ownerProbe:ownerState,liveWrites:0}));throw new Error('Current native user does not own approved covers');}
    if(!args.includes('--execute-approved-uploads')){console.log(JSON.stringify({operationPrepared:true,items:9,canaryItems:1,authenticatedOwnerMatches:true,liveWrites:0}));return;}
    const record=async event=>{const fd=fs.openSync(path.join(root,'upload-events.jsonl'),'a');try{fs.writeSync(fd,JSON.stringify({...event,at:new Date().toISOString()})+'\n');fs.fsyncSync(fd)}finally{fs.closeSync(fd)}};
    const signedRead=async storagePath=>{
      const result=await client.call(`async c=>{const r=await c.storage.from('journey-media').createSignedUrl(${JSON.stringify(storagePath.slice(14))},300);return r.error?null:r.data.signedUrl}`);
      if(!result)throw new Error('Owner read signing failed');return safeUrl(result,storagePath);
    };
    await uploadVerifiedBatch(plan,selected.map(item=>item.journeyId),{
      confirmOwner,readLocal,record,
      exists:async storagePath=>storageExistenceResult(await client.call(`async c=>{const bucket=c.storage.from('journey-media');let r=await bucket.exists(${JSON.stringify(storagePath.slice(14))});if(r.data===false&&Number(r.error?.status)===400){const info=await bucket.info(${JSON.stringify(storagePath.slice(14))});r=info.error?{data:false,error:info.error}:{data:true,error:null}}return {data:r.data,hasError:Boolean(r.error),errorStatus:r.error?Number(r.error.status??r.error.originalError?.status):null,missingObject:Boolean(r.error&&(['NoSuchKey','NotFound'].includes(r.error.code)||r.error.statusCode==='404'||/^(Object not found|The resource was not found)$/i.test(r.error.message||'')))}}`)),
      readRemote:async storagePath=>{const response=await fetch(await signedRead(storagePath),{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Remote verification GET failed');return {bytes:Buffer.from(await response.arrayBuffer()),etag:response.headers.get('etag')}},
      uploadCreateOnly:async(storagePath,bytes,mime)=>{
        const result=await client.call(`async c=>{const r=await c.storage.from('journey-media').createSignedUploadUrl(${JSON.stringify(storagePath.slice(14))},{upsert:false});return r.error?null:r.data.signedUrl}`);
        if(!result)throw new Error('Owner upload signing failed');
        const response=await fetch(safeUrl(result,storagePath,true),{method:'PUT',headers:{'x-upsert':'false','cache-control':'max-age=3600','content-type':mime},body:bytes,signal:AbortSignal.timeout(20000)});
        if(!response.ok)throw new Error('Create-only upload failed or uncertain; reconcile before retry');
      },
      persist:async updated=>{const temp=path.join(root,'operation-plan.next.json');fs.writeFileSync(temp,JSON.stringify(updated,null,2));fs.renameSync(temp,path.join(root,'operation-plan.json'))},
    });
    console.log(JSON.stringify({batchContentVerified:true,items:selected.length,uploadedObjects:selected.length*2,activationPerformed:false}));
  }finally{client.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{const message=String(error?.message||'');const safe=/^(Actual approved|Approved manifest|Source\/reference|Source authorization|Prepared local|Unapproved|Duplicate|Source ownership|Missing|Invalid|Operation does|Current native|Existing owner|Native inspection|Owner request|Owner client|Owner read|Owner upload|Create-only upload|Remote verification|Authenticated|Destination|Remote original|Local prepared|Uploaded bytes|Batch outside|Local path|Unexpected signed|Approved native)/.test(message)?message:'External request failed; inspect private receipts';console.error(`Bounded maintenance stopped: ${safe}. No automatic retry or overwrite is permitted.`);process.exitCode=1});
