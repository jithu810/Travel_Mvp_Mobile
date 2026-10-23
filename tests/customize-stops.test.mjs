import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
// Execute the actual dependency-free shared theme in the component harness.
const mobileTheme = {};
new Function('exports', ts.transpileModule(readFileSync('src/theme/mobile-theme.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mobileTheme);

function load(file, modules) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', code)(name => { if (name === '@/theme/mobile-theme') return mobileTheme;  if (name in modules) return modules[name]; throw new Error(name); }, exports);
  return exports;
}
const coordinates = stop => Number.isFinite(stop.latitude) && Math.abs(stop.latitude) <= 90 && Number.isFinite(stop.longitude) && Math.abs(stop.longitude) <= 180;
const navigation = { coordinates, requestRoadRoute() { throw Error('Unexpected network'); }, routeSummary: () => 'Selected road route' };
const model = load('src/lib/remix/customize.ts', { '../journey/navigation': navigation });
const remix = load('src/lib/remix/model.ts', { '../discovery/model': {} });
const sourceId = '10000000-0000-4000-8000-000000000000', userId = '20000000-0000-4000-8000-000000000000', draftId = '30000000-0000-4000-8000-000000000000';
const stops = [1, 2, 3].map(sequence => Object.freeze({ id: `40000000-0000-4000-8000-00000000000${sequence}`, sequence, name: ['First', 'Middle', 'Last'][sequence - 1], latitude: sequence, longitude: sequence + 10, description: '', photo: null, dayNumber: null }));
Object.freeze(stops);
const journey = Object.freeze({ id: sourceId, title: 'Original', stops });
const tick = () => new Promise(setImmediate);
function deferred() { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; }
function all(tree, type) { if (!tree || typeof tree !== 'object') return []; return [...(tree.type === type ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(child => all(child,type))]; }
function textContent(tree) { if (tree === null || tree === undefined || typeof tree === 'boolean') return ''; if (Array.isArray(tree)) return tree.map(textContent).join(''); return typeof tree === 'object' ? textContent(tree.props?.children) : String(tree); }
function harness() {
  const slots=[]; let cursor=0, effects=[], auth={ loading:false, session:null }, route={loading:false,error:null,data:null,retry(){}}, writes=[], routes=[];
  const memo=(fn,deps) => { const i=cursor++; if (!slots[i] || deps.some((v,j)=>slots[i].deps[j]!==v)) slots[i]={value:fn(),deps}; return slots[i].value; };
  const hooks={ useState(value) { const i=cursor++; if (!(i in slots)) slots[i]=typeof value==='function'?value():value; return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}]; }, useRef(value) { const i=cursor++; return slots[i]??={current:value}; }, useEffect:fn=>{effects.push(fn);}, useMemo:memo, useCallback:(fn,deps)=>memo(()=>fn,deps), useSyncExternalStore:(_,get)=>get() };
  const store=remix.createRemixStore(); let pending=null;
  const router={push:value=>routes.push(['push',value]),replace:value=>routes.push(['replace',value]),back:()=>routes.push(['back'])};
  const jsx=(type,props)=>({type,props});
  const component=load('src/components/journey/customize-stops.tsx', {
    react:hooks,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},'expo-router':{useRouter:()=>router,useFocusEffect:fn=>{ effects.push(fn); }},
    'react-native':{...Object.fromEntries(['ActivityIndicator','Pressable','ScrollView','Text','View'].map(v=>[v,v])),StyleSheet:{create:value=>value},BackHandler:{addEventListener:()=>({remove(){}})},PanResponder:{create:value=>({panHandlers:value})}},
    '../discovery/ui':{Action:'Action',ui:{},colors:{paper:'#F5F3EC',ink:'#153E35',muted:'#65736A',green:'#708454',line:'#DEE2D7',white:'#FFFFFF',pale:'#E5EBD9'}},'../discovery/journey-photo':{JourneyPhoto:'JourneyPhoto'},'./map/journey-map':{JourneyMap:'JourneyMap'},
    '@/hooks/session-context':{useSessionState:()=>auth},'@/hooks/use-load':{useLoad:()=>route},'@/lib/create/id':{randomUUID:()=>draftId},'@/lib/remix/customize':model,
    '@/lib/remix/model':{remixStore:store},'@/lib/remix/queries':{remixSelectedJourney:async(...args)=>{writes.push(args);if(pending)await pending;return draftId;}},'@/lib/journey/navigation':navigation,
  }).CustomizeStops;
  let tree; const render=()=>{cursor=0;effects=[];tree=component({journey});effects.forEach(fn=>fn());return tree;};
  const click=label=>{const action=all(tree,'Action').find(item=>item.props.label===label);assert.ok(action,`Missing ${label}`);assert.ok(!action.props.disabled,`${label} disabled`);action.props.onPress();render();};
  return {render,click,writes,routes,store,auth:value=>{auth=value;},route:value=>{route={...route,...value};},pending:value=>{pending=value;},tree:()=>tree};
}
test('immutable selection, repeated Undo and revisiting preserve original order',()=>{
  let selection=model.emptySelection(); selection=model.decide(selection,[...stops].reverse(),true); selection=model.decide(selection,stops,false); selection=model.decide(selection,stops,true);
  assert.deepEqual(model.selectedStops(stops,selection).map(v=>v.name),['First','Last']);
  selection=model.undoSelection(selection);assert.equal(selection.cursor,2);selection=model.undoSelection(selection);assert.equal(selection.cursor,1);
  selection=model.decide(selection,stops,true);selection=model.decide(selection,stops,true);
  assert.deepEqual(model.selectedStops([...stops].reverse(),selection),stops);assert.deepEqual(stops.map(v=>v.sequence),[1,2,3]);
});
test('selection constraints explain invalid data and allow one stop',()=>{
  assert.match(model.selectionIssue([]),/at least one/);assert.equal(model.selectionIssue([stops[0]]),null);
  assert.match(model.selectionIssue([stops[0],stops[0]]),/duplicate/);assert.match(model.selectionIssue([{...stops[0],latitude:null}]),/valid map/);
  assert.match(model.selectionIssue(Array.from({length:51},(_,i)=>({...stops[0],id:String(i)}))),/50/);
});
test('selected route uses new endpoints only; one stop needs no request',async()=>{
  const calls=[]; const request=async(start,end)=>{calls.push([start.id,end.id]);return {geometry:{type:'LineString',coordinates:[[start.longitude,start.latitude],[end.longitude,end.latitude]]},distance:10,duration:5};};
  const signal=new AbortController().signal;
  const route=await model.requestSelectedRoute([stops[2],stops[0]],'token',signal,request);
  assert.deepEqual(calls,[[stops[0].id,stops[2].id]]);assert.deepEqual(route.geometry.coordinates,[[11,1],[13,3]]);
  calls.length=0;assert.equal(await model.requestSelectedRoute([stops[1]],'token',signal,request),null);assert.equal(calls.length,0);
  const full=await model.requestSelectedRoute(stops,'token',signal,request);assert.equal(full.distance,20);assert.equal(full.duration,10);assert.deepEqual(full.geometry.coordinates,[[11,1],[12,2],[13,3]]);
});
test('cancelled route discards an outstanding leg and does not request subsequent legs',async()=>{
  const controller=new AbortController(), pending=deferred();let calls=0;
  const result=model.requestSelectedRoute(stops,'token',controller.signal,async()=>{calls++;return pending.promise;});
  controller.abort();pending.resolve({geometry:{type:'LineString',coordinates:[[11,1],[12,2]]},distance:1,duration:1});
  await assert.rejects(result,/cancelled/);assert.equal(calls,1);
});
test('actual component Undo, review/back and restore retain decisions and order with zero writes',()=>{
  const h=harness();h.render();h.click('Keep');h.click('Skip');h.click('Undo');h.click('Skip');h.click('Keep');h.click('Review selected stops');
  assert.deepEqual(all(h.tree(),'JourneyMap')[0].props.stops.map(v=>v.name),['First','Last']);
  h.click('Restore Middle');assert.deepEqual(all(h.tree(),'JourneyMap')[0].props.stops,stops);
  all(h.tree(),'Pressable').find(v=>v.props.accessibilityLabel==='Back to stop selections').props.onPress();h.render();
  assert.ok(all(h.tree(),'Text').some(v=>String(v.props.children).includes('Current selection:')));
  h.click('Keep');h.click('Keep');h.click('Keep');h.click('Review selected stops');assert.deepEqual(all(h.tree(),'JourneyMap')[0].props.stops,stops);
  h.click('Exit customization');assert.equal(h.writes.length,0);assert.deepEqual(h.routes.at(-1),['back']);
});

