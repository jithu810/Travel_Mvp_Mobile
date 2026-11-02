import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(file, modules = {}) {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  new Function('require', 'exports', code)(name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    assert.ok(name in modules, `Unexpected dependency: ${name}`);
    return modules[name];
  }, exports);
  return exports;
}
const ids = { isJourneyId: value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  object: value => value && typeof value === 'object' && !Array.isArray(value) ? value : null, safePhoto: value => value };
const model = load('src/lib/create/model.ts', { '../discovery/model': ids });
const editor = load('src/lib/create/editor-model.ts', { '../discovery/model': ids, './model': model });
const variants = { storedThumbnailsEnabled: () => false, thumbnailObjectName: () => null, thumbnailStoragePath: () => null };
const { createPhotoSaveController } = load('src/lib/create/photo-save.ts', { './model': model, '../discovery/model': ids, '../media/image-variants': variants });
const id = '11111111-1111-4111-8111-111111111111', owner = '22222222-2222-4222-8222-222222222222';
const stopId = '33333333-3333-4333-8333-333333333333', other = '44444444-4444-4444-8444-444444444444';
const newStop = '55555555-5555-4555-8555-555555555555', version = '2026-11-01T10:00:00.123456Z';
const row = () => ({ id, user_id: owner, status: 'published', is_demo: false, updated_at: version,
  title: 'Published original', description: null, cover_image_path: `journey-media/${owner}/${id}/cover/raw.jpg`,
  destination_slug: 'varkala', destination_name: 'Varkala', destination_latitude: 8.7, destination_longitude: 76.7,
  traveler_type: 'solo', duration_days: 2, copied_from_journey_id: null });
const stops = () => [{ id: stopId, journey_id: id, sequence: 1, name: 'Original stop', description: null,
  latitude: 8.7, longitude: 76.7, mapbox_place_id: 'raw-place', photo_path: `journey-media/${owner}/${id}/stops/${stopId}/raw.jpg`, rating: 0, day_number: 1 }];
const form = () => editor.hydrateDraft(row(), stops(), id, owner, true);
const photo = { uri: 'file:///synthetic-prepared.jpg', mime: 'image/jpeg', width: 800, height: 600, size: 1000 };
const tick = async () => { for (let n = 0; n < 4; n++) await new Promise(setImmediate); };

function nodes(tree, type) {
  if(!tree || typeof tree!=='object')return [];
  return [...(tree.type===type?[tree]:[]),...[tree.props?.children].flat(Infinity).flatMap(child=>nodes(child,type))];
}
function optionsHarness(user = owner, creatorId = owner) {
  const slots=[],routes=[],effects=[];let cursor=0,currentUser=user,loading=false;
  const memo=(fn,deps)=>{const i=cursor++;if(!slots[i]||deps.some((v,n)=>v!==slots[i].deps[n]))slots[i]={value:fn(),deps};return slots[i].value;};
  const react={useEffect:()=>{},useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
    useRef:initial=>{const i=cursor++;return slots[i]??={current:initial};},useCallback:(fn,deps)=>memo(()=>fn,deps),
    useSyncExternalStore:(_,get)=>get()};
  const store={subscribe(){},get:()=>({busy:false,blocked:false,error:null}),run:async()=>{throw Error('Edit cannot create a remix');}};
  const {JourneyOptions}=load('src/components/journey/journey-options.tsx',{
    react,'react-native':{...Object.fromEntries(['View','Text','Pressable','ActivityIndicator','Modal','ScrollView'].map(name=>[name,name])),StyleSheet:{create:value=>value}},
    'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'expo-router':{useRouter:()=>({push:value=>routes.push(value)}),useFocusEffect:fn=>{const i=cursor++;if(slots[i]?.fn!==fn){slots[i]?.cleanup?.();slots[i]={fn,cleanup:fn()};effects.push(slots[i]);}}},
    '@/theme/dark-pilot':{usePilotColor:()=>value=>value,darkPilotStyles:value=>value},'@/theme/mobile-theme':{primaryControl:{}},
    './journey-action-icon':{JourneyActionIcon:'JourneyActionIcon'},'../discovery/ui':{Action:'Action',colors:{},ui:{}},
    '@/hooks/session-context':{useSessionState:()=>({loading,session:currentUser?{user:{id:currentUser}}:null})},
    '@/hooks/action-intent':{useActionIntent:()=>({pending:null,begin:()=>true})},'@/lib/remix/model':{remixStore:store},
    './story-sheet':{StorySheet:'StorySheet'},'@/lib/remix/queries':{remixJourney(){throw Error('Edit cannot call Remix');}},
  });
  return {routes,render:()=>{cursor=0;return JourneyOptions({id,creatorId,presentation:'rail',onUse(){}});},
    setUser:value=>{currentUser=value;},setLoading:value=>{loading=value;},blur:()=>effects.forEach(effect=>effect.cleanup?.())};
}

