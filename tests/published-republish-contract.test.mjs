import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const sharedFixture = new URL('../../Travel_Mvp/scripts/lib/offline-db.mjs',import.meta.url);
let unavailable = existsSync(sharedFixture) ? null : 'Optional backend contract: sibling Web offline-db fixture is unavailable.';
if (!unavailable) {
  try { createRequire(sharedFixture).resolve('@electric-sql/pglite'); }
  catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    unavailable = 'Optional backend contract: sibling Web PGlite dependency is not installed.';
  }
}
// Only expected optional-fixture absence is skipped. A present fixture that fails
// to import or execute must fail the test, exposing unexpected regressions.
const { offlineDb, migrations, as } = unavailable ? {} : await import(sharedFixture.href);

// The shared fixture creates a fresh in-memory PGlite database. It never accepts
// a DSN, reads environment files, opens a network connection or writes live data.
// A Mobile-only checkout explicitly skips this optional shared contract check.
const owner = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const journeyId = '20000000-0000-4000-8000-000000000001';
const otherJourney = '20000000-0000-4000-8000-000000000002';
const oldStop = '30000000-0000-4000-8000-000000000001';
const newStop = '30000000-0000-4000-8000-000000000002';
const otherStop = '30000000-0000-4000-8000-000000000003';
const objectName = `${owner}/${journeyId}/stops/${newStop}/40000000-0000-4000-8000-000000000001.full-v1.jpg`;
const stop = (id, sequence = 1) => ({ id, sequence, name: 'Synthetic stop', description: '', latitude: 8.7,
  longitude: 76.7, mapbox_place_id: null, photo_path: null, rating: 4, day_number: 1 });
const payload = (id, idOfStop) => ({ id, title: 'Synthetic published route', description: '',
  destination_slug: 'varkala', traveler_type: 'solo', duration_days: 2, status: 'published',
  updated_at: null, cover_image_path: null, stops: [stop(idOfStop)] });

