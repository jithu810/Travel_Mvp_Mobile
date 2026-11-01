// Bounded, manually reviewed maintenance SQL. No database/network access here.
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';

export const TARGET = 'gwybjhqgnrpouwcdvusi';
export const SOURCE_MANIFEST_SHA = '1566dba105055a62e9622795e9343c5d15a452f185e6896e3237a0600d7ae434';
export const REVIEW_PLAN_SHA = 'c1c2229f1ac50077f4735f39f1684eb0345885415e9310eb0998ff36fcaf1b1c';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const digest = /^[0-9a-f]{32}$/;
const fail = message => { throw new Error(message); };
export const operationSha256 = plan => sha256(Buffer.from(JSON.stringify({ ...plan, items: plan.items.map(({ fullObject, thumbnailObject, ...item }) => item) })));
function validateDestinations(item) {
  for (const [field, size, mime] of [['fullObject', item.sourceObject.size, item.sourceObject.mime], ['thumbnailObject', item.thumbnailSize, 'image/jpeg']]) {
    const object = item[field];
    if (!uuid.test(object?.id) || typeof object.version !== 'string' || object.size !== size || object.mime !== mime || object.verifiedSha256 !== item[field === 'fullObject' ? 'originalSha256' : 'thumbnailSha256']) fail('Destination has not been content verified');
  }
}

export function validateOperation(plan, { requireDestinations = true } = {}) {
  if (plan.projectRef !== TARGET || plan.bucket !== 'journey-media'
    || plan.sourceManifestSha256 !== SOURCE_MANIFEST_SHA || plan.reviewPlanSha256 !== REVIEW_PLAN_SHA) fail('Unapproved target or manifest');
  if (!Array.isArray(plan.items) || plan.items.length !== 9) fail('Exactly nine approved covers required');
  const ids = new Set(), old = new Set(), destinations = new Set();
  for (const item of plan.items) {
    if (!uuid.test(item.journeyId) || !uuid.test(item.ownerId) || ids.has(item.journeyId) || old.has(item.oldPath)) fail('Duplicate/invalid cover identity');
    ids.add(item.journeyId); old.add(item.oldPath);
    const prefix = `journey-media/${item.ownerId}/${item.journeyId}/cover/`;
    const file = item.oldPath?.slice(prefix.length);
    if (!item.oldPath?.startsWith(prefix) || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(file) || !uuid.test(file.split('.')[0])) fail('Source ownership/path mismatch');
    const stem = item.oldPath.replace(/\.(jpg|png|webp)$/, '');
    const ext = item.oldPath.split('.').pop();
    if (item.newPath !== `${stem}.full-v1.${ext}` || item.thumbnailPath !== `${stem}.thumb-512-v1.jpg`) fail('Unapproved destination path');
    for (const destination of [item.newPath, item.thumbnailPath]) {
      if (destinations.has(destination)) fail('Destination collision');
      destinations.add(destination);
    }
    if (!/^\d{4}-\d\d-\d\d[T ]/.test(item.expectedUpdatedAt) || !Number.isFinite(Date.parse(item.expectedUpdatedAt))
      || !digest.test(item.rowDigest) || !digest.test(item.stopsDigest) || !digest.test(item.authorizationDigest)
      || !['draft', 'published'].includes(item.status)) fail('Missing reference concurrency/snapshot guard');
    if (!uuid.test(item.sourceObject?.id) || typeof item.sourceObject.version !== 'string'
      || !Number.isSafeInteger(item.sourceObject.size) || item.sourceObject.size <= 0) fail('Missing source object guard');
    for (const field of ['originalSha256', 'thumbnailSha256']) if (!/^[0-9a-f]{64}$/.test(item[field])) fail('Missing content hash');
    if (!Number.isSafeInteger(item.thumbnailSize) || item.thumbnailSize <= 0 || item.thumbnailSize > 1024 * 1024) fail('Invalid thumbnail size');
    if (requireDestinations) validateDestinations(item);
  }
  return plan;
}

const literal = value => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;

