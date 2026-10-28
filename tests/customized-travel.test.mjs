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

test('local journey preview shares selected map/card state and opens Travel with the same token without GPS or public reads',()=>{
  const r=registry(),id=r.createCustomizedTravel(source,['stop-1','stop-3']),routes=[];
  const slots=[];let cursor=0,params={id};
  const react={useRef:value=>{const i=cursor++;return slots[i]??={current:value};},useCallback:fn=>fn,useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>{slots[i]=v;}];}};
  const jsx=(type,props)=>({type,props});
  const all=(node,type)=>!node||typeof node!=='object'?[]:[...(node.type===type?[node]:[]),...[node.props?.children].flat(Infinity).flatMap(child=>all(child,type))];
  const Screen=load('src/app/customized/[id].tsx',{
    react,'react/jsx-runtime':{jsx,jsxs:jsx},'expo-router':{useLocalSearchParams:()=>params,useRouter:()=>({push:route=>routes.push(route),replace:route=>{routes.push(route);params=route.params;}}),useFocusEffect:()=>{}},
    'react-native':{useWindowDimensions:()=>({height:700,width:400}),ScrollView:'ScrollView',Text:'Text',View:'View',StyleSheet:{create:v=>v}},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
    '@/components/discovery/ui':{Action:'Action',Message:'Message',ScreenHeader:'ScreenHeader',colors:{muted:'gray'},ui:{}},
    '@/components/journey/map/journey-map':{JourneyMap:'JourneyMap'},'@/components/journey/stop-timeline':{StopTimeline:'StopTimeline'},'@/components/journey/story-sheet':{StorySheet:'StorySheet'},
    '@/components/create/place-picker':{PlacePicker:'PlacePicker'},'@/hooks/use-trip-session':{useTripSnapshot:id=>r.store.get(id)},'@/components/journey/swipe-journey-start':{SwipeAction:'SwipeAction'},'@/lib/journey/customized-travel':r,
    '@/lib/journey/story-layout':{selectedStopId:(stops,requested)=>stops.find(s=>s.id===requested)?.id??stops[0]?.id??null},
  }).default;
  const render=()=>{cursor=0;return Screen();};let tree=render();
  const map=()=>all(tree,'JourneyMap')[0].props, cards=()=>all(tree,'StopTimeline')[0].props;
  assert.deepEqual(map().stops.map(s=>s.id),['stop-1','stop-3']);assert.equal(cards().stops,map().stops);
  cards().onSelect('stop-3');tree=render();assert.equal(map().selectedId,'stop-3');
  map().onSelect('missing');tree=render();assert.equal(cards().selectedId,'stop-3');
  cards().onDetails('stop-1');tree=render();assert.equal(all(tree,'StorySheet')[0].props.visible,true);assert.equal(all(tree,'SwipeAction')[0].props.active,false);
  all(tree,'StorySheet')[0].props.onClose();tree=render();all(tree,'SwipeAction')[0].props.onComplete();
  assert.deepEqual(routes,[{pathname:'/travel/[id]',params:{id,customized:'1'}}]);
  assert.equal(cards().stacked,true);
  all(tree,'Action').find(v=>v.props.label==='View full map').props.onPress();tree=render();assert.equal(all(tree,'JourneyMap').length,1,'Expanded map replaces compact map');
  all(tree,'StorySheet').find(v=>v.props.title==='Your route').props.onClose();tree=render();
  const openAdd=()=>{all(tree,'Action').find(v=>v.props.label==='Add stop').props.onPress();tree=render();};
  const picker=()=>all(tree,'PlacePicker')[0].props;
  openAdd();const cancelled=picker().onSelect;
  all(tree,'StorySheet').find(v=>v.props.title==='Add a stop').props.onClose();tree=render();
  cancelled({name:'Late result',latitude:4,longitude:5});assert.equal(routes.length,1,'Cancelled picker callback cannot append');
  openAdd();picker().onSelect({name:'Invalid',latitude:999,longitude:5});tree=render();assert.equal(routes.length,1);assert.ok(all(tree,'Text').some(v=>v.props.accessibilityRole==='alert'));
  const stale=picker().onSelect;
  picker().onSelect({name:'Extra',latitude:4,longitude:5});tree=render();
  const editedId=params.id;assert.notEqual(editedId,id);assert.equal(cards().stops.length,3);assert.equal(cards().stops.at(-1).name,'Extra');
  stale({name:'Stale',latitude:5,longitude:6});assert.equal(routes.length,2,'Successful append invalidates old picker callbacks');
  params={id};tree=render();assert.equal(cards().stops.length,3,'Original selection token follows its edited route');
  all(tree,'SwipeAction')[0].props.onComplete();assert.equal(routes.at(-1).params.id,editedId);
  const current=r.customizedTravel(id);r.store.transition(current,'begin',r.store.get(editedId));tree=render();
  assert.equal(all(tree,'Action').find(v=>v.props.label==='Add stop').props.disabled,true);
  all(tree,'Action').find(v=>v.props.label==='Add stop').props.onPress();tree=render();assert.equal(all(tree,'PlacePicker').length,0);
  params={id:'missing'};tree=render();assert.equal(all(tree,'JourneyMap').length,0);assert.equal(all(tree,'SwipeAction').length,0);assert.equal(all(tree,'Message')[0].props.title,'Selection unavailable');
  params={id:[id]};tree=render();assert.equal(all(tree,'SwipeAction').length,0);
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