test('existing backend contracts support atomic owner republication without a draft checkpoint', {skip: unavailable || false}, async t => {
  const db = await offlineDb();
  const save = async value => (await db.query('select public.save_journey($1::jsonb) as result', [JSON.stringify(value)])).rows[0].result;
  const snapshot = async () => (await db.query(`select jsonb_build_object('journey',to_jsonb(j),
    'stops',(select jsonb_agg(to_jsonb(s) order by sequence) from public.journey_stops s where s.journey_id=j.id)) as value
    from public.journeys j where j.id=$1`, [journeyId])).rows[0].value;
  const objects = async () => (await db.query('select name from storage.objects where bucket_id=$1 and name=$2', ['journey-media',objectName])).rows;
  try {
    await migrations(db);
    await db.query('insert into auth.users(id) values($1),($2)', [owner,other]);
    await as(db,'authenticated',owner);
    const initial = payload(journeyId,oldStop);
    const created = await save(initial);
    const before = await snapshot();
    assert.equal(before.journey.status,'published');
    assert.equal(before.journey.user_id,owner);
    initial.updated_at = created.updated_at;
    await as(db,'authenticated',other);
    await save(payload(otherJourney,otherStop));
    await db.query('insert into public.journey_likes(user_id,journey_id) values($1,$2)',[other,journeyId]);
    await db.query('insert into public.saved_journeys(user_id,journey_id) values($1,$2)',[other,journeyId]);

    await t.test('anonymous and another owner cannot republish the target',async()=>{
      await as(db,'anon');
      await assert.rejects(save(initial),error=>error.code==='42501');
      await as(db,'authenticated',other);
      await assert.rejects(save({...initial,title:'Cross-owner attempt'}),error=>error.code==='40001');
      assert.deepEqual(await snapshot(),before);
    });

    await t.test('new-stop media upload requires only an existing owned parent and remains private before republish',async()=>{
      await as(db,'authenticated',owner);
      assert.equal((await db.query('select count(*)::int as n from public.journey_stops where id=$1',[newStop])).rows[0].n,0);
      await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['journey-media',objectName]);
      assert.equal((await objects()).length,1);
      assert.deepEqual(await snapshot(),before,'Uploading an unreferenced object does not modify the public journey');
      await as(db,'anon');
      assert.equal((await objects()).length,0);
      await as(db,'authenticated',other);
      assert.equal((await objects()).length,0);
      const foreignPath = `${other}/${journeyId}/cover/40000000-0000-4000-8000-000000000002.jpg`;
      await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['journey-media',foreignPath]),error=>error.code==='42501');
    });

    const edited = {...initial,title:'Republished route',stops:[stop(oldStop),{...stop(newStop,2),photo_path:'journey-media/'+objectName}]};
    let republished;
    await t.test('one published save atomically adds a photographed stop, preserving identity, attribution and first publication date',async()=>{
      await as(db,'authenticated',owner);
      republished = await save(edited);
      const after = await snapshot();
      assert.equal(republished.status,'published');
      assert.equal(republished.id,journeyId);
      assert.notEqual(republished.updated_at,created.updated_at);
      assert.ok(Date.parse(republished.updated_at)>=Date.parse(created.updated_at));
      assert.equal(after.journey.id,before.journey.id);
      assert.equal(after.journey.user_id,before.journey.user_id);
      assert.equal(after.journey.published_at,before.journey.published_at);
      assert.equal(after.journey.copied_from_journey_id,before.journey.copied_from_journey_id);
      assert.equal(after.journey.title,'Republished route');
      assert.deepEqual(after.stops.map(s=>[s.id,s.sequence,s.photo_path]),[[oldStop,1,null],[newStop,2,'journey-media/'+objectName]]);
      await as(db,'authenticated',other);
      assert.equal((await db.query('select count(*)::int as n from public.journey_likes where user_id=$1 and journey_id=$2',[other,journeyId])).rows[0].n,1);
      assert.equal((await db.query('select count(*)::int as n from public.saved_journeys where user_id=$1 and journey_id=$2',[other,journeyId])).rows[0].n,1);
    });

    await t.test('new media becomes publicly readable only after its reference is committed',async()=>{
      await as(db,'anon');
      assert.equal((await objects()).length,1);
      assert.equal((await snapshot()).journey.status,'published');
    });

    await t.test('stale versions reject publication without changing the current public snapshot',async()=>{
      await as(db,'authenticated',owner);
      const beforeConflict = await snapshot();
      await assert.rejects(save({...edited,title:'Stale overwrite'}),error=>error.code==='40001');
      assert.deepEqual(await snapshot(),beforeConflict);
    });

    await t.test('a stop primary-key failure after the journey update rolls the whole publication back',async()=>{
      await as(db,'authenticated',owner);
      const beforeFailure = await snapshot();
      await assert.rejects(save({...edited,updated_at:republished.updated_at,title:'Must roll back',stops:[stop(otherStop)]}),error=>error.code==='23505');
      assert.deepEqual(await snapshot(),beforeFailure,'Metadata update and stop deletion roll back with failed insert');
      await as(db,'anon');
      assert.equal((await objects()).length,1,'Previously published media authorization survives rollback');
    });

    await t.test('owner can remove and reorder stops on republish without removing the parent or social records',async()=>{
      await as(db,'authenticated',owner);
      const result = await save({...edited,updated_at:republished.updated_at,stops:[{...edited.stops[1],sequence:1}]});
      const final = await snapshot();
      assert.equal(result.status,'published');
      assert.equal(final.journey.published_at,before.journey.published_at);
      assert.deepEqual(final.stops.map(s=>[s.id,s.sequence]),[[newStop,1]]);
      await as(db,'authenticated',other);
      assert.equal((await db.query('select count(*)::int as n from public.saved_journeys where journey_id=$1',[journeyId])).rows[0].n,1);
    });
  } finally { await db.close(); }
});