export function buildActivationSql(plan, journeyIds = plan.items.map(item => item.journeyId)) {
  validateOperation(plan, { requireDestinations: false });
  if (!Array.isArray(journeyIds) || !journeyIds.length || new Set(journeyIds).size !== journeyIds.length || journeyIds.some(id => !plan.items.some(item => item.journeyId === id))) fail('Batch outside approved manifest');
  const items = plan.items.filter(item => journeyIds.includes(item.journeyId));
  items.forEach(validateDestinations);
  return buildSql({ ...plan, items }, false, operationSha256(plan));
}

export function buildRollbackSql(plan, receipt) {
  validateOperation(plan, { requireDestinations: false });
  if (receipt.projectRef !== TARGET || receipt.operationSha256 !== operationSha256(plan)
    || receipt.action !== 'activate' || !receipt.items?.length || receipt.items.length > 9) fail('Activation receipt does not match operation');
  const versions = new Map(receipt.items.map(item => [item.journeyId, item.updatedAt]));
  if (versions.size !== receipt.items.length || [...versions].some(([id, version]) => !plan.items.some(item => item.journeyId === id) || !/^\d{4}-\d\d-\d\d[T ]/.test(version || ''))) fail('Missing activation concurrency token');
  return buildSql({ ...plan, items: plan.items.filter(item => versions.has(item.journeyId)).map(item => ({ ...item, activationVersion: versions.get(item.journeyId) })) }, true, operationSha256(plan));
}

