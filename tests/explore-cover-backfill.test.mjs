import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildActivationSql, buildRollbackSql, validateOperation, TARGET, SOURCE_MANIFEST_SHA, REVIEW_PLAN_SHA } from '../scripts/explore-cover-backfill-plan.mjs';
import { bindApprovedFiles, uploadVerifiedBatch, storageExistenceResult } from '../scripts/explore-cover-backfill-upload.mjs';
import { createHash } from 'node:crypto';

// Reuse the separate Web repository's existing offline Postgres engine. No new
// Mobile dependency, hosted socket, credential or persistent database is used.
let PGlite;
try { ({ PGlite } = createRequire(fileURLToPath(new URL('../../travel-mvp-web/package.json', import.meta.url)))('@electric-sql/pglite')); } catch { /* Disclose unavailable sibling fixture in other checkouts. */ }
const id = (group, n) => `${group}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const owner = id(1, 1);
const object = (n, size, mime, hash) => ({ id: id(5, n), version: `v${n}`, size, mime, verifiedSha256: hash });
const syntheticPlan = () => ({ projectRef: TARGET, bucket: 'journey-media', sourceManifestSha256: SOURCE_MANIFEST_SHA, reviewPlanSha256: REVIEW_PLAN_SHA,
  items: Array.from({ length: 9 }, (_, i) => {
    const n = i + 1, prefix = `journey-media/${owner}/${id(2,n)}/cover/${id(3,n)}`;
    return { journeyId: id(2,n), ownerId: owner, oldPath: prefix+'.jpg', newPath: prefix+'.full-v1.jpg', thumbnailPath: prefix+'.thumb-512-v1.jpg',
      status:'published',expectedUpdatedAt:'2026-10-01 00:00:00.123456+00',rowDigest:'0'.repeat(32),stopsDigest:'0'.repeat(32),authorizationDigest:'0'.repeat(32),
      sourceObject:object(n,1000,'image/jpeg','a'.repeat(64)),fullObject:object(n+20,1000,'image/jpeg','a'.repeat(64)),thumbnailObject:object(n+40,100,'image/jpeg','b'.repeat(64)),
      originalSha256:'a'.repeat(64),thumbnailSha256:'b'.repeat(64),thumbnailSize:100 };
  }) });

test('backfill plan refuses wrong scope, unverified destinations, duplicates and path substitution', () => {
  const p=syntheticPlan(); assert.equal(validateOperation(p),p);
  for(const alter of [q=>q.projectRef='other',q=>q.reviewPlanSha256='0'.repeat(64),q=>q.items.pop(),q=>q.items[1].journeyId=q.items[0].journeyId,q=>q.items[0].newPath+='x',q=>q.items[0].fullObject.verifiedSha256='b'.repeat(64)]) {
    const q=structuredClone(p);alter(q);assert.throws(()=>buildActivationSql(q));
  }
  assert.throws(()=>buildRollbackSql(p,{projectRef:TARGET,action:'activate',operationSha256:'bad',items:[]}));
});

async function fixture(run) {
  const db=new PGlite();
  try {
    await db.exec(`create schema private;create schema storage;
      create table public.journeys(id uuid primary key,user_id uuid not null,title text,status text,cover_image_path text,created_at timestamptz,updated_at timestamptz);
      create table public.journey_stops(id uuid primary key,journey_id uuid references public.journeys(id),sequence integer,name text,photo_path text,created_at timestamptz,updated_at timestamptz);
      create table private.journey_media_authorizations(journey_id uuid references public.journeys(id),media_path text,primary key(journey_id,media_path));
      create table storage.objects(id uuid primary key,bucket_id text,name text,version text,metadata jsonb,unique(bucket_id,name));
      create table public.saved_journeys(journey_id uuid,user_id uuid);
      create table private.copy_receipts(journey_id uuid,receipt text);
      create function private.advance_journey_version() returns trigger language plpgsql as $$begin new.updated_at:=greatest(clock_timestamp(),old.updated_at+interval '1 microsecond');return new;end$$;
      create trigger journeys_updated_at before update on public.journeys for each row execute function private.advance_journey_version();`);
    const plan=syntheticPlan();
    for(const item of plan.items) {
      await db.query('insert into public.journeys values($1,$2,$3,$4,$5,$6,$6)',[item.journeyId,item.ownerId,'Unchanged title',item.status,item.oldPath,item.expectedUpdatedAt]);
      await db.query('insert into public.journey_stops values($1,$2,1,$3,null,$4,$4)',[id(4,plan.items.indexOf(item)+1),item.journeyId,'Unchanged stop',item.expectedUpdatedAt]);
      await db.query('insert into private.journey_media_authorizations values($1,$2)',[item.journeyId,item.oldPath]);
      await db.query('insert into public.saved_journeys values($1,$2)',[item.journeyId,item.ownerId]);
      await db.query('insert into private.copy_receipts values($1,$2)',[item.journeyId,'existing receipt']);
      for(const [key,p] of [['sourceObject',item.oldPath],['fullObject',item.newPath],['thumbnailObject',item.thumbnailPath]]) {
        const o=item[key];await db.query('insert into storage.objects values($1,$2,$3,$4,$5)',[o.id,'journey-media',p.slice(14),o.version,{size:o.size,mimetype:o.mime}]);
      }
      const row=(await db.query(`select md5((to_jsonb(j)-'cover_image_path'-'updated_at')::text) as row_digest,
        (select md5(jsonb_agg(to_jsonb(s) order by s.sequence)::text) from public.journey_stops s where s.journey_id=j.id) as stops_digest,
        (select md5(jsonb_agg(a.media_path order by a.media_path)::text) from private.journey_media_authorizations a where a.journey_id=j.id) as auth_digest
        from public.journeys j where j.id=$1`,[item.journeyId])).rows[0];
      Object.assign(item,{rowDigest:row.row_digest,stopsDigest:row.stops_digest,authorizationDigest:row.auth_digest});
    }
    const snapshot=async()=> (await db.query(`select jsonb_build_object('stops',(select jsonb_agg(to_jsonb(s) order by id) from public.journey_stops s),
      'social',(select jsonb_agg(to_jsonb(s) order by journey_id) from public.saved_journeys s),
      'receipts',(select jsonb_agg(to_jsonb(s) order by journey_id) from private.copy_receipts s),
      'objects',(select jsonb_agg(to_jsonb(o) order by id) from storage.objects o)) as value`)).rows[0].value;
    const execute=async sql=>(await db.exec(sql)).at(-1).rows[0].receipt;
    await run({db,plan,snapshot,execute});
  } finally { await db.close(); }
}

const integration={skip:!PGlite?'Sibling Web offline PostgreSQL dependency unavailable; no live fallback':false};
test('actual SQL activation and rollback preserve stop timestamps, metadata, original objects, social state and receipts',integration,async()=>fixture(async({db,plan,snapshot,execute})=>{
  const before=await snapshot();const receipt=await execute(buildActivationSql(plan));
  assert.equal(receipt.items.length,9);assert.equal(receipt.action,'activate');
  assert.deepEqual(await snapshot(),before,'No source, stop, social or receipt row changed');
  assert.equal((await db.query('select count(*)::int n from private.journey_media_authorizations')).rows[0].n,18,'Old authorizations retained plus nine new');
  const rollback=buildRollbackSql(plan,receipt);const rolled=await execute(rollback);
  assert.equal(rolled.action,'rollback');assert.deepEqual(await snapshot(),before);
  assert.equal((await db.query('select count(*)::int n from private.journey_media_authorizations')).rows[0].n,9);
  for(const item of plan.items){const row=(await db.query('select cover_image_path,updated_at::text version from public.journeys where id=$1',[item.journeyId])).rows[0];assert.equal(row.cover_image_path,item.oldPath);assert.ok(Date.parse(row.version)>Date.parse(item.expectedUpdatedAt));}
}));

test('actual SQL rejects late-item version/source/collision drift and atomically rolls back earlier items',integration,async()=>{
  for(const kind of ['version','source','authorization','destination']) await fixture(async({db,plan,snapshot,execute})=>{
    const before=await snapshot();const last=plan.items.at(-1);
    if(kind==='version')last.expectedUpdatedAt='2026-10-01 00:00:00.123457+00';
    if(kind==='source')last.sourceObject.version='changed';
    if(kind==='destination')last.fullObject.version='changed';
    if(kind==='authorization')await db.query('insert into private.journey_media_authorizations values($1,$2)',[last.journeyId,last.newPath]);
    await assert.rejects(execute(buildActivationSql(plan)));await db.exec('rollback');
    assert.deepEqual(await snapshot(),before);assert.equal((await db.query("select count(*)::int n from public.journeys where cover_image_path like '%.full-v1.jpg'")).rows[0].n,0);
  });
});

test('actual rollback refuses concurrent user edits without restoring old timestamps or overwriting edits',integration,async()=>fixture(async({db,plan,execute})=>{
  const receipt=await execute(buildActivationSql(plan));
  const last=plan.items.at(-1);await db.query('update public.journeys set title=$1 where id=$2',['New user title',last.journeyId]);
  await assert.rejects(execute(buildRollbackSql(plan,receipt)));await db.exec('rollback');
  const row=(await db.query('select title,cover_image_path from public.journeys where id=$1',[last.journeyId])).rows[0];assert.equal(row.title,'New user title');assert.equal(row.cover_image_path,last.newPath);
  assert.equal((await db.query("select count(*)::int n from public.journeys where cover_image_path like '%.full-v1.jpg'")).rows[0].n,9,'Failed rollback is atomic');
}));

test('uploader binds actual approved file hashes before parsing or touching ports',()=>{
  assert.throws(()=>bindApprovedFiles(Buffer.from('{}'),Buffer.from('{}'),{}, {},()=>{throw Error('must not read')}),/Actual approved.*hash mismatch/);
});

test('destination existence recognizes SDK missing-object errors and rejects unavailable checks',()=>{
  assert.equal(storageExistenceResult({data:true,hasError:false}),true);
  assert.equal(storageExistenceResult({data:false,hasError:false}),false);
  assert.equal(storageExistenceResult({data:false,hasError:true,errorStatus:404}),false);
  assert.equal(storageExistenceResult({data:false,hasError:true,errorStatus:400,missingObject:true}),false);
  for(const errorStatus of [400,401,403,429,500,NaN])assert.throws(()=>storageExistenceResult({data:false,hasError:true,errorStatus}));
  assert.throws(()=>storageExistenceResult({data:true,hasError:true,errorStatus:500}));
});

function uploadFixture(overrides={}){
  const plan=syntheticPlan();const bytes=Buffer.alloc(1000,42),thumb=Buffer.alloc(100,12);
  const hash=b=>createHash('sha256').update(b).digest('hex');
  for(const item of plan.items){item.originalSha256=hash(bytes);item.thumbnailSha256=hash(thumb);item.sourceObject.etag='known-source-etag';item.fullObject.verifiedSha256=hash(bytes);item.thumbnailObject.verifiedSha256=hash(thumb);item.localOriginal='full.jpg';item.localThumbnail='thumb.jpg';}
  const events=[],uploads=[],remote=new Map(plan.items.map(item=>[item.oldPath,bytes]));
  const ports={confirmOwner:async()=>true,readLocal:file=>file==='full.jpg'?bytes:thumb,
    readRemote:async p=>({bytes:remote.get(p),etag:'known-source-etag'}),exists:async p=>remote.has(p),
    uploadCreateOnly:async(p,b)=>{assert.equal(remote.has(p),false);uploads.push(p);remote.set(p,b)},record:async e=>events.push(e),persist:async()=>{},...overrides};
  return {plan,ports,events,uploads,remote};
}

test('uploader verifies originals and both create-only destination hashes without any activation capability',async()=>{
  const {plan,ports,events,uploads}=uploadFixture();
  await uploadVerifiedBatch(plan,[plan.items[0].journeyId],ports);
  assert.equal(uploads.length,2);assert.deepEqual(events.map(e=>e.event),['upload-started','content-verified','upload-started','content-verified']);
  assert.equal(plan.items[0].fullObject.verifiedSha256,plan.items[0].originalSha256);assert.equal(plan.items[0].thumbnailObject.verifiedSha256,plan.items[0].thumbnailSha256);
});

test('uploader refuses collisions and source hash drift before any upload',async()=>{
  for(const kind of ['collision','source']){
    const f=uploadFixture();if(kind==='collision')f.remote.set(f.plan.items[0].newPath,Buffer.from('other'));else f.remote.set(f.plan.items[0].oldPath,Buffer.alloc(1000,43));
    await assert.rejects(uploadVerifiedBatch(f.plan,[f.plan.items[0].journeyId],f.ports));assert.equal(f.uploads.length,0);assert.equal(f.events.length,0);
  }
});

test('uploader stops on uncertain PUT, changed owner or failed remote verification and never retries',async()=>{
  for(const kind of ['timeout','owner','remoteHash']){
    const f=uploadFixture();let calls=0;
    if(kind==='timeout')f.ports.uploadCreateOnly=async(p,b)=>{f.uploads.push(p);f.remote.set(p,b);throw Error('response lost after write')};
    if(kind==='owner')f.ports.confirmOwner=async()=>++calls===1;
    if(kind==='remoteHash')f.ports.uploadCreateOnly=async p=>{f.uploads.push(p);f.remote.set(p,Buffer.from('bad'))};
    await assert.rejects(uploadVerifiedBatch(f.plan,[f.plan.items[0].journeyId],f.ports));
    assert.equal(f.uploads.length,kind==='owner'?0:1);assert.ok(!f.events.some(e=>e.event==='content-verified'));
  }
});

test('canary and remaining eight use the same manifest boundary and combine into a safe nine-item rollback',integration,async()=>fixture(async({db,plan,snapshot,execute})=>{
  const before=await snapshot();const remaining=plan.items.slice(1).map(item=>({id:item.journeyId,full:item.fullObject,thumb:item.thumbnailObject}));
  for(const item of plan.items.slice(1)){delete item.fullObject;delete item.thumbnailObject;}
  const canary=await execute(buildActivationSql(plan,[plan.items[0].journeyId]));
  assert.equal(canary.items.length,1);assert.equal((await db.query("select count(*)::int n from public.journeys where cover_image_path like '%.full-v1.jpg'")).rows[0].n,1);
  assert.throws(()=>buildActivationSql(plan,remaining.map(item=>item.id)),/content verified/);
  for(const item of remaining)Object.assign(plan.items.find(p=>p.journeyId===item.id),{fullObject:item.full,thumbnailObject:item.thumb});
  const rest=await execute(buildActivationSql(plan,remaining.map(item=>item.id)));
  assert.equal(rest.items.length,8);assert.equal(rest.operationSha256,canary.operationSha256);
  const combined={...canary,items:[...canary.items,...rest.items]};
  await execute(buildRollbackSql(plan,combined));assert.deepEqual(await snapshot(),before);
}));
