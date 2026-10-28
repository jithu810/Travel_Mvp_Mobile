import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
function load(path, modules) {
  const exports = {};
  new Function('require','exports',ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>{if(name in modules)return modules[name];throw Error(name);},exports);
  return exports;
}
const isJourneyId=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const eligibility=load('src/lib/journey/travel-preview.ts',{'../discovery/model':{isJourneyId}});
const trips=load('src/lib/journey/trip-session.ts',{'./travel-preview':eligibility});
const source={id:'10000000-0000-4000-8000-000000000000',title:'Original',stops:[3,1,2].map(sequence=>({id:'stop-'+sequence,name:'Stop '+sequence,sequence}))};
function registry() {
  let next=0,fail=false;const store=trips.createTripStore();
  return {...load('src/lib/journey/customized-travel.ts',{'./trip-session':{tripStore:store},'./travel-preview':eligibility,'../create/id':{randomUUID:()=>{if(fail)throw Error('Secure ID unavailable');return '20000000-0000-4000-8000-'+String(++next).padStart(12,'0');}}}),store,fail:()=>{fail=true;}};
}
test('local selection is cloned in original order and isolated from full journey and every other selection/session',()=>{
  const r=registry(),store=trips.createTripStore();
  const id=r.createCustomizedTravel(source,['stop-3','stop-1']);
  const custom=r.customizedTravel(id);
  assert.ok(eligibility.canOpenTravelMode(custom));assert.notEqual(id,source.id);
  assert.deepEqual(custom.stops.map(s=>s.id),['stop-1','stop-3']);assert.deepEqual(source.stops.map(s=>s.sequence),[3,1,2]);
  assert.notEqual(custom.stops[0],source.stops[1]);
  store.transition(source,'begin',store.get(source.id));assert.equal(store.get(id).status,'ready');
  store.transition(custom,'begin',store.get(id));assert.equal(store.get(id).plannedStops,2);
  const other=r.createCustomizedTravel(source,['stop-2']);assert.notEqual(other,id);assert.equal(store.get(other).status,'ready');
  assert.notEqual(r.createCustomizedTravel(source,['stop-3','stop-1']),id,'A fresh confirmation has a fresh local session');
  assert.equal(store.get(source.id).plannedStops,3);assert.equal(r.customizedTravel('missing'),null);
});
test('invalid/missing selections fail closed and secure ID failures never use original identity',()=>{
  const r=registry();
  for(const ids of [[],['missing'],['stop-1','stop-1'],[null],Array(51).fill('stop-1')])assert.throws(()=>r.createCustomizedTravel(source,ids));
  assert.throws(()=>r.createCustomizedTravel({...source,id:'invalid'},['stop-1']));
  r.fail();assert.throws(()=>r.createCustomizedTravel(source,['stop-1']),/Secure ID/);assert.equal(r.customizedTravel(source.id),null);
});

test('selected journey reuses Story presentation, only removes local stops and fails closed',()=>{
  const r=registry(),id=r.createCustomizedTravel(source,['stop-1','stop-3']),routes=[];
  const slots=[];let cursor=0,params={id},hasHistory=true,backs=0;
  const react={useRef:value=>{const i=cursor++;return slots[i]??={current:value};},useCallback:fn=>fn,useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>{slots[i]=v;}];}};
  const jsx=(type,props)=>({type,props});
  const all=(node,type)=>!node||typeof node!=='object'?[]:[...(node.type===type?[node]:[]),...[node.props?.children].flat(Infinity).flatMap(child=>all(child,type))];
  const Screen=load('src/app/customized/[id].tsx',{
    react,'react/jsx-runtime':{jsx,jsxs:jsx},'expo-router':{useLocalSearchParams:()=>params,useRouter:()=>({canGoBack:()=>hasHistory,back:()=>{backs++;},replace:route=>{routes.push(route);params=route.params;}}),useFocusEffect:()=>{}},
    'react-native':{View:'View'},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
    '@/components/discovery/ui':{Message:'Message',ScreenHeader:'ScreenHeader',ui:{}},
    '@/app/journey/[id]':{JourneyStoryContent:'JourneyStoryContent'},
    '@/hooks/use-trip-session':{useTripSnapshot:id=>r.store.get(id)},'@/lib/journey/customized-travel':r,
  }).default;
  const render=()=>{cursor=0;return Screen();};let tree=render();
  const story=()=>all(tree,'JourneyStoryContent')[0].props;
  assert.deepEqual(story().journey.stops.map(s=>s.id),['stop-1','stop-3']);
  story().temporary.onBack();assert.equal(backs,1,'Back preserves the retained Customize deck instead of replacing it');
  const stale=story().temporary.onRemove;
  story().temporary.onRemove('stop-1');tree=render();const editedId=params.id;
  assert.notEqual(editedId,id);assert.deepEqual(story().journey.stops.map(s=>s.id),['stop-3']);
  assert.equal(r.customizedTravel(id),story().journey);assert.equal(source.stops.length,3);
  stale('stop-3');assert.equal(routes.length,1,'Stale callback cannot edit superseded snapshot');
  story().temporary.onRemove('stop-3');tree=render();assert.match(story().temporary.error,/at least one/);
  const current=story().journey;r.store.transition(current,'begin',r.store.get(editedId));tree=render();
  assert.equal(story().temporary.editingBlocked,true);story().temporary.onRemove('stop-3');assert.equal(routes.length,1);
  hasHistory=false;story().temporary.onBack();tree=render();assert.match(story().temporary.error,/Finish/);assert.equal(routes.length,1);
  r.store.transition(current,'finish',r.store.get(editedId));tree=render();story().temporary.onBack();assert.deepEqual(routes.at(-1),{pathname:'/customize/[id]',params:{id:source.id}});
  params={id:'missing'};tree=render();assert.equal(all(tree,'JourneyStoryContent').length,0);assert.equal(all(tree,'Message')[0].props.title,'Selection unavailable');
  params={id:[id]};tree=render();assert.equal(all(tree,'JourneyStoryContent').length,0);
});