function buildSql(plan, rollback, operationSha = sha256(Buffer.from(JSON.stringify(plan)))) {
  // No permanent function/table/grant/policy/trigger creation or modification.
  // Each explicitly selected batch commits together; the full nine-cover plan
  // remains the approval/hash boundary. Receipt lives only in this SQL session.
  return `begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $explore_backfill$
declare
  operation jsonb := ${literal(plan)};
  item jsonb;
  j public.journeys%rowtype;
  returned_version timestamptz;
  receipts jsonb := '[]'::jsonb;
  action text := '${rollback ? 'rollback' : 'activate'}';
begin
  if current_user <> 'postgres' or current_user <> (select pg_get_userbyid(relowner) from pg_class where oid='public.journeys'::regclass)
    then raise exception 'Expected confirmed table-owner maintenance connection'; end if;
  if operation->>'projectRef' <> '${TARGET}' or operation->>'bucket' <> 'journey-media'
    or jsonb_array_length(operation->'items') <> ${plan.items.length}
    or (select count(distinct x->>'journeyId') from jsonb_array_elements(operation->'items') x) <> ${plan.items.length}
    then raise exception 'Unapproved operation scope'; end if;
  -- Deterministic locks serialize existing save RPCs without touching stop rows.
  perform 1 from public.journeys q where q.id in (select (x->>'journeyId')::uuid from jsonb_array_elements(operation->'items') x) order by q.id for update;
  perform 1 from public.journey_stops s where s.journey_id in (select (x->>'journeyId')::uuid from jsonb_array_elements(operation->'items') x) order by s.journey_id,s.sequence for share;
  perform 1 from storage.objects o where o.bucket_id='journey-media' and o.name in
    (select substr(p,15) from jsonb_array_elements(operation->'items') x cross join lateral unnest(array[x->>'oldPath',x->>'newPath',x->>'thumbnailPath']) p)
    order by o.name for share;
  for item in select x from jsonb_array_elements(operation->'items') x order by x->>'journeyId' loop
    select * into strict j from public.journeys where id=(item->>'journeyId')::uuid;
    if j.user_id <> (item->>'ownerId')::uuid or j.status <> item->>'status'
      or j.cover_image_path is distinct from item->>'${rollback ? 'newPath' : 'oldPath'}'
      or j.updated_at is distinct from (item->>'${rollback ? 'activationVersion' : 'expectedUpdatedAt'}')::timestamptz
      or md5((to_jsonb(j)-'cover_image_path'-'updated_at')::text) <> item->>'rowDigest'
      or (select md5(coalesce(jsonb_agg(to_jsonb(s) order by s.sequence)::text,'[]')) from public.journey_stops s where s.journey_id=j.id) <> item->>'stopsDigest'
      then raise exception 'Reference/snapshot drift; entire batch stopped'; end if;
    ${rollback ? `if not exists(select 1 from private.journey_media_authorizations a where a.journey_id=j.id and a.media_path=item->>'oldPath')
      then raise exception 'Original authorization missing; rollback stopped'; end if;` : `if (select md5(coalesce(jsonb_agg(a.media_path order by a.media_path)::text,'[]')) from private.journey_media_authorizations a where a.journey_id=j.id) <> item->>'authorizationDigest'
      or not exists(select 1 from private.journey_media_authorizations a where a.journey_id=j.id and a.media_path=item->>'oldPath')
      or exists(select 1 from private.journey_media_authorizations a where a.journey_id=j.id and a.media_path=item->>'newPath')
      then raise exception 'Authorization snapshot drift'; end if;`}
    -- Original object identity/version/size is immutable for this operation.
    if not exists(select 1 from storage.objects o where o.bucket_id='journey-media' and o.name=substr(item->>'oldPath',15)
      and o.id=(item->'sourceObject'->>'id')::uuid and o.version=item->'sourceObject'->>'version'
      and (o.metadata->>'size')::bigint=(item->'sourceObject'->>'size')::bigint)
      then raise exception 'Original source version changed'; end if;
    ${rollback ? '' : `if not exists(select 1 from storage.objects o where o.bucket_id='journey-media' and o.name=substr(item->>'newPath',15)
      and o.id=(item->'fullObject'->>'id')::uuid and o.version=item->'fullObject'->>'version'
      and (o.metadata->>'size')::bigint=(item->'fullObject'->>'size')::bigint and o.metadata->>'mimetype'=item->'fullObject'->>'mime')
      or not exists(select 1 from storage.objects o where o.bucket_id='journey-media' and o.name=substr(item->>'thumbnailPath',15)
      and o.id=(item->'thumbnailObject'->>'id')::uuid and o.version=item->'thumbnailObject'->>'version'
      and (o.metadata->>'size')::bigint=(item->'thumbnailObject'->>'size')::bigint and o.metadata->>'mimetype'='image/jpeg')
      then raise exception 'Verified destination metadata changed'; end if;
    insert into private.journey_media_authorizations(journey_id,media_path) values(j.id,item->>'newPath');`}
    update public.journeys set cover_image_path=item->>'${rollback ? 'oldPath' : 'newPath'}' where id=j.id returning updated_at into returned_version;
    if returned_version <= j.updated_at
      or (select md5((to_jsonb(q)-'cover_image_path'-'updated_at')::text) from public.journeys q where q.id=j.id) <> item->>'rowDigest'
      or (select md5(coalesce(jsonb_agg(to_jsonb(s) order by s.sequence)::text,'[]')) from public.journey_stops s where s.journey_id=j.id) <> item->>'stopsDigest'
      then raise exception 'Unexpected record mutation'; end if;
    ${rollback ? `delete from private.journey_media_authorizations a where a.journey_id=j.id and a.media_path=item->>'newPath'
      and not exists(select 1 from public.journeys q where q.id=j.id and q.cover_image_path=a.media_path)
      and not exists(select 1 from public.journey_stops s where s.journey_id=j.id and s.photo_path=a.media_path);
    if (select md5(coalesce(jsonb_agg(a.media_path order by a.media_path)::text,'[]')) from private.journey_media_authorizations a where a.journey_id=j.id) <> item->>'authorizationDigest'
      then raise exception 'Rollback authorization mismatch'; end if;` : ''}
    receipts := receipts || jsonb_build_array(jsonb_build_object('journeyId',j.id,'oldPath',item->>'oldPath','newPath',item->>'newPath','updatedAt',returned_version,'authorizationCreated',action='activate','originalAuthorizationRetained',true));
  end loop;
  perform set_config('journey_backfill.receipt',jsonb_build_object('projectRef','${TARGET}','operationSha256','${operationSha}','action',action,'items',receipts)::text,false);
end
$explore_backfill$;
commit;
select current_setting('journey_backfill.receipt')::jsonb as receipt;`;
}