test('selection offers persistent named buttons and explicit swipe directions without requiring a gesture',()=>{
  const h=harness();h.render();
  for (const [index,label] of ['Skip','Keep','Skip'].entries()) {
    const tree=h.tree(), scroll=all(tree,'ScrollView')[0];
    assert.match(textContent(tree),/Swipe left to skip/);assert.match(textContent(tree),/Swipe right to keep/);
    assert.match(textContent(tree),/swiping is optional/);
    for (const actionLabel of ['Skip','Keep']) {
      const button=all(tree,'Action').find(item=>item.props.label===actionLabel);
      assert.ok(button,`${actionLabel} is available before deciding`);
      assert.equal(button.props.accessibilityLabel,`${actionLabel} ${stops[index].name}`);
      assert.ok(!all(scroll,'Action').includes(button),'Decision buttons stay outside scrolling card content');
    }
    h.click(label);
  }
  h.click('Review selected stops');
  assert.deepEqual(all(h.tree(),'JourneyMap')[0].props.stops,[stops[1]]);
  assert.equal(h.writes.length,0);
});

test('review groups selected and skipped stops and makes restore, original position and undo observable',()=>{
  const h=harness();h.render();h.click('Keep');h.click('Skip');h.click('Keep');h.click('Review selected stops');
  const section=prefix=>all(h.tree(),'View').find(view=>[view.props.children].flat(Infinity).some(child=>child?.type==='Text'&&textContent(child).startsWith(prefix)));
  const row=label=>all(h.tree(),'View').find(view=>[view.props.children].flat(Infinity).some(child=>child?.type==='Action'&&child.props.label===label));
  assert.match(textContent(section('Selected stops · ')),/Selected stops · 2/);
  assert.match(textContent(section('Skipped stops · ')),/Skipped stops · 1/);
  assert.match(textContent(row('Restore Middle')),/MiddleOriginal stop 2Skipped/);
  assert.match(textContent(row('Skip First')),/FirstOriginal stop 1Selected/);
  assert.match(textContent(h.tree()),/Restore adds a stop back in its original position/);
  h.click('Restore Middle');
  assert.match(textContent(section('Selected stops · ')),/Selected stops · 3/);
  assert.match(textContent(section('Skipped stops · ')),/Skipped stops · 0/);
  assert.match(textContent(row('Skip Middle')),/MiddleOriginal stop 2Restored · selected/);
  assert.deepEqual(all(h.tree(),'JourneyMap')[0].props.stops,stops);
  h.click('Undo');
  assert.ok(all(h.tree(),'Text').some(item=>textContent(item)==='Current selection: Skip'));
  assert.ok(all(h.tree(),'Text').some(item=>textContent(item)==='Middle'));
  h.click('Skip');h.click('Keep');h.click('Review selected stops');
  assert.deepEqual(all(h.tree(),'JourneyMap')[0].props.stops,[stops[0],stops[2]]);
  assert.match(textContent(row('Restore Middle')),/MiddleOriginal stop 2Skipped/);
  assert.equal(h.writes.length,0);
});
test('authentication return retains selections; repeated confirmation creates one editable draft',async()=>{
  const h=harness();h.render();h.click('Keep');h.click('Skip');h.click('Keep');h.click('Review selected stops');h.click('Confirm and create draft');await tick();
  assert.deepEqual(h.routes.at(-1),['push','/auth']);assert.equal(h.writes.length,0);
  h.auth({loading:false,session:{user:{id:userId}}});h.render();assert.deepEqual(all(h.tree(),'JourneyMap')[0].props.stops.map(v=>v.name),['First','Last']);
  const pending=deferred();h.pending(pending.promise);const button=all(h.tree(),'Action').find(v=>v.props.label==='Confirm and create draft');button.props.onPress();button.props.onPress();await tick();assert.equal(h.writes.length,1);
  pending.resolve();await tick();h.render();assert.deepEqual(h.writes[0],[sourceId,[stops[0].id,stops[2].id],draftId,userId]);assert.deepEqual(h.routes.at(-1),['replace',{pathname:'/create',params:{draft:draftId}}]);
  assert.equal(all(h.tree(),'Action').find(v=>v.props.label==='Confirm and create draft').props.disabled,true);
});
test('invalid selection and route failures disable creation while preserving restore controls',()=>{
  const h=harness();h.render();h.click('Skip');h.click('Skip');h.click('Skip');h.click('Review selected stops');
  assert.equal(all(h.tree(),'Action').find(v=>v.props.label==='Confirm and create draft').props.disabled,true);h.click('Restore First');
  h.route({error:'Route failed'});h.render();assert.equal(all(h.tree(),'Action').find(v=>v.props.label==='Confirm and create draft').props.disabled,true);assert.ok(all(h.tree(),'Action').some(v=>v.props.label==='Retry route preview'));assert.equal(h.writes.length,0);
});
function queryHarness() {
  let user=userId,error=null,detail={id:draftId,creator_id:userId,status:'draft',is_demo:false,title:'Draft',copied_from_journey_id:sourceId,stops:[stops[0],stops[2]]};const calls=[];
  const discovery={isJourneyId:value=>typeof value==='string'&&/^[0-9a-f-]{36}$/i.test(value),object:value=>value&&typeof value==='object'?value:null,safePhoto:()=>null,normalizeStops:value=>value};
  const realModel=load('src/lib/remix/model.ts',{'../discovery/model':discovery});
  const supabase={auth:{getUser:async()=>({data:{user:{id:user}},error:null})},rpc:(name,args)=>{calls.push([name,args]);return {abortSignal:async()=>({data:name==='copy_journey_selected'?draftId:detail,error:name==='copy_journey_selected'?error:null})};}};
  const query=load('src/lib/remix/queries.ts',{'../supabase/client':{supabase},'../discovery/model':discovery,'../discovery/queries':{},'./model':realModel});
  return {run:()=>query.remixSelectedJourney(sourceId,[stops[0].id,stops[2].id],draftId,userId),query,calls,user:value=>{user=value;},error:value=>{error=value;},detail:value=>{detail=value;}};
}
test('selected-copy RPC preserves attribution boundary and only submits selected IDs with stable draft ID',async()=>{
  const h=queryHarness();assert.equal(await h.run(),draftId);assert.deepEqual(h.calls[0],['copy_journey_selected',{source_id:sourceId,selected_stop_ids:[stops[0].id,stops[2].id],draft_id:draftId}]);
  assert.ok(h.calls.every(([name])=>name!=='copy_journey'&&name!=='save_journey'));
  h.calls.length=0;h.user('other');await assert.rejects(h.run);assert.equal(h.calls.length,0);
  await assert.rejects(()=>h.query.remixSelectedJourney(sourceId,[],draftId,userId));assert.equal(h.calls.length,0);
});
test('missing contract is safe and retryable; ambiguous writes and unverifiable drafts block retries',async()=>{
  for(const [code,uncertain] of [['PGRST202',false],['42883',false],['42501',false],['',true],['PGRST000',true]]) {
    const h=queryHarness();h.error({code});await assert.rejects(h.run,error=>error.uncertain===uncertain);
  }
  const h=queryHarness();h.detail(null);await assert.rejects(h.run,error=>error.uncertain&&error.copyId===draftId);
  const store=remix.createRemixStore();let calls=0;
  await store.run('same-selection',async()=>{calls++;throw new remix.RemixFailure('uncertain',true);});
  await store.run('same-selection',async()=>{calls++;return draftId;});assert.equal(calls,1);assert.equal(store.get('same-selection').blocked,true);
  const stable=remix.createRemixStore();await stable.run('same-selection',async()=>draftId);
  assert.equal(await stable.run('same-selection',async()=>{throw Error('Must not create on remount');}),draftId);
});
test('real loading hook cancels obsolete selected routes and ignores late results after review exits',async()=>{
  const slots=[];let cursor=0,effects=[];
  const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useCallback:fn=>fn,
    useEffect(fn,deps){const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i].deps[j])){slots[i]?.cleanup?.();slots[i]={deps};effects.push(()=>{slots[i].cleanup=fn();});}}};
  const {useLoad: loadHook}=load('src/hooks/use-load.ts',{react});
  const render=loader=>{cursor=0;effects=[];const result=loadHook(loader);effects.forEach(fn=>fn());return result;};
  const first=deferred(),second=deferred();let firstSignal,secondSignal;
  const oldLoader=signal=>{firstSignal=signal;return model.requestSelectedRoute(stops,'token',signal,()=>first.promise);};
  const newLoader=signal=>{secondSignal=signal;return model.requestSelectedRoute([stops[0],stops[2]],'token',signal,()=>second.promise);};
  assert.equal(render(oldLoader).loading,true);assert.equal(render(newLoader).data,null);assert.equal(firstSignal.aborted,true);
  first.resolve({geometry:{type:'LineString',coordinates:[[11,1],[12,2]]},distance:1,duration:1});await tick();assert.equal(render(newLoader).data,null);
  const selectedRoute={geometry:{type:'LineString',coordinates:[[11,1],[13,3]]},distance:2,duration:2};second.resolve(selectedRoute);await tick();assert.deepEqual(render(newLoader).data,selectedRoute);
  const exitLoader=()=>Promise.resolve(null);assert.equal(render(exitLoader).data,null);assert.equal(secondSignal.aborted,true);await tick();assert.equal(render(exitLoader).data,null);
  slots.forEach(slot=>slot?.cleanup?.());
});