test('the owner gets Edit in the same rail; other users and signed-out visitors keep Make it yours',()=>{
  for(const user of [owner,other,null]) {
    const h=optionsHarness(user);const tree=h.render();
    const buttons=nodes(tree,'Pressable');
    assert.equal(buttons[0].props.accessibilityLabel,user===owner?'Edit journey':'Make it yours');
    assert.equal(buttons[1].props.accessibilityLabel,'About this journey');
    buttons[0].props.onPress();
    if(user===owner)assert.deepEqual(h.routes,[{pathname:'/create',params:{editPublished:id}}]);
    else {assert.equal(h.routes.length,0);assert.equal(nodes(h.render(),'StorySheet')[0].props.visible,true);}
  }
  const unavailable=optionsHarness(owner,null); // Missing public creator identity fails closed.
  assert.equal(nodes(unavailable.render(),'Pressable')[0].props.accessibilityLabel,'Make it yours');
});

test('stale Edit callbacks cannot navigate after blur or switching away from the owner account',()=>{
  for(const action of ['blur','switch']) {
    const h=optionsHarness();const edit=nodes(h.render(),'Pressable')[0].props.onPress;
    if(action==='blur')h.blur();else {h.setUser(other);h.render();}
    edit();assert.equal(h.routes.length,0);
  }
  const loading=optionsHarness();loading.setLoading(true);
  assert.equal(nodes(loading.render(),'Pressable')[0].props.disabled,true);
});

function queryHarness({ answers = [row(), stops(), { updated_at: version }], auth = [owner, owner], onRead = () => {} } = {}) {
  const reads = [], calls = []; let authCalls = 0;
  const client = { auth: { getUser: async () => { const user = auth[Math.min(authCalls++,auth.length-1)]; return { data: { user: user ? { id: user } : null }, error: null }; } },
    from: table => {
      const entry = { table, filters: [] }; reads.push(entry);
      const result = async () => { onRead(entry,reads.length); const value=answers.shift(); return value?.error ? value : { data: value, error: null }; };
      const query = { select: columns => { entry.columns=columns; return query; }, eq: (key,value) => { entry.filters.push([key,value]); return query; },
        abortSignal: () => query, order: () => query, maybeSingle: result, then: (resolve,reject) => result().then(resolve,reject) };
      return query;
    }, rpc: () => { calls.push('rpc'); throw Error('Read-only loading cannot write'); } };
  const queries = load('src/lib/create/queries.ts', { './editor-model': editor, '../supabase/client': { supabase: client },
    '../auth/model': { accountCheckMessage: (_,fallback) => fallback }, '../discovery/model': ids, './model': model, '../media/image-variants': variants });
  const photos = load('src/lib/create/photo-queries.ts', { '../supabase/client': { supabase: client }, '../auth/model': { accountCheckMessage: (_,fallback) => fallback },
    '../discovery/model': ids, './model': model, './photo-device': { readPreparedPhoto() { throw Error('No upload permitted'); } }, '../media/image-variants': variants });
  return { ...queries, ...photos, reads, calls, get authCalls() { return authCalls; } };
}

test('published hydration is explicit, owner-only, non-demo and preserves raw metadata/media/version', () => {
  const loaded = form();
  assert.equal(loaded.editingPublished,true);
  assert.equal(loaded.updatedAt,version);
  assert.equal(loaded.coverPath,row().cover_image_path);
  assert.equal(loaded.stops[0].photoPath,stops()[0].photo_path);
  assert.equal(loaded.stops[0].mapboxId,'raw-place');
  assert.equal(loaded.stops[0].rating,'0');
  assert.equal(loaded.descriptionWasNull,true);
  for (const patch of [{ user_id: other }, { status: 'draft' }, { is_demo: true }]) {
    assert.throws(() => editor.hydrateDraft({ ...row(), ...patch },stops(),id,owner,true));
  }
  assert.throws(() => editor.hydrateDraft(row(),stops(),id,owner));
  assert.equal(editor.hydrateDraft({ ...row(),status:'draft' },stops(),id,owner).editingPublished,undefined);
});