test('removal preserves order and snapshots, keeps aliases current and blocks active/paused/stale/last-stop edits',()=>{
  const r=registry(),id=r.createCustomizedTravel(source,['stop-1','stop-2','stop-3']),original=r.customizedTravel(id);
  assert.throws(()=>r.removeCustomizedStop(original,'missing'),/no longer/);
  const nextId=r.removeCustomizedStop(original,'stop-2'),next=r.customizedTravel(nextId);
  assert.equal(r.customizedTravel(id),next);assert.deepEqual(next.stops.map(s=>s.id),['stop-1','stop-3']);assert.equal(original.stops.length,3);
  assert.throws(()=>r.removeCustomizedStop(original,'stop-1'),/changed/);
  r.store.transition(next,'begin',r.store.get(nextId));assert.throws(()=>r.removeCustomizedStop(next,'stop-1'),/Finish/);
  r.store.transition(next,'pause',r.store.get(nextId));assert.throws(()=>r.removeCustomizedStop(next,'stop-1'),/Finish/);
  r.store.transition(next,'finish',r.store.get(nextId));const lastId=r.removeCustomizedStop(next,'stop-1');
  assert.equal(r.customizedTravel(id),r.customizedTravel(lastId));assert.equal(r.customizedSourceId(lastId),source.id);assert.equal(r.customizedSourceId(id),source.id);assert.throws(()=>r.removeCustomizedStop(r.customizedTravel(lastId),'stop-3'),/at least one/);
});

test('append validates searched places, preserves selection order, issues a new identity and blocks active/paused/stale edits',()=>{
  const r=registry(),id=r.createCustomizedTravel(source,['stop-1','stop-3']);const original=r.customizedTravel(id);
  for(const place of [null,{name:' ',latitude:1,longitude:2},{name:'X',latitude:NaN,longitude:2},{name:'X',latitude:1,longitude:181}])assert.throws(()=>r.appendCustomizedStop(original,place));
  const nextId=r.appendCustomizedStop(original,{name:' New place ',latitude:1,longitude:2});const next=r.customizedTravel(nextId);
  assert.notEqual(nextId,id);assert.equal(r.customizedTravel(id),next);
  assert.deepEqual(next.stops.slice(0,2).map(s=>s.id),['stop-1','stop-3']);assert.equal(next.stops[2].name,'New place');assert.ok(isJourneyId(next.stops[2].id));assert.equal(original.stops.length,2);
  assert.throws(()=>r.appendCustomizedStop(original,{name:'Stale',latitude:1,longitude:2}),/changed/);
  r.store.transition(next,'begin',r.store.get(nextId));
  assert.throws(()=>r.appendCustomizedStop(next,{name:'Blocked',latitude:1,longitude:2}),/Finish/);
  r.store.transition(next,'pause',r.store.get(nextId));assert.throws(()=>r.appendCustomizedStop(next,{name:'Blocked',latitude:1,longitude:2}),/Finish/);
});