test('published loading filters by owner/status twice, loads all raw stops and rereads authenticated identity without writes', async () => {
  const h=queryHarness(); const loaded=await h.loadEditableDraft(id,owner,new AbortController().signal,true);
  assert.equal(loaded.editingPublished,true); assert.equal(h.authCalls,2); assert.equal(h.calls.length,0);
  for (const read of h.reads.filter(r=>r.table==='journeys')) {
    assert.ok(read.filters.some(([key,value])=>key==='user_id'&&value===owner));
    assert.ok(read.filters.some(([key,value])=>key==='status'&&value==='published'));
  }
  assert.ok(h.reads.find(r=>r.table==='journey_stops').columns.includes('photo_path'));
});

test('published loader rejects signed-out, other-account, interrupted, inconsistent and incomplete results', async () => {
  for (const options of [
    {auth:[null]}, {auth:[other]}, {auth:[owner,other]},
    {answers:[row(),stops(),{updated_at:'2026-11-01T10:00:01Z'}]},
    {answers:[row(),{error:{message:'Synthetic stop read failure'}}]},
    {answers:[{...row(),is_demo:true},stops(),{updated_at:version}]},
  ]) {
    const h=queryHarness(options); await assert.rejects(h.loadEditableDraft(id,owner,new AbortController().signal,true));
    assert.equal(h.calls.length,0);
  }
  const abort=new AbortController();
  const h=queryHarness({onRead:(_,number)=>{if(number===2)abort.abort();}});
  await assert.rejects(h.loadEditableDraft(id,owner,abort.signal,true));
});

test('photo verification requires current owned published version and never writes', async () => {
  const data={id,user_id:owner,status:'published',is_demo:false,updated_at:version};
  const h=queryHarness({answers:[data,[{id:stopId}]],auth:[owner]});
  assert.deepEqual(await h.checkPhotoDraft(form(),owner,new AbortController().signal),{ownerId:owner,stopIds:[stopId]});
  assert.ok(h.reads[0].filters.some(([key,value])=>key==='status'&&value==='published'));
  for(const patch of [{status:'draft'},{user_id:other},{is_demo:true},{updated_at:'2026-11-01T10:00:01Z'}]) {
    const bad=queryHarness({answers:[{...data,...patch}],auth:[owner]});
    await assert.rejects(bad.checkPhotoDraft(form(),owner,new AbortController().signal));
    assert.equal(bad.calls.length,0);
  }
});

function photoController({ failure, pending, checkFailure, saveFailure } = {}) {
  const writes=[],uploads=[],checks=[],checkpoints=[]; let serial=0;
  const controller=createPhotoSaveController({
    save:model.createSaveController(async payload=>{writes.push(payload);if(saveFailure)throw saveFailure;return {id,status:payload.status,updated_at:'2026-11-01T11:00:00Z'};}).save,
    checkDraft:async value=>{checks.push(value);if(checkFailure)throw checkFailure;return {ownerId:owner,stopIds:[stopId]};},
    uuid:()=>`77777777-7777-4777-8777-${String(++serial).padStart(12,'0')}`,
    upload:async(name,value)=>{uploads.push([name,value]);if(pending)await pending;if(failure)throw failure;},
  });
  return {writes,uploads,checks,checkpoints,controller,save:(value,status='published',candidates={})=>controller.save(value,status,candidates,new AbortController().signal,()=>{},value=>checkpoints.push(value))};
}

test('published photo save accepts new local stop plus cover with no draft checkpoint and exactly one final same-ID published payload', async () => {
  const h=photoController();const input={...form(),stops:[...form().stops,{...form().stops[0],id:newStop,photoPath:null}]};
  const result=await h.save(input,'published',{cover:photo,[newStop]:{...photo,uri:'file:///new-stop.jpg'}});
  assert.equal(result.kind,'saved');assert.equal(h.checkpoints.length,0);assert.equal(h.writes.length,1);assert.equal(h.uploads.length,2);
  assert.equal(h.writes[0].id,id);assert.equal(h.writes[0].status,'published');assert.equal(h.writes[0].updated_at,version);
  assert.equal(h.writes[0].stops[1].id,newStop);assert.ok(h.writes[0].stops[1].photo_path.includes('/stops/'+newStop+'/'));
  assert.equal(h.writes[0].stops[0].photo_path,form().stops[0].photoPath);
  assert.equal('editingPublished' in h.writes[0],false);assert.equal(JSON.stringify(h.writes).includes('file:///'),false);
});

test('published mode prevents draft persistence and missing-base bypass before upload or metadata submission', async () => {
  for(const [input,status] of [[form(),'draft'],[{...form(),updatedAt:null},'published']]) {
    const h=photoController();assert.equal((await h.save(input,status,{cover:photo})).kind,'error');
    assert.equal(h.writes.length,0);assert.equal(h.uploads.length,0);
  }
});

test('failed parent verification and rejected uploads leave public metadata untouched; ambiguous uploads block retries', async () => {
  for(const options of [{checkFailure:new model.SaveFailure('Wrong published version',true)},{failure:new model.SaveFailure('Rejected')},{failure:new model.SaveFailure('Unknown upload',true)}]) {
    const h=photoController(options);const result=await h.save(form(),'published',{cover:photo});
    assert.equal(result.kind,'error');assert.equal(h.writes.length,0);assert.equal(h.checkpoints.length,0);
    if(result.uncertain)assert.equal((await h.save(form(),'published',{cover:photo})).kind,'blocked');
  }
});

test('concurrent republish attempts share the upload lock and stale final RPC blocks retries', async () => {
  let finish;const pending=new Promise(resolve=>{finish=resolve;});const h=photoController({pending});
  const first=h.save(form(),'published',{cover:photo});await tick();
  assert.equal((await h.save(form(),'published',{cover:photo})).kind,'blocked');finish();assert.equal((await first).kind,'saved');
  assert.equal(h.uploads.length,1);assert.equal(h.writes.length,1);
  const conflict=photoController({saveFailure:new model.SaveFailure('Changed journey',true)});
  assert.equal((await conflict.save(form(),'published',{cover:photo})).uncertain,true);
  assert.equal((await conflict.save(form(),'published',{cover:photo})).kind,'blocked');
  assert.equal(conflict.writes.length,1);assert.equal(conflict.checkpoints.length,0);
});

test('recovery isolates published versus draft modes and precise base versions, preserving the trusted loaded mode', async () => {
  const recovery=load('src/lib/create/recovery.ts');const current=form();
  const snapshot=recovery.buildSnapshot(owner,{...current,title:'Local published edit'},null,false,Date.now());
  const parsed=recovery.parseSnapshot(JSON.stringify(snapshot),owner,id);
  assert.equal(parsed.form.editingPublished,true);assert.equal(recovery.hasSameBaseVersion(parsed,current),true);
  assert.equal(recovery.hasSameBaseVersion(parsed,{...current,editingPublished:false}),false);
  assert.equal(recovery.hasSameBaseVersion(parsed,{...current,updatedAt:'2026-11-01T10:00:00.123457Z'}),false);
  assert.equal(recovery.parseSnapshot(JSON.stringify(snapshot),other,id),null);
  assert.equal(recovery.restoredState({...parsed,form:{...parsed.form,editingPublished:false}},current,()=>newStop).form.editingPublished,true);
  assert.equal(recovery.restoredState(parsed,{...current,editingPublished:false},()=>newStop).form.editingPublished,undefined);
});

test('precise recovery version equality accepts timezone and trailing-zero equivalents while rejecting finer changes',()=>{
 const recovery=load('src/lib/create/recovery.ts');const current=form();
 const snapshot=recovery.buildSnapshot(owner,current,null,false,Date.now());
 for(const updatedAt of ['2026-11-01T10:00:00.123456+00:00','2026-11-01T15:30:00.123456+05:30','2026-11-01T10:00:00.123456000Z']) {
  assert.equal(recovery.hasSameBaseVersion(snapshot,{...current,updatedAt}),true,updatedAt);
 }
 for(const updatedAt of ['2026-11-01T10:00:00.123457Z','2026-11-01T15:30:00.123455+05:30','2026-11-01T10:00:00.123456001Z']) {
  assert.equal(recovery.hasSameBaseVersion(snapshot,{...current,updatedAt}),false,updatedAt);
 }
 const wholeSecond={...current,updatedAt:'2026-11-01T10:00:00Z'};
 assert.equal(recovery.hasSameBaseVersion(recovery.buildSnapshot(owner,wholeSecond,null,false,Date.now()),{...wholeSecond,updatedAt:'2026-11-01T10:00:00.000000+00:00'}),true);
});
