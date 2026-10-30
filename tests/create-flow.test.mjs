import { buddyGeometryStub, buddyMapPinsStub } from './helpers/buddy-geometry-stub.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
// Execute the actual dependency-free shared theme in the component harness.
const mobileTheme = {};
new Function('exports', ts.transpileModule(readFileSync('src/theme/mobile-theme.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mobileTheme);

function harness() {
  const slots = []; let cursor = 0, effects = [];
  const memo = (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v,j) => slots[i].deps[j] !== v)) slots[i] = { value: fn(), deps }; return slots[i].value; };
  const hooks = { memo: fn => fn, useMemo: memo, useCallback: (fn,deps) => memo(() => fn,deps),
    useState: value => { const i=cursor++; if (!(i in slots)) slots[i]=typeof value==='function'?value():value; return [slots[i], v => { slots[i]=typeof v==='function'?v(slots[i]):v; }]; },
    useRef: value => { const i=cursor++; return slots[i]??={current:value}; },
    useEffect: (fn,deps) => { const i=cursor++; if (!deps || !slots[i] || deps.some((v,j)=>slots[i].deps?.[j]!==v)) { slots[i]?.cleanup?.(); const slot={deps}; slots[i]=slot; effects.push(()=>{slot.cleanup=fn();}); } },
  };
  return { hooks, reset(){slots.forEach(slot=>slot?.cleanup?.());slots.length=0;}, render(fn, props) { cursor=0;effects=[];const result=fn(props);effects.forEach(fn=>fn());return result; } };
}
const native = Object.fromEntries(['Image','View','Text','TextInput','Pressable','ScrollView','KeyboardAvoidingView','ActivityIndicator','Modal'].map(name=>[name,name]));
native.useWindowDimensions=()=>({width:390,height:844,fontScale:1});
native.AppState={addEventListener(){return {remove(){}};}};native.Animated={View:'AnimatedView'};native.Keyboard={dismiss(){},addListener(){return {remove(){}};}};native.StyleSheet={create:value=>value};native.Platform={OS:'android'};
const ui = { colors: {}, ui: {}, Action:'Action', Message:'Message', ScreenHeader:'ScreenHeader' };
function load(file, modules, hooks=harness().hooks, timers=globalThis) {
  modules={'@/components/journey/story-sheet':{StorySheet:'StorySheet'},'@/components/journey/journey-action-icon':{JourneyActionIcon:'JourneyActionIcon'},'@/hooks/use-buddy-geometry':buddyGeometryStub,'@/components/art/journey-art':{StopArt:'StopArt'},'@/lib/art/journey-art':{artSeed:(_id,stops)=>'stop:'+stops[0]?.id},...modules};
  const exports={}; const jsx=(type,props)=>({type,props});
  const code=ts.transpileModule(readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','exports','setTimeout','clearTimeout',code)(name=>{ if(name==='@/components/first-outcome-hint')return {FirstOutcomeHint:'FirstOutcomeHint'};
    if(name==='@/lib/first-outcome')return load('src/lib/first-outcome.ts',{});
    if(name==='@/components/first-outcome-hint')return {FirstOutcomeHint:'FirstOutcomeHint'};
    if(name==='@/lib/first-outcome')return load('src/lib/first-outcome.ts',{});
    if (name === '@/theme/mobile-theme') return mobileTheme;
    if(name==='@/hooks/use-journey-buddy')return {useBuddyCelebration:()=>()=>{},useBuddyScreen(){},...modules[name]};
    if(name==='@/hooks/use-buddy-map-pins')return buddyMapPinsStub;
    if(name==='@/hooks/use-creation-recovery')return modules[name]||{useCreationRecovery:()=>()=>{}};
    if(name==='@/hooks/use-trip-recovery')return modules[name]||{useTripRecovery:()=>({checking:false,notice:null}),useUnfinishedTrip:()=>null};
    if(name==='@/lib/buddy/map-controls')return load('src/lib/buddy/map-controls.ts',{'../discovery/globe-style':load('src/lib/discovery/globe-style.ts',{})});
    if(name==='@/lib/buddy/model')return load('src/lib/buddy/model.ts',{});
    if(name==='@/components/buddy/buddy-space')return {BuddySpace:'BuddySpace'};
    if(name==='@/components/create/draft-route-illustration')return {DraftRouteIllustration:'DraftRouteIllustration'};
    if(name==='@/components/journey/swipe-journey-start')return {SwipeAction:'SwipeAction'};
    if(name==='@/components/create/memory-deck')return {MemoryDeck:'MemoryDeck'};
    if(name==='@/components/remix/source-attribution')return {SourceAttribution:'SourceAttribution'};
    if(name==='@/lib/remix/model')return load('src/lib/remix/model.ts',{'../discovery/model':load('src/lib/discovery/model.ts',{'../../types/journey':load('src/types/journey.ts',{})})});
    if(name==='@/components/create/editor-action-icon')return {EditorActionIcon:'EditorActionIcon'};
    if(name==='react-native-safe-area-context')return {useSafeAreaInsets:()=>({top:24,bottom:24,left:0,right:0}),...modules[name]};
    if(name==='@/lib/media/image-variants')return load('src/lib/media/image-variants.ts',{});
    if(name==='../discovery/thumbnail-photo')return {ThumbnailPhoto:'JourneyPhoto'};
    if(name==='@/hooks/use-thumbnail-source')return {useThumbnailSource:()=>({uri:null,onError(){}})};
    if(name==='../media/image-variants')return load('src/lib/media/image-variants.ts',{});
    if(name==='@/lib/create/thumbnail-device')return {prepareThumbnail:async()=>{throw Error('Thumbnail not enabled in this test');},removeThumbnail(){}};
    if(name==='@/components/discovery/compact-search-input')return load('src/components/discovery/compact-search-input.tsx',{},hooks);
    if(name==='@/lib/journey/nearby')return load('src/lib/journey/nearby.ts',{}); if(name.endsWith('/nearby-locations'))return {NearbyLocations:'NearbyLocations'}; if(name==='@/components/branded-loading')return {BrandedLoading:'BrandedLoading'};if(name==='@/components/buddy/buddy-intro')return {BuddyIntro:'BuddyIntro'};if(name==='@/lib/discovery/destination-camera')return destinationHelpers;if(name==='@/hooks/use-discovery-sheet')return modules[name] || {useDiscoverySheet:()=>({height:56,expanded:true,responders:{handle:{},content:{}},offset:{current:0},setScrollOffset(){},toggle(){}})};if(name==='@/components/create/create-journey-header')return {CreateJourneyHeader:'CreateJourneyHeader'};if(name==='expo-status-bar')return {StatusBar:'StatusBar'};if(name==='react')return hooks;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'Fragment'};
    if(name==='@/lib/journey/story-buddy-playback'){const map=load('src/lib/journey/map-data.ts',{});return load('src/lib/journey/story-buddy-playback.ts',{'./map-data':map,'../discovery/travel':load('src/lib/discovery/travel.ts',{'../journey/map-data':map})});}
    if(name==='../home-control-icon')return {HomeControlIcon:'HomeControlIcon'};if(name==='react-native')return {...native,...modules[name]};if(name==='expo-router')return {Stack:{Screen:'StackScreen'},...modules[name]};if(name in modules)return modules[name];throw Error(name);
  },exports,timers.setTimeout,timers.clearTimeout);return exports;
}
const destinationHelpers=load('src/lib/discovery/destination-camera.ts',{'../journey/map-data':{hasCoordinates:p=>Number.isFinite(p.longitude)&&Number.isFinite(p.latitude)&&Math.abs(p.longitude)<=180&&Math.abs(p.latitude)<=90}});
function all(tree,type) { if(!tree||typeof tree!=='object')return [];if(tree.type?.name==='CompactSearchInput')return all(tree.type(tree.props),type);return [...((tree.type===type || tree.type?.name===type)?[tree]:[]),...[tree.props?.children, ...(tree.type==='MemoryDeck'?[tree.props.leading,...(tree.props.stops.length?[tree.props.actions,...tree.props.stops.map((stop,index)=>tree.props.renderMemory(stop,index,350))]:[tree.props.emptyContent || tree.props.actions])]:[])].flat(Infinity).flatMap(child=>all(child,type))]; }
const id='11111111-1111-4111-8111-111111111111', uid='22222222-2222-4222-8222-222222222222', sid='33333333-3333-4333-8333-333333333333';
const model=load('src/lib/create/model.ts', {'../discovery/model':{isJourneyId:value=>/^[0-9a-f-]{36}$/i.test(value)}});
const photoSave=load('src/lib/create/photo-save.ts', {'./model':model,'../discovery/model':{isJourneyId:value=>/^[0-9a-f-]{36}$/i.test(value)}});
const memory=load('src/lib/create/memory.ts', {'./model':model});
const editor=load('src/lib/create/editor-model.ts', {'../discovery/model':{},'./model':model});
const place={name:'Varkala',label:'Varkala, Kerala',latitude:8.7,longitude:76.7,mapboxId:'place'};
function screenHarness(initial, photoState = {}, buddyEvents = [], recoveryStorage = null, guide = undefined) {
  photoState.candidates ??= {}; photoState.errors ??= {};
  photoState.candidates=Object.fromEntries(Object.entries(photoState.candidates).map(([key,p])=>[key,{width:800,height:600,size:1000,mime:'image/png',...p}]));
  const h=harness(), writes=[],routes=[],alerts=[],uploads=[],celebrations=[];let fail=false, uncertain=true, pending=null, prevented=null, canGoBack=true, focusCleanup=null; const dispatches=[];
  const modules={
    '@/hooks/use-journey-buddy':{useBuddyCelebration:()=> (animation,operation)=>celebrations.push({animation,operation}),useBuddyScreen:(state,actions)=>buddyEvents.push({state,actions})},
    '@/lib/create/photo-save':photoSave,
    '@/lib/create/photo-queries':{checkPhotoDraft:async()=>({ownerId:uid,stopIds:(writes.at(-1)?.stops||initial?.stops||[]).map(s=>s.id)}),uploadJourneyPhoto:async(name,photo)=>{uploads.push({name,photo});if(photoState.uploadFailure)throw new model.SaveFailure(photoState.uploadFailure);}},
    '@/hooks/use-editor-photos':{useEditorPhotos:()=>({data:{'journey-media/raw/stop.png':'https://signed.test/stop',...photoState.previews},error:null,refreshPreview(){}})},
    '@/components/create/photo-field':{PhotoField:'PhotoField'},
    '@/hooks/use-local-photos':{useLocalPhotos:()=>({candidates:photoState.candidates||{},errors:photoState.errors||{},busyKey:photoState.busyKey||null,acceptSaved:saved=>{photoState.candidates=Object.fromEntries(Object.entries(photoState.candidates).filter(([key,p])=>saved[key]?.uri!==p.uri));},isBusy:()=>!!photoState.busyKey,select:(key,source='gallery')=>{photoState.selected=key;photoState.source=source;},remove:key=>{delete photoState.candidates?.[key];}})},
    '@/lib/create/id':{randomUUID:()=>initial ? sid : id,idsAvailable:true},
    'expo-router/react-navigation':{usePreventRemove:(enabled,callback)=>{prevented={enabled,callback};}},
    '@/lib/discovery/model':{safePhoto:path=>path.startsWith('https:')?path:null},
    '@/lib/create/memory':memory,'@/components/create/memory-row':{MemoryRow:'MemoryRow'},'@/components/create/memory-editor-sheet':{MemoryEditorSheet:'MemoryEditorSheet'},
    'expo-router':{useLocalSearchParams:()=>({draft:initial?.id,guide}),useNavigation:()=>({dispatch:action=>dispatches.push(action)}),useRouter:()=>({canGoBack:()=>canGoBack,back:()=>routes.push('back'),push:route=>routes.push(route),replace:route=>routes.push(route)}),useFocusEffect:fn=>h.hooks.useEffect(()=>{const cleanup=fn();focusCleanup=cleanup;return cleanup;},[fn])},
    'react-native':{Alert:{alert:(...args)=>alerts.push(args)}},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
    '@/components/discovery/ui':ui,'@/components/create/place-picker':{PlacePicker:'PlacePicker',formStyles:{}},
    '@/components/create/quick-journey-setup':{QuickJourneySetup:'QuickJourneySetup'},'@/lib/create/editor-model':editor,
    '@/components/journey/map/journey-map':{JourneyMap:'JourneyMap'},'@/hooks/session-context':{useSessionState:()=>({loading:false,session:{user:{id:uid}}})},'@/hooks/use-load':{useLoad:()=>({data:{'journey-media/raw/stop.png':'https://signed.test/stop'},error:null})},'@/lib/remix/queries':{},
    '@/lib/create/model':model,'@/lib/create/queries':{saveNewJourney:async payload=>{writes.push(payload);if(pending)await pending;if(fail)throw new model.SaveFailure('This journey changed. Reload saved draft.',uncertain);return {id,status:payload.status,updated_at:'2026-10-14T12:00:00Z'};}},
  };
  // Optional: wire the real on-device recovery hook to a synthetic storage port.
  if(recoveryStorage){const recovery=load('src/lib/create/recovery.ts',{});modules['@/hooks/use-creation-recovery']=load('src/hooks/use-creation-recovery.ts',{...modules,'@/lib/create/recovery':recovery,'@/lib/create/recovery-store':{creationRecovery:recovery.createCreationRecovery(recoveryStorage)}},h.hooks,{setTimeout:()=>0,clearTimeout(){}});}
  const {NewJourneyEditor,RemixDraftMap,default:CreateScreen}=load('src/app/create.tsx',modules,h.hooks);
  let reloads=0;
  return {celebrations,blur:()=>focusCleanup?.(),mountChild:node=>{h.reset();return h.render(node.type,node.props);},renderRemixMap:props=>h.render(RemixDraftMap,props),renderEntry:()=>h.render(CreateScreen,{}),setCanGoBack:value=>{canGoBack=value;},render:(props={})=>h.render(NewJourneyEditor,{ownerId:uid,initial,onReload:()=>reloads++,...props}),writes,routes,alerts,uploads,setFailure:(value=true,ambiguous=true)=>{fail=value;uncertain=ambiguous;},setPending:value=>{pending=value;},prevented:()=>prevented,dispatches,reloads:()=>reloads};
}
test('actual editor quick-start saves privately with zero stops and routes to the saved editable journey',async()=>{
  const h=screenHarness();let tree=h.render();let setup=all(tree,'QuickJourneySetup')[0];
  assert.equal(setup.props.form.traveler,''); setup.props.onStart();await new Promise(setImmediate);assert.equal(h.writes.length,0);
  setup.props.onDestination(place);tree=h.render();setup=all(tree,'QuickJourneySetup')[0];assert.equal(setup.props.form.title,'Varkala journey');
  setup.props.onTitle('My coastal trip');tree=h.render();setup=all(tree,'QuickJourneySetup')[0];setup.props.onDestination({...place,name:'Kochi'});
  tree=h.render();setup=all(tree,'QuickJourneySetup')[0];assert.equal(setup.props.form.title,'My coastal trip');setup.props.onChange({traveler:'friends'});
  tree=h.render();setup=all(tree,'QuickJourneySetup')[0];setup.props.onStart();setup.props.onStart();await new Promise(setImmediate);
  assert.equal(h.writes.length,1);assert.equal(h.writes[0].status,'draft');assert.deepEqual(h.writes[0].stops,[]);
  assert.deepEqual(h.routes.at(-1),{pathname:'/create',params:{draft:id}});
  tree=h.render();assert.equal(all(tree,'QuickJourneySetup').length,0);assert.ok(all(tree,'Pressable').some(n=>n.props.accessibilityLabel==='Save Draft'));
});
test('existing editor saves changed stop metadata and version without changing media, IDs or entering Quick Start',async()=>{
  const initial={...model.newForm(id),title:'Saved',destination:place,destinationSlug:'keep-slug',traveler:'family',updatedAt:'2026-10-14T10:00:00.123456Z',coverPath:'journey-media/raw/cover.png',
    stops:[{id:sid,name:'Beach',description:'old',latitude:0,longitude:0,mapboxId:'original-id',photoPath:'journey-media/raw/stop.png',rating:'0',day:'1'}]};
  const h=screenHarness(initial);let tree=h.render();assert.equal(all(tree,'QuickJourneySetup').length,0);
  all(tree,'MemoryRow')[0].props.onEdit();tree=h.render();
  all(tree,'MemoryEditorSheet')[0].props.onChange({description:'New memory'});tree=h.render();
  all(tree,'MemoryEditorSheet')[0].props.onSave();await new Promise(setImmediate);tree=h.render();
  assert.equal(all(tree,'MemoryEditorSheet').length,0);
  assert.ok(all(tree,'Text').some(n=>n.props.children==='Memory saved privately.'));
  assert.equal(h.writes[0].updated_at,initial.updatedAt);assert.equal(h.writes[0].cover_image_path,initial.coverPath);
  assert.deepEqual(h.writes[0].stops[0],{id:sid,sequence:1,name:'Beach',description:'New memory',latitude:0,longitude:0,mapbox_place_id:'original-id',photo_path:'journey-media/raw/stop.png',rating:0,day_number:1});
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Save Draft').props.onPress();await new Promise(setImmediate);
  assert.equal(h.writes[1].updated_at,'2026-10-14T12:00:00Z');assert.equal(h.routes.length,0,'Saving a resumed draft stays in the hub');
});
test('conflict UI blocks writes and requires explicit confirmation before reloading; publication remains validated',async()=>{
  const initial={...model.newForm(id),title:'Saved',destination:place,traveler:'solo',updatedAt:'2026-10-14T10:00:00Z'};
  const h=screenHarness(initial);let tree=h.render();assert.equal(all(tree,'SwipeAction').length,0);await new Promise(setImmediate);
  assert.equal(h.writes.length,0);h.setFailure();tree=h.render();all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Save Draft').props.onPress();await new Promise(setImmediate);tree=h.render();
  assert.equal(all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Save Draft').props.disabled,true);
  all(tree,'Action').find(n=>n.props.label==='Reload saved draft').props.onPress();assert.equal(h.reloads(),0);
  h.alerts[0][2].find(button=>button.text==='Reload').onPress();assert.equal(h.reloads(),1);
});
test('Quick Start exposes explicit traveller choice, bounded duration and destination suggestions without photo controls',()=>{
  const {QuickJourneySetup}=load('src/components/create/quick-journey-setup.tsx',{'../discovery/ui':ui,'./place-picker':{PlacePicker:'PlacePicker',formStyles:{}}});
  const changes=[];let starts=0;const tree=QuickJourneySetup({form:model.newForm(id),disabled:false,onTitle(){},onDestination(){},onChange:value=>changes.push(value),onStart:()=>starts++});
  assert.equal(all(tree,'PlacePicker')[0].props.autoSuggest,true);assert.equal(all(tree,'Pressable').filter(n=>n.props.accessibilityState.selected).length,0);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='family').props.onPress();assert.deepEqual(changes.at(-1),{traveler:'family'});
  assert.equal(all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='One fewer day').props.disabled,true);
  all(tree,'Action').find(n=>n.props.label==='Create my journey').props.onPress();assert.equal(starts,1);
});
test('destination suggestions debounce, abort obsolete work and select only the latest result',async()=>{
  const h=harness(),timers=new Map();let serial=0;const requests=[],selected=[];
  const component=load('src/components/create/place-picker.tsx',{'../discovery/ui':ui,'@/lib/create/places':{searchPlaces:(query,_dest,_proximity,signal)=>new Promise(resolve=>requests.push({query,signal,resolve}))}},h.hooks,
    {setTimeout:fn=>{const id=++serial;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)});
  const props={label:'Destination',compact:true,destinationOnly:true,autoSuggest:true,disabled:false,onSelect:value=>selected.push(value)};
  let tree=h.render(component.PlacePicker,props);all(tree,'TextInput')[0].props.onChangeText('Var');tree=h.render(component.PlacePicker,props);
  assert.equal(requests.length,0);timers.forEach(fn=>fn());timers.clear();assert.equal(requests[0].query,'Var');
  all(tree,'TextInput')[0].props.onChangeText('Kochi');tree=h.render(component.PlacePicker,props);assert.equal(requests[0].signal.aborted,true);
  timers.forEach(fn=>fn());timers.clear();requests[0].resolve([{...place,name:'Old'}]);requests[1].resolve([{...place,name:'Kochi',label:'Kochi'}]);await new Promise(setImmediate);
  tree=h.render(component.PlacePicker,props);assert.equal(all(tree,'Pressable').some(n=>n.props.accessibilityLabel==='Select Old'),false);
  assert.equal(all(tree,'Modal').length,1);assert.equal(all(tree,'ScrollView')[0].props.accessibilityLabel,'Destination search results');
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Select Kochi').props.onPress();assert.equal(selected[0].name,'Kochi');tree=h.render(component.PlacePicker,props);assert.equal(all(tree,'Modal').length,0);
});
const privateForm=()=>({...model.newForm(id),title:'Coast',destination:place,traveler:'solo',days:'3',updatedAt:'2026-10-14T10:00:00Z'});
const memoryRow=(id,name,extra={})=>({...memory.emptyMemory(id),name,...extra});
const tick=()=>new Promise(setImmediate);

test('Buddy Jump is emitted only after confirmed memory success, never Save tap, failed save, stale focus or cancellation', async () => {
  for (const outcome of ['saved', 'failed', 'blurred', 'cancelled']) {
    const h = screenHarness({ ...privateForm(), stops: [memoryRow(sid, 'Beach')] });
    let tree = h.render(); all(tree, 'MemoryRow')[0].props.onEdit(); tree = h.render();
    all(tree, 'MemoryEditorSheet')[0].props.onChange({ description: 'A new memory' }); tree = h.render();
    if (outcome === 'cancelled') {
      all(tree, 'MemoryEditorSheet')[0].props.onClose();
      h.alerts.at(-1)[2].find(button => button.text === 'Discard').onPress();
      assert.equal(h.writes.length, 0); assert.deepEqual(h.celebrations, []); continue;
    }
    let finish; h.setPending(new Promise(resolve => { finish = resolve; }));
    if (outcome === 'failed') h.setFailure(true, false);
    all(tree, 'MemoryEditorSheet')[0].props.onSave(); all(tree, 'MemoryEditorSheet')[0].props.onSave();
    assert.deepEqual(h.celebrations, [], 'Save tap and pending request are not success');
    if (outcome === 'blurred') h.blur();
    finish(); await tick();
    assert.equal(h.writes.length, 1); assert.equal(h.celebrations.length, outcome === 'saved' ? 1 : 0);
    if (outcome === 'saved') { assert.equal(h.celebrations[0].animation, 'jump'); assert.equal(h.celebrations[0].operation.kind, 'saved'); }
  }
  const h = screenHarness({ ...privateForm(), stops: [memoryRow(sid, 'Beach')] });
  const tree = h.render(); all(tree, 'Pressable').find(node => node.props.accessibilityLabel === 'Save Draft').props.onPress(); await tick();
  assert.deepEqual(h.celebrations, [], 'Ordinary draft save does not celebrate a memory');
});
test('empty hub has one Add memory action and an honest map placeholder, and saves an unlocated named memory only on confirmation',async()=>{
  const h=screenHarness(privateForm());let tree=h.render();
  assert.equal(all(tree,'DraftMap').length,1);assert.equal(all(tree,'MemoryRow').length,0);
  assert.equal(all(tree,'Pressable').filter(n=>n.props.accessibilityLabel==='Add your first stop').length,1);
  assert.equal(all(tree,'SwipeAction').length,0);
  all(tree,'Pressable').find(n=>['Add memory','Add your first stop'].includes(n.props.accessibilityLabel)).props.onPress();tree=h.render();
  let sheet=all(tree,'MemoryEditorSheet')[0];sheet.props.onSave();await tick();tree=h.render();
  assert.equal(h.writes.length,0);assert.ok(all(tree,'MemoryEditorSheet')[0].props.error);
  all(tree,'MemoryEditorSheet')[0].props.onChange({name:'Sunset',description:'Golden light',day:'2',rating:'0'});tree=h.render();
  let finish;h.setPending(new Promise(resolve=>{finish=resolve;}));sheet=all(tree,'MemoryEditorSheet')[0];sheet.props.onSave();sheet.props.onSave();tree=h.render();
  assert.equal(h.writes.length,1);assert.equal(all(tree,'MemoryEditorSheet')[0].props.busy,true);
  assert.equal(all(tree,'MemoryRow').length,0,'Not shown as saved before response');
  finish();await tick();tree=h.render();assert.equal(all(tree,'MemoryEditorSheet').length,0);
  const row=all(tree,'MemoryRow')[0];assert.equal(row.props.stop.name,'Sunset');assert.equal(row.props.stop.latitude,null);
  assert.equal(h.writes[0].stops[0].rating,0);assert.equal(h.writes[0].stops[0].day_number,2);
  assert.equal(!all(tree,'SwipeAction')[0].props.active,true);
  assert.ok(all(tree,'Text').some(n=>String(n.props.children).includes('Add a location to memory 1 (Sunset)')));
});
test('located memory saves full journey snapshot including unsaved settings and inherited media',async()=>{
  const h=screenHarness({...privateForm(),coverPath:'journey-media/raw/cover.png',stops:[memoryRow(uid,'Existing',{photoPath:'journey-media/raw/stop.png',description:'Keep',day:'1',rating:'4.5',latitude:0,longitude:0,mapboxId:'original'})]});
  let tree=h.render();assert.equal(all(tree,'DraftMap').length,1);assert.equal(all(tree,'MemoryRow')[0].props.photo,'https://signed.test/stop');
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Journey settings').props.onPress();tree=h.render();
  all(tree,'QuickJourneySetup')[0].props.onTitle('New title');tree=h.render();all(tree,'Modal')[0].props.onRequestClose();tree=h.render();
  all(tree,'Pressable').find(n=>['Add memory','Add your first stop'].includes(n.props.accessibilityLabel)).props.onPress();tree=h.render();
  all(tree,'MemoryEditorSheet')[0].props.onChange({name:'Cliff',latitude:8.7,longitude:76.7,mapboxId:'cliff'});tree=h.render();
  all(tree,'MemoryEditorSheet')[0].props.onSave();await tick();tree=h.render();
  assert.equal(h.writes[0].title,'New title');assert.equal(h.writes[0].cover_image_path,'journey-media/raw/cover.png');
  assert.deepEqual(h.writes[0].stops.map(s=>s.id),[uid,sid]);assert.equal(h.writes[0].stops[0].description,'Keep');
  assert.equal(h.writes[0].stops[0].photo_path,'journey-media/raw/stop.png');assert.equal(all(tree,'MemoryRow').length,2);
  assert.equal(!all(tree,'SwipeAction')[0].props.active,false);
});
test('reorder and confirmed removal preserve other metadata and need explicit private save',async()=>{
  const h=screenHarness({...privateForm(),stops:[memoryRow(sid,'One',{description:'Keep',photoPath:'journey-media/raw/stop.png'}),memoryRow(uid,'Two',{rating:'0'})]});let tree=h.render();
  all(tree,'MemoryRow')[1].props.onMove(-1);tree=h.render();assert.equal(all(tree,'MemoryRow')[0].props.stop.id,uid);assert.equal(h.writes.length,0);
  all(tree,'MemoryRow')[0].props.onRemove();assert.equal(h.alerts.length,1);tree=h.render();assert.equal(all(tree,'MemoryRow').length,2);
  h.alerts[0][2].find(b=>b.text==='Remove').onPress();tree=h.render();assert.equal(all(tree,'MemoryRow').length,1);assert.equal(h.writes.length,0);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Save Draft').props.onPress();await tick();assert.equal(h.writes[0].stops[0].id,sid);assert.equal(h.writes[0].stops[0].sequence,1);assert.equal(h.writes[0].stops[0].photo_path,'journey-media/raw/stop.png');
});
test('memory close and navigation warn for buffered edits; stale discard alerts cannot erase newer input',()=>{
  const h=screenHarness(privateForm());let tree=h.render();all(tree,'Pressable').find(n=>['Add memory','Add your first stop'].includes(n.props.accessibilityLabel)).props.onPress();tree=h.render();
  all(tree,'MemoryEditorSheet')[0].props.onChange({name:'First'});tree=h.render();all(tree,'MemoryEditorSheet')[0].props.onClose();
  const oldDiscard=h.alerts[0][2].find(b=>b.text==='Discard');all(tree,'MemoryEditorSheet')[0].props.onChange({name:'Newer'});tree=h.render();oldDiscard.onPress();tree=h.render();
  assert.equal(all(tree,'MemoryEditorSheet')[0].props.value.name,'Newer');
  const action={type:'GO_BACK'};assert.equal(h.prevented().enabled,true);h.prevented().callback({data:{action}});assert.equal(h.dispatches.length,0);
  h.alerts.at(-1)[2].find(b=>b.text==='Discard').onPress();assert.deepEqual(h.dispatches,[action]);
  all(tree,'MemoryEditorSheet')[0].props.onClose();h.alerts.at(-1)[2].find(b=>b.text==='Discard').onPress();tree=h.render();assert.equal(all(tree,'MemoryEditorSheet').length,0);assert.equal(h.writes.length,0);
});
test('ordinary memory failure retains buffer for retry; conflict blocks repeats and offers confirmed reload',async()=>{
  const h=screenHarness({...privateForm(),stops:[memoryRow(sid,'Saved')]});let tree=h.render();all(tree,'MemoryRow')[0].props.onEdit();tree=h.render();
  all(tree,'MemoryEditorSheet')[0].props.onChange({description:'Unsaved note'});tree=h.render();h.setFailure(true,false);
  all(tree,'MemoryEditorSheet')[0].props.onSave();await tick();tree=h.render();let sheet=all(tree,'MemoryEditorSheet')[0];
  assert.equal(sheet.props.value.description,'Unsaved note');assert.equal(sheet.props.blocked,false);assert.ok(sheet.props.error);assert.equal(all(tree,'MemoryRow')[0].props.stop.description,'');
  h.setFailure(true,true);sheet.props.onSave();await tick();tree=h.render();sheet=all(tree,'MemoryEditorSheet')[0];assert.equal(sheet.props.blocked,true);
  sheet.props.onSave();await tick();assert.equal(h.writes.length,2);sheet.props.onReload();assert.equal(h.reloads(),0);
  h.alerts.at(-1)[2].find(b=>b.text==='Reload').onPress();assert.equal(h.reloads(),1);
});
test('memory sheet reuses place selection, exposes notes/details progressively, and keeps Save outside its scroll with safe-area keyboard handling',()=>{
  const h=harness(),patches=[];const {MemoryEditorSheet}=load('src/components/create/memory-editor-sheet.tsx',{'@/hooks/use-memory-location':{useMemoryLocation:()=>({busy:false,error:null,start(){},cancel(){},isBusy:()=>false})},'../discovery/ui':ui,'./place-picker':{PlacePicker:'PlacePicker',formStyles:{}},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'}},h.hooks);
  let closes=0,saves=0;let props={value:memory.emptyMemory(sid),isNew:true,proximity:place,busy:false,blocked:false,error:null,onChange:p=>patches.push(p),onClose:()=>closes++,onSave:()=>saves++};
  let tree=h.render(MemoryEditorSheet,props);assert.equal(all(tree,'TextInput').length,0);assert.equal(all(tree,'PlacePicker')[0].props.autoSuggest,true);
  assert.equal(all(tree,'SafeAreaView').length,1);assert.equal(all(tree,'KeyboardAvoidingView')[0].props.behavior,'padding');assert.equal(all(all(tree,'ScrollView')[0],'Action').length,0);
  all(tree,'PlacePicker')[0].props.onSelect(place);assert.deepEqual(patches.at(-1),{name:place.name,latitude:place.latitude,longitude:place.longitude,mapboxId:place.mapboxId});
  props={...props,value:{...props.value,...patches.at(-1)}};tree=h.render(MemoryEditorSheet,props);assert.equal(all(tree,'TextInput').length,1);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Add note').props.onPress();tree=h.render(MemoryEditorSheet,props);all(tree,'TextInput').find(n=>n.props.accessibilityLabel==='Memory note').props.onChangeText('A moment');assert.equal(patches.at(-1).description,'A moment');
  assert.equal(all(tree,'TextInput').some(n=>n.props.accessibilityLabel==='Memory day'),false);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='More memory details').props.onPress();tree=h.render(MemoryEditorSheet,props);assert.equal(all(tree,'TextInput').length,4);
  all(tree,'TextInput').find(n=>n.props.accessibilityLabel==='Memory day').props.onChangeText('2');assert.deepEqual(patches.at(-1),{day:'2'});
  all(tree,'TextInput').find(n=>n.props.accessibilityLabel==='Memory rating').props.onChangeText('0');assert.deepEqual(patches.at(-1),{rating:'0'});
  all(tree,'Action').find(n=>n.props.label==='Save memory').props.onPress();all(tree,'Modal')[0].props.onRequestClose();assert.equal(saves,1);assert.equal(closes,1);
  tree=h.render(MemoryEditorSheet,{...props,busy:true});assert.equal(all(tree,'Action')[0].props.disabled,true);assert.equal(all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Close memory editor').props.disabled,true);
});
test('compact memory row has discoverable editing and accessible bounded reorder/removal controls with existing photos',()=>{
  const {MemoryRow}=load('src/components/create/memory-row.tsx',{'../discovery/ui':ui,'../discovery/journey-photo':{JourneyPhoto:'JourneyPhoto'}});let edits=0,removes=0;const moves=[];
  const tree=MemoryRow({stop:memoryRow(sid,'Beach',{description:'A note'}),index:0,total:2,photo:'https://signed.test/photo',disabled:false,onEdit:()=>edits++,onMove:n=>moves.push(n),onRemove:()=>removes++});
  assert.equal(all(tree,'JourneyPhoto')[0].props.uri,'https://signed.test/photo');const controls=all(tree,'Pressable');assert.equal(controls[1].props.disabled,true);
  controls[0].props.onPress();controls[2].props.onPress();controls[3].props.onPress();assert.equal(edits,1);assert.equal(removes,1);assert.deepEqual(moves,[1]);assert.ok(controls.every(c=>c.props.style.minHeight>=44));
});

test('explicit editor save uploads cover/memory candidates and persists raw paths while preserving other metadata',async()=>{
  const original={...privateForm(),coverPath:'journey-media/raw/cover.png',stops:[memoryRow(sid,'Saved',{photoPath:'journey-media/raw/stop.png',description:'Keep',rating:'0',latitude:0,longitude:0})]};
  const photoState={candidates:{cover:{uri:'file:///cover-local.png'},[sid]:{uri:'file:///stop-local.png'}}};
  const h=screenHarness(original,photoState);let tree=h.render();all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Edit cover photo').props.onPress();tree=h.render();const cover=all(tree,'PhotoField')[0];assert.equal(cover.props.candidate.uri,'file:///cover-local.png');assert.equal(h.writes.length,0);
  assert.equal(all(tree,'MemoryRow')[0].props.localPhoto,true);assert.equal(all(tree,'MemoryRow')[0].props.photo,'file:///stop-local.png');
  all(tree,'MemoryRow')[0].props.onEdit();tree=h.render();let sheet=all(tree,'MemoryEditorSheet')[0];assert.equal(sheet.props.photoControl.props.candidate.uri,'file:///stop-local.png');
  sheet.props.onSave();await tick();tree=h.render();assert.equal(h.uploads.length,2);assert.equal(h.writes[0].cover_image_path,'journey-media/'+h.uploads[0].name);assert.equal(h.writes[0].stops[0].photo_path,'journey-media/'+h.uploads[1].name);assert.equal(h.writes[0].stops[0].description,'Keep');assert.equal(h.writes[0].stops[0].rating,0);
  assert.equal(JSON.stringify(h.writes).includes('file:///'),false);assert.ok(all(tree,'Text').some(n=>String(n.props.children).includes('Journey and photos saved privately')));assert.equal(h.prevented().enabled,false);
  assert.equal(Object.keys(photoState.candidates).length,0);all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Save Draft').props.onPress();await tick();assert.equal(h.uploads.length,2,'Unchanged photos do not upload again');
  all(tree,'PhotoField')[0].props.onRemove();tree=h.render();assert.equal(all(tree,'PhotoField')[0].props.candidate,undefined);
});
test('photo preparation blocks save and close; discarding an unsaved memory photo leaves its saved path intact',async()=>{
  const photoState={busyKey:'cover',candidates:{}};const original={...privateForm(),stops:[memoryRow(sid,'One',{photoPath:'journey-media/raw/stop.png'})]};
  const h=screenHarness(original,photoState);let tree=h.render();all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Save Draft').props.onPress();await tick();assert.equal(h.writes.length,0);
  photoState.busyKey=null;photoState.candidates[sid]={uri:'file:///local.png'};tree=h.render();all(tree,'MemoryRow')[0].props.onEdit();tree=h.render();all(tree,'MemoryEditorSheet')[0].props.onClose();
  assert.equal(h.alerts.at(-1)[0],'Discard memory changes?');h.alerts.at(-1)[2].find(b=>b.text==='Discard').onPress();tree=h.render();assert.equal(all(tree,'MemoryRow')[0].props.stop.photoPath,original.stops[0].photoPath);assert.equal(photoState.candidates[sid],undefined);assert.equal(h.writes.length,0);
});
test('photo control labels local previews Not saved, has bounded contain preview and only removes local candidates',()=>{
  const {PhotoField}=load('src/components/create/photo-field.tsx',{'../discovery/ui':ui});let selected=0,removed=0,taken=0;
  const props={label:'Cover photo',savedUri:'https://saved.test/photo',busy:false,disabled:false,onSelect:()=>selected++,onRemove:()=>removed++};
  props.onTakePhoto=()=>taken++;
  let tree=PhotoField(props);assert.equal(all(tree,'Image')[0].props.source.uri,props.savedUri);assert.equal(all(tree,'Pressable').length,2);
  tree=PhotoField({...props,candidate:{uri:'file:///local.png'}});assert.equal(all(tree,'Image')[0].props.source.uri,'file:///local.png');assert.equal(all(tree,'Image')[0].props.resizeMode,'contain');assert.ok(all(tree,'Text').some(n=>n.props.children==='Not saved'));
  all(tree,'Pressable')[0].props.onPress();all(tree,'Pressable')[1].props.onPress();all(tree,'Pressable')[2].props.onPress();assert.equal(selected,1);assert.equal(taken,1);assert.equal(removed,1);assert.ok(all(tree,'Pressable').every(n=>n.props.style.minHeight>=44));
});

test('saved cover removal stages null through explicit save and never triggers an upload',async()=>{
  const h=screenHarness({...privateForm(),coverPath:'journey-media/raw/cover.png'});let tree=h.render();all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Edit cover photo').props.onPress();tree=h.render();const cover=all(tree,'PhotoField')[0];assert.equal(cover.props.hasSavedPhoto,true);cover.props.onRemoveSaved();tree=h.render();assert.equal(h.writes.length,0);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Save Draft').props.onPress();await tick();assert.equal(h.writes[0].cover_image_path,null);assert.equal(h.uploads.length,0);
});

test('new memory upload failure keeps the saved checkpoint editable and retries without losing version or selection',async()=>{
 const photoState={candidates:{},uploadFailure:'Upload rejected'};const h=screenHarness(privateForm(),photoState);let tree=h.render();all(tree,'Pressable').find(n=>['Add memory','Add your first stop'].includes(n.props.accessibilityLabel)).props.onPress();tree=h.render();all(tree,'MemoryEditorSheet')[0].props.onChange({name:'Sunset'});
 photoState.candidates={ [sid]:{uri:'file:///memory.png',width:800,height:600,size:1000,mime:'image/png'} };tree=h.render();all(tree,'MemoryEditorSheet')[0].props.onSave();await tick();tree=h.render();
 assert.equal(h.writes.length,1);assert.equal(h.writes[0].stops[0].photo_path,null);assert.equal(all(tree,'MemoryEditorSheet')[0].props.isNew,false);assert.equal(all(tree,'MemoryEditorSheet')[0].props.value.name,'Sunset');assert.ok(photoState.candidates[sid]);
 photoState.uploadFailure=null;all(tree,'MemoryEditorSheet')[0].props.onSave();await tick();tree=h.render();assert.equal(h.writes.length,2);assert.equal(h.writes[1].updated_at,'2026-10-14T12:00:00Z');assert.equal(h.uploads[0].name,h.uploads[1].name);assert.equal(all(tree,'MemoryEditorSheet').length,0);assert.equal(all(tree,'MemoryRow')[0].props.stop.name,'Sunset');
});
test('signed preview hook renews on expiry and foreground, throttles image-error retries and scopes loaders to the owner/paths',async()=>{
 const h=harness(),timers=new Map(),listeners=[],loads=[];let serial=0,refreshes=0,now=Date.now();const dateNow=Date.now;Date.now=()=>now;
 const data={'journey-media/raw/cover.png':'https://signed.test/cover'};const result={data,loading:false,error:null,refresh:()=>refreshes++};let focusCallback;
 try {
  const {useEditorPhotos}=load('src/hooks/use-editor-photos.ts',{'./use-load':{useLoad:loader=>{loads.push(loader);return result;}},'@/lib/create/queries':{loadEditorPhotos:async(paths,owner)=>({paths,owner})},'expo-router':{useFocusEffect:fn=>{focusCallback=fn;}},'react-native':{AppState:{addEventListener:(_type,callback)=>{const listener={callback,removed:false};listeners.push(listener);return {remove:()=>{listener.removed=true;}};}}}},h.hooks,{setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:key=>timers.delete(key)});
  const render=(paths='["journey-media/raw/cover.png"]',owner=uid)=>h.render(()=>useEditorPhotos(paths,owner),{});
  let photos=render();assert.equal(refreshes,0);assert.equal(timers.size,1);[...timers.values()][0]();assert.equal(refreshes,1);photos.refreshPreview();assert.equal(refreshes,1);
  now+=15001;photos.refreshPreview();assert.equal(refreshes,2);now+=56*60*1000;listeners[0].callback('active');assert.equal(refreshes,3);focusCallback();assert.equal(refreshes,3);
  assert.deepEqual(await loads[0](new AbortController().signal),{paths:['journey-media/raw/cover.png'],owner:uid});render('["journey-media/another/cover.png"]',sid);assert.equal(listeners[0].removed,true);assert.deepEqual(await loads.at(-1)(new AbortController().signal),{paths:['journey-media/another/cover.png'],owner:sid});
 } finally {Date.now=dateNow;}
});

test('reviewed GPS coordinates do not write or upload until Save memory; full metadata and conflict protection survive',async()=>{
  const saved=memoryRow(sid,'Keep name',{description:'Keep note',day:'2',rating:'0',photoPath:'journey-media/raw/stop.png',latitude:8,longitude:76,mapboxId:'old'});
  const h=screenHarness({...privateForm(),coverPath:'journey-media/raw/cover.png',stops:[saved,memoryRow(uid,'Other')]});
  let tree=h.render();all(tree,'MemoryRow')[0].props.onEdit();tree=h.render();
  all(tree,'MemoryEditorSheet')[0].props.onChange({latitude:0,longitude:0,mapboxId:null});tree=h.render();
  assert.equal(h.writes.length,0);assert.equal(h.uploads.length,0);assert.deepEqual(all(tree,'MemoryEditorSheet')[0].props.value,{...saved,latitude:0,longitude:0,mapboxId:null});
  all(tree,'MemoryEditorSheet')[0].props.onSave();await tick();assert.equal(h.writes.length,1);assert.equal(h.uploads.length,0);
  const payload=h.writes[0];assert.equal(payload.updated_at,privateForm().updatedAt);assert.equal(payload.cover_image_path,'journey-media/raw/cover.png');
  assert.deepEqual(payload.stops[0],{id:sid,sequence:1,name:'Keep name',description:'Keep note',latitude:0,longitude:0,mapbox_place_id:null,photo_path:saved.photoPath,rating:0,day_number:2});
  assert.equal(payload.stops[1].id,uid);assert.equal(payload.stops[1].sequence,2);
  tree=h.render();all(tree,'MemoryRow')[0].props.onEdit();tree=h.render();all(tree,'MemoryEditorSheet')[0].props.onChange({latitude:1});tree=h.render();h.setFailure(true,true);
  all(tree,'MemoryEditorSheet')[0].props.onSave();await tick();tree=h.render();assert.equal(all(tree,'MemoryEditorSheet')[0].props.blocked,true);assert.equal(all(tree,'MemoryEditorSheet')[0].props.value.latitude,1);
  all(tree,'MemoryEditorSheet')[0].props.onSave();await tick();assert.equal(h.writes.length,2);
});
test('new GPS memory still requires a name before explicit save',async()=>{
  const h=screenHarness(privateForm());let tree=h.render();all(tree,'Pressable').find(n=>['Add memory','Add your first stop'].includes(n.props.accessibilityLabel)).props.onPress();tree=h.render();
  all(tree,'MemoryEditorSheet')[0].props.onChange({latitude:0,longitude:0,mapboxId:null});tree=h.render();all(tree,'MemoryEditorSheet')[0].props.onSave();await tick();tree=h.render();
  assert.equal(h.writes.length,0);assert.ok(all(tree,'MemoryEditorSheet')[0].props.error);all(tree,'MemoryEditorSheet')[0].props.onChange({name:'Here'});tree=h.render();all(tree,'MemoryEditorSheet')[0].props.onSave();await tick();assert.equal(h.writes[0].stops[0].latitude,0);
});
test('actual memory sheet capture reveals the name, keeps search independent, locks Save and cancels on close',()=>{
  const h=harness();let busy=false,reveal,cancelled=0,patches=[],saves=0,closes=0;
  const modules={'@/hooks/use-memory-location':{useMemoryLocation:(_value,_disabled,change,open)=>{reveal=()=>{change({latitude:0,longitude:0,mapboxId:null});open();};return {busy,error:busy?null:'Retry or search.',start:()=>{busy=true;},cancel:()=>{busy=false;cancelled++;},isBusy:()=>busy};}},'../discovery/ui':ui,'./place-picker':{PlacePicker:'PlacePicker',formStyles:{}},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'}};
  const {MemoryEditorSheet}=load('src/components/create/memory-editor-sheet.tsx',modules,h.hooks);
  const props={value:memory.emptyMemory(sid),isNew:true,proximity:null,busy:false,blocked:false,error:null,onChange:p=>patches.push(p),onSave:()=>saves++,onClose:()=>closes++};
  let tree=h.render(MemoryEditorSheet,props);const staleSave=all(tree,'Action').find(n=>n.props.label==='Save memory');
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Use current location').props.onPress();staleSave.props.onPress();assert.equal(saves,0);
  tree=h.render(MemoryEditorSheet,props);assert.equal(all(tree,'Action').find(n=>n.props.label==='Save memory').props.disabled,true);
  busy=false;reveal();tree=h.render(MemoryEditorSheet,{...props,value:{...props.value,...patches[0]}});assert.equal(all(tree,'TextInput').find(n=>n.props.accessibilityLabel==='Memory name').props.value,'');
  assert.equal(saves,0);assert.ok(all(tree,'Text').some(n=>String(n.props.children).includes('0.0000')));
  all(tree,'Modal')[0].props.onRequestClose();assert.equal(cancelled,1);assert.equal(closes,1);
});

test('cover and memory Take Photo actions select camera; only explicit save uploads the prepared candidate',async()=>{
 const state={};const saved=memoryRow(sid,'Keep name',{description:'Keep note',day:'2',rating:'0',photoPath:'journey-media/raw/stop.png',latitude:0,longitude:0});
 const h=screenHarness({...privateForm(),coverPath:'journey-media/raw/cover.png',stops:[saved]},state);let tree=h.render();
 all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Edit cover photo').props.onPress();tree=h.render();let cover=all(tree,'PhotoField')[0];cover.props.onTakePhoto();assert.equal(state.selected,'cover');assert.equal(state.source,'camera');assert.equal(h.writes.length,0);assert.equal(h.uploads.length,0);
 cover.props.onSelect();assert.equal(state.source,'gallery');
 all(tree,'MemoryRow')[0].props.onEdit();tree=h.render();const sheet=all(tree,'MemoryEditorSheet')[0];sheet.props.photoControl.props.onTakePhoto();assert.equal(state.selected,sid);assert.equal(state.source,'camera');assert.equal(h.uploads.length,0);
 state.candidates[sid]={uri:'file:///prepared-camera.jpg',width:800,height:600,size:1000,mime:'image/jpeg'};tree=h.render();assert.equal(all(tree,'MemoryEditorSheet')[0].props.photoControl.props.candidate.uri,'file:///prepared-camera.jpg');assert.equal(h.writes.length,0);
 all(tree,'MemoryEditorSheet')[0].props.onSave();await tick();assert.equal(h.uploads.length,1);assert.equal(h.writes.length,1);assert.equal(h.writes[0].cover_image_path,'journey-media/raw/cover.png');
 assert.equal(h.writes[0].stops[0].name,saved.name);assert.equal(h.writes[0].stops[0].description,saved.description);assert.equal(h.writes[0].stops[0].day_number,2);assert.equal(h.writes[0].stops[0].rating,0);assert.match(h.writes[0].stops[0].photo_path,/^journey-media\//);assert.equal(state.candidates[sid],undefined);
});
test('both photo actions are disabled while selecting or saving and previews stay Not saved',()=>{
 const {PhotoField}=load('src/components/create/photo-field.tsx',{'../discovery/ui':ui});
 const tree=PhotoField({label:'Cover photo',candidate:{uri:'file:///camera'},busy:true,disabled:true,onSelect(){},onTakePhoto(){},onRemove(){}});
 assert.ok(all(tree,'Pressable').every(n=>n.props.disabled));assert.ok(all(tree,'Text').some(n=>n.props.children==='Not saved'));
});

test('redesigned setup preserves title, selected coordinates, duration boundaries and busy controls', () => {
  const {QuickJourneySetup} = load('src/components/create/quick-journey-setup.tsx', {'../discovery/ui':ui,'./place-picker':{PlacePicker:'PlacePicker',formStyles:{}}});
  const changes=[], titles=[], destinations=[];
  const props={form:{...model.newForm(id),destination:place,traveler:'friends'},disabled:false,onTitle:v=>titles.push(v),onDestination:v=>destinations.push(v),onChange:v=>changes.push(v),onStart(){}};
  let tree=QuickJourneySetup(props);
  const picker=all(tree,'PlacePicker')[0];assert.equal(picker.props.compact,true);assert.equal(picker.props.destinationOnly,true);
  picker.props.onSelect(place);assert.deepEqual(destinations,[place]);
  assert.ok(all(tree,'Text').some(n=>n.props.children===place.label));
  assert.equal(all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='friends').props.accessibilityState.selected,true);
  all(tree,'TextInput').find(n=>n.props.accessibilityLabel==='Journey title').props.onChangeText('Coastal escape');assert.deepEqual(titles,['Coastal escape']);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='One more day').props.onPress();assert.deepEqual(changes.at(-1),{days:'2'});
  for(const days of ['365','0','1.5','abc']) {
    tree=QuickJourneySetup({...props,form:{...props.form,days}});
    assert.equal(all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='One more day').props.disabled,true);
  }
  tree=QuickJourneySetup({...props,disabled:true,saving:true});
  assert.ok(all(tree,'Pressable').every(n=>n.props.disabled && n.props.accessibilityState.disabled));
  assert.ok(all(tree,'TextInput').every(n=>n.props.editable===false));
  assert.equal(all(tree,'Action')[0].props.label,'Saving…');assert.equal(all(tree,'Action')[0].props.disabled,true);
});

test('private history resumes actual drafts and keeps all-drafts, empty, loading and retry paths', () => {
  let state={data:[{id,title:'Coastal escape'},{id:uid,title:'Family trip'},{id:sid,title:'Weekend'},{id:'fourth',title:'Older'}]}, refreshes=0;
  const routes=[];
  const modules={
    '@/lib/create/photo-save':{},'@/lib/create/photo-queries':{},'@/hooks/use-editor-photos':{},'@/hooks/use-local-photos':{},
    '@/components/create/photo-field':{},'@/components/create/memory-editor-sheet':{},'@/components/create/memory-row':{},'@/lib/create/memory':{},
    '@/lib/discovery/model':{},'expo-router/react-navigation':{},'@/components/create/quick-journey-setup':{},'@/lib/create/editor-model':{},
    '@/lib/create/id':{},'react-native-safe-area-context':{},'@/components/discovery/ui':ui,'@/components/create/place-picker':{},
    '@/components/journey/map/journey-map':{},'@/hooks/session-context':{},'@/lib/create/model':{},'@/lib/create/queries':{},
    'expo-router':{useRouter:()=>({push:r=>routes.push(r)}),useFocusEffect:fn=>fn()},
    '@/hooks/use-load':{useLoad:()=>({...state,refresh:()=>refreshes++})},'@/lib/remix/queries':{},
  };
  const {DraftShortcuts}=load('src/app/create.tsx',modules);
  let tree=DraftShortcuts({ownerId:uid});assert.equal(refreshes,1);
  const buttons=all(tree,'Pressable');assert.equal(buttons.length,5);assert.equal(all(tree,'Action').length,0);assert.equal(all(tree,'ScrollView').length,1);assert.equal(all(tree,'ScrollView')[0].props.accessibilityLabel,'Private draft history');assert.equal(tree.props.style.flexShrink,0);assert.equal(all(tree,'ScrollView')[0].props.horizontal,true);
  buttons.find(n=>n.props.accessibilityLabel==='Continue: Coastal escape').props.onPress();assert.deepEqual(routes.at(-1),{pathname:'/create',params:{draft:id}});
  buttons.find(n=>n.props.accessibilityLabel==='All private drafts').props.onPress();assert.equal(routes.at(-1),'/account');
  state={data:[]};tree=DraftShortcuts({ownerId:uid});assert.ok(all(tree,'Text').some(n=>n.props.children==='Your saved drafts will appear here.'));
  state={loading:true};tree=DraftShortcuts({ownerId:uid});assert.equal(all(tree,'ActivityIndicator')[0].props.accessibilityLabel,'Loading private drafts');
  const retry=()=>{};state={error:'Offline',retry};tree=DraftShortcuts({ownerId:uid});assert.equal(all(tree,'Message')[0].props.retry,retry);
});

test('compact creation scrolls feedback and retry together while history stays separate', () => {
  const h=screenHarness();const page=h.render().props.children;
  assert.equal(page.type,'View');assert.equal(page.props.style.flex,undefined);assert.equal(page.props.style.flexShrink,1);assert.equal(page.props.style.minHeight,0);
  assert.equal(h.render().props.style.flexShrink,1);assert.equal(h.render().props.style.flex,undefined,'Quick Start uses natural height so the globe receives slack');
  assert.deepEqual(page.props.children.map(n=>n.type?.name || n.type),['QuickJourneySetup','DraftShortcuts']);
  const {QuickJourneySetup}=load('src/components/create/quick-journey-setup.tsx',{'../discovery/ui':ui,'./place-picker':{PlacePicker:'PlacePicker',formStyles:{}}});
  const tree=QuickJourneySetup({form:model.newForm(id),disabled:false,onTitle(){},onDestination(){},onChange(){},onStart(){},feedback:{type:'Text',props:{children:'Check destination'}}});
  const controls=all(tree,'ScrollView')[0], footer=controls.props.children.at(-1);
  assert.equal(controls.type,'ScrollView');assert.equal(controls.props.style.flexShrink,1);
  assert.equal(all(controls,'ScrollView').length,1,'No nested main controls scroll');
  assert.equal(all(controls,'Action').length,1,'Retry remains reachable by scrolling past feedback');
  assert.equal(footer.props.style.flexShrink,0);assert.equal(all(footer,'Action')[0].props.label,'Create my journey');
  assert.ok(all(controls,'Text').some(n=>n.props.children==='Check destination'),'Error stays in the same scroller as retry');
  assert.equal(tree.props.style.flexShrink,1);
});

test('reference form keeps compact controls and a scrollable CTA when globe header reduces available height', () => {
  const shared=load('src/components/discovery/ui.tsx',{'expo-router':{useRouter:()=>({})}});
  const setup=load('src/components/create/quick-journey-setup.tsx',{'../discovery/ui':shared,'./place-picker':{PlacePicker:'PlacePicker',formStyles:{input:{},label:{fontSize:14}}}});
  const tree=setup.QuickJourneySetup({form:{...model.newForm(id),destination:place},disabled:false,onTitle(){},onDestination(){},onChange(){},onStart(){}});
  const controls=all(tree,'ScrollView')[0], footer=controls.props.children.at(-1), [destination,details]=controls.props.children;
  const [title,traveler,duration]=details.props.children;
  const inputStyle=all(title,'TextInput')[0].props.style.at(-1);
  const chips=all(traveler,'Pressable');assert.equal(chips.length,4);assert.ok(chips.every(n=>n.props.style[0].minHeight>=44));
  assert.equal(traveler.props.children[1].props.style.flexWrap,'wrap');assert.equal(duration.props.style.flexWrap,'wrap');
  // Conservative normal-text vertical budget using rendered component styles (not a native layout measurement).
  const destinationHeight=destination.props.style.padding*2+44+destination.props.style.gap+23;
  const detailsHeight=details.props.style.padding*2+2+inputStyle.minHeight+(18+4+44)+44+2*details.props.style.gap;
  const formHeight=destinationHeight+controls.props.contentContainerStyle.gap+detailsHeight+tree.props.style.gap+shared.ui.action.minHeight;
  for(const [width,height] of [[320,568],[360,640],[393,851],[412,915]]) {
    const banner=Math.max(112,Math.min(240,(width-16)*0.62,height-590));
    const available=height-48-72-banner-12-8-(44+64+8+4)-4;
    assert.ok(shared.ui.action.minHeight+2*tree.props.style.padding+2<available, width+'x'+height+' leaves space for CTA and shrinkable controls');
    if(width>=393)assert.ok(formHeight+2*tree.props.style.padding+2<=available,'Tall portrait accommodates normal-text form estimate');
  }
  assert.equal(footer.props.style.flexShrink,0,'CTA keeps its touch target inside scroll content');
  assert.equal(controls.props.style.flexShrink,1);assert.equal(shared.ui.compactBack.width,44);
  assert.equal(shared.ui.header.minHeight,76,'Other screen header default retained');
});

test('destination modal closes via Android back or Close without selecting or losing query, and manual search can reopen', async () => {
  const h=harness();const selected=[];
  const {PlacePicker}=load('src/components/create/place-picker.tsx',{'../discovery/ui':ui,'@/lib/create/places':{searchPlaces:async()=>Array.from({length:15},(_,i)=>({...place,label:'Place '+i,mapboxId:String(i)}))}},h.hooks);
  const props={label:'Destination',compact:true,destinationOnly:true,disabled:false,onSelect:v=>selected.push(v)};
  let tree=h.render(PlacePicker,props);all(tree,'TextInput')[0].props.onChangeText('Varkala');tree=h.render(PlacePicker,props);
  for(const close of ['back','button']) {
    all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Search destination').props.onPress();await tick();tree=h.render(PlacePicker,props);
    const modal=all(tree,'Modal')[0];assert.ok(modal);assert.equal(all(modal,'Pressable').length,16);
    const panel=modal.props.children.props.children;assert.equal(panel.props.style.maxHeight,'70%');
    assert.equal(all(modal,'ScrollView').length,1);assert.equal(all(modal,'ScrollView')[0].props.keyboardShouldPersistTaps,'handled');
    if(close==='back')modal.props.onRequestClose();else all(modal,'Pressable').find(n=>n.props.accessibilityLabel==='Close destination results').props.onPress();
    tree=h.render(PlacePicker,props);assert.equal(all(tree,'Modal').length,0);assert.equal(all(tree,'TextInput')[0].props.value,'Varkala');assert.equal(selected.length,0);
  }
});

test('compact header retains back navigation and discover fallback with unchanged default geometry', () => {
  const routes=[];let back=true;
  const {ScreenHeader}=load('src/components/discovery/ui.tsx',{'expo-router':{useRouter:()=>({canGoBack:()=>back,back:()=>routes.push('back'),replace:r=>routes.push(r)})}});
  for(const compact of [false,true]) {
    const tree=ScreenHeader({title:'Plan your journey',back:true,compact});
    const button=all(tree,'Pressable')[0];button.props.onPress();assert.equal(routes.at(-1),back?'back':'/discover');
    if(compact) { assert.equal(tree.props.style[1].minHeight,56);assert.equal(button.props.style[1].width,44); }
    else assert.equal(tree.props.style[1],false);
    back=false;
  }
});

test('Create globe header fills behind status inset and reserves legal/camera space without title overlay', () => {
  const routes=[];let height=640,back=true;
  const h=harness();const {CreateJourneyHeader}=load('src/components/create/create-journey-header.tsx',{
    'expo-router':{useRouter:()=>({canGoBack:()=>back,back:()=>routes.push('back'),replace:r=>routes.push(r)})},
    'react-native':{useWindowDimensions:()=>({height,width:360})},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:30})},
    '../discovery/globe/discovery-globe':{DiscoveryGlobe:'DiscoveryGlobe'},'@/lib/discovery/map':{discoveryPoints:()=>({type:'FeatureCollection',features:[]})},
  },h.hooks);
  for(const screenHeight of [568,640,851,915]) {
    height=screenHeight;let tree=h.render(CreateJourneyHeader,{});
    const bannerHeight=tree.props.style[1].height;assert.ok(bannerHeight>=142&&bannerHeight<=270);assert.equal(tree.props.style[1].flexGrow,1,'Globe receives available flex space beyond its responsive base');
    tree.props.onLayout({nativeEvent:{layout:{width:360,height:bannerHeight}}});tree=h.render(CreateJourneyHeader,{});
    const globe=all(tree,'DiscoveryGlobe')[0];assert.equal(globe.props.preview,true);assert.equal(globe.props.destinationMode,true);assert.equal(globe.props.sheetInteracting,true);
    assert.deepEqual(globe.props.points.features,[]);assert.deepEqual(globe.props.route,[]);assert.equal(globe.props.selectionId,null);
    assert.deepEqual(globe.props.viewport,{width:360,height:bannerHeight});assert.equal(globe.props.bottomInset,0);assert.equal(globe.props.headerInset,30);
  }
  const tree=h.render(CreateJourneyHeader,{});assert.equal(all(tree,'Pressable').length,0);assert.equal(all(tree,'Text').length,0);assert.equal(tree.props.style[0].alignSelf,'stretch');assert.equal(tree.props.style[0].marginHorizontal,undefined);assert.equal(tree.props.style[0].marginTop,undefined);assert.equal(tree.props.style[0].borderBottomLeftRadius,24);
  const shade=all(tree,'View').find(n=>n.props.testID==='create-status-shade');assert.equal(shade.props.pointerEvents,'none');assert.equal(shade.props.style[1].height,42);
  assert.equal(h.render(CreateJourneyHeader,{keyboardOpen:true}).props.style[1].height,102);
  assert.equal(h.render(CreateJourneyHeader,{keyboardOpen:true}).props.style[1].flexGrow,0,'Keyboard hero never consumes leftover form space');
});

test('globe preview keeps native attribution while Home retains its original controls and world camera', () => {
  const worldCamera={centerCoordinate:[35,18],zoomLevel:0.8,heading:0,pitch:0};
  const mapbox=Object.fromEntries(['MapView','Camera','Atmosphere','SymbolLayer','CircleLayer','ShapeSource'].map(n=>[n,n]));mapbox.StyleURL={SatelliteStreet:'satellite',Outdoors:'outdoors'};
  const {NativeGlobe}=load('src/components/discovery/globe/native-globe.tsx',{
    '@rnmapbox/maps':{__esModule:true,default:mapbox},'expo-router':{useFocusEffect(){}},
    'react-native':{AppState:{currentState:'active'}},
    '@/lib/discovery/map':{worldCamera,selectedJourneyId:()=>null},
    '@/lib/discovery/camera':{discoveryPadding:()=>({paddingTop:12}),locateCamera:()=>null,maxDiscoveryZoom:16},
    '@/lib/discovery/locate-transition':{createLocateTransition:()=>({})},'@/lib/discovery/idle-motion':{createIdleMotion:()=>({})},
    '@/lib/discovery/globe-style':load('src/lib/discovery/globe-style.ts',{}),'../home-control-icon':{HomeControlIcon:'HomeControlIcon'},'../ui':ui,'@/lib/discovery/presentation':{},'./fallback':{GlobeLoading:'GlobeLoading'},'./journey-overlays':{JourneyOverlays:'JourneyOverlays'},
  });
  const props={points:{features:[]},route:[],onOpen(){},retry(){},bottomInset:0,viewport:{width:360,height:120},selectionId:null,locateVersion:0,sheetInteracting:true};
  let tree=NativeGlobe({...props,preview:true});let map=all(tree,'MapView')[0].props;
  assert.equal(map.projection,'globe');assert.equal(map.scrollEnabled,false);assert.equal(map.zoomEnabled,false);assert.equal(map.rotateEnabled,false);assert.equal(map.compassEnabled,false);
  assert.equal(map.logoEnabled,true);assert.equal(map.attributionEnabled,true);assert.equal(all(tree,'Pressable').length,0);
  assert.equal(all(tree,'Camera')[0].props.defaultSettings.zoomLevel,0);
  tree=NativeGlobe(props);map=all(tree,'MapView')[0].props;
  assert.equal(map.scrollEnabled,true);assert.equal(map.zoomEnabled,true);assert.equal(map.rotateEnabled,true);assert.equal(map.compassEnabled,true);
  assert.equal(all(tree,'Pressable')[0].props.accessibilityLabel,'Reset globe to world view');assert.deepEqual(all(tree,'Camera')[0].props.defaultSettings,worldCamera);
  tree=NativeGlobe({...props,homeSearch:true,headerInset:90,bottomInset:300,viewport:{width:360,height:800}});
  const reset=all(tree,'Pressable')[0];
  assert.equal(reset.props.style[2].bottom,316);
  assert.equal(reset.props.style[2].top,undefined);
  assert.ok(reset.props.style[1].width>=44 && reset.props.style[1].minHeight>=44);
  assert.equal(all(reset,'HomeControlIcon')[0].props.name,'world');
  assert.equal(all(reset,'Text').length,0);
});

test('draft editor puts map first, cover below and publish confirmation outside scroll', () => {
  const state={candidates:{cover:{uri:'file:///unsaved-cover.jpg'}}};
  const h=screenHarness({...privateForm(),coverPath:'https://saved.test/cover.jpg'},state);
  let tree=h.render();const scroll=all(tree,'ScrollView')[0];
  assert.equal(all(tree,'PhotoField').length,0);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Edit cover photo').props.onPress();tree=h.render();
  assert.equal(all(tree,'PhotoField')[0].props.candidate.uri,'file:///unsaved-cover.jpg');
  assert.equal(all(scroll,'SwipeAction').length,0);
  const footer=tree.props.children[1];assert.equal(footer.props.style.flexShrink,0);
  assert.equal(all(footer,'SwipeAction').length,0);
  assert.ok(all(tree,'Pressable').some(n=>n.props.accessibilityLabel==='Save Draft'));
  assert.ok(all(tree,'Pressable').some(n=>n.props.accessibilityLabel==='Add your first stop'));
  assert.equal(all(tree,'MemoryDeck')[0].props.status,'Photos not saved');
  const map=all(tree,'DraftMap')[0];assert.equal(map.props.topInset,24);assert.ok(map.props.height>=165);
  all(tree,'PhotoField')[0].props.onRemove();tree=h.render();assert.equal(all(tree,'PhotoField')[0].props.savedUri,'https://saved.test/cover.jpg');
  assert.equal(h.writes.length,0);assert.equal(h.uploads.length,0);
});

test('restyled memory sheet retains current location, edit name, note limit, photo placement and details semantics', () => {
  const h=harness(),patches=[];let captures=0,cancels=0,closes=0;
  const {MemoryEditorSheet}=load('src/components/create/memory-editor-sheet.tsx',{
    '@/hooks/use-memory-location':{useMemoryLocation:()=>({busy:false,error:null,start:()=>captures++,cancel:()=>cancels++,isBusy:()=>false})},
    '../discovery/ui':ui,'./place-picker':{PlacePicker:'PlacePicker',formStyles:{}},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
  },h.hooks);
  const props={value:memoryRow(sid,'Beach',{latitude:8.7,longitude:76.7,description:'Keep this note',rating:'0',day:'1'}),isNew:false,proximity:place,busy:false,blocked:false,error:null,onChange:p=>patches.push(p),onClose:()=>closes++,onSave(){},photoControl:{type:'PhotoControl',props:{}}};
  let tree=h.render(MemoryEditorSheet,props);assert.equal(all(tree,'PlacePicker')[0].props.inlineSearch,true);assert.equal(all(tree,'PlacePicker')[0].props.compact,undefined,'Search stays in this sheet, with no nested result modal');
  const scroll=all(tree,'ScrollView')[0];const photoIndex=scroll.props.children.findIndex(n=>n?.type==='PhotoControl');const noteIndex=scroll.props.children.findIndex(n=>n?.props?.accessibilityLabel==='Memory note');assert.ok(photoIndex<noteIndex);
  assert.equal(all(tree,'TextInput').find(n=>n.props.accessibilityLabel==='Memory note').props.maxLength,1000);assert.ok(all(tree,'Text').some(n=>[n.props.children].flat().join('')===props.value.description.length+'/1000'));
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Use current location').props.onPress();assert.equal(captures,1);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Name it now, locate later').props.onPress();assert.deepEqual(patches,[],'Name shortcut never clears the selected coordinates');
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='More memory details').props.onPress();tree=h.render(MemoryEditorSheet,props);
  assert.equal(all(tree,'TextInput').find(n=>n.props.accessibilityLabel==='Memory rating').props.value,'0');assert.ok(!all(tree,'TextInput').some(n=>/date|time/i.test(n.props.accessibilityLabel)));
  all(tree,'Modal')[0].props.onRequestClose();assert.equal(cancels,1);assert.equal(closes,1);
});

test('memory inline search uses existing request/select behavior without opening a second modal',async()=>{
  const h=harness(),picked=[];const {PlacePicker}=load('src/components/create/place-picker.tsx',{'../discovery/ui':ui,'@/lib/create/places':{searchPlaces:async()=>[place]}},h.hooks);
  const props={label:'Find a place',inlineSearch:true,disabled:false,onSelect:p=>picked.push(p)};
  let tree=h.render(PlacePicker,props);all(tree,'TextInput')[0].props.onChangeText('Varkala');tree=h.render(PlacePicker,props);
  all(tree,'TextInput')[0].props.onSubmitEditing();await tick();tree=h.render(PlacePicker,props);
  assert.equal(all(tree,'Modal').length,0);all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Select '+place.label).props.onPress();assert.deepEqual(picked,[place]);
});

test('compact cover row expands existing tools without changing selection, remove or disabled behavior', () => {
  const h=harness();const {PhotoField}=load('src/components/create/photo-field.tsx',{'../discovery/ui':ui},h.hooks);
  let picked=0,camera=0,removed=0;
  const props={label:'Cover photo',compact:true,savedUri:'https://saved.test/photo',hasSavedPhoto:true,onRemoveSaved:()=>removed++,disabled:false,busy:false,onSelect:()=>picked++,onTakePhoto:()=>camera++,onRemove(){}};
  let tree=h.render(PhotoField,props);let summary=all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Edit cover photo');
  assert.equal(summary.props.accessibilityState.expanded,false);assert.ok(summary.props.style.minHeight>=44);
  assert.ok(all(tree,'View').some(n=>n.props.style?.display==='none'),'Photo tools initially take no layout space');
  summary.props.onPress();tree=h.render(PhotoField,props);summary=all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Edit cover photo');assert.equal(summary.props.accessibilityState.expanded,true);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Choose from Gallery for Cover photo').props.onPress();
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Take Photo for Cover photo').props.onPress();
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Remove saved Cover photo').props.onPress();assert.deepEqual([picked,camera,removed],[1,1,1]);
  tree=h.render(PhotoField,{...props,disabled:true});assert.ok(all(tree,'Pressable').every(n=>n.props.disabled));
  tree=h.render(PhotoField,{...props,candidate:{uri:'file:///local.jpg'}});assert.ok(all(tree,'Text').some(n=>n.props.children==='Not saved'));
  let refreshed=0;tree=h.render(PhotoField,{...props,savedUri:null,onPreviewError:()=>refreshed++});assert.ok(all(tree,'Text').some(n=>n.props.children==='Saved photo · Preview unavailable'));all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Refresh Cover photo preview').props.onPress();assert.equal(refreshed,1);
});

test('memory location shortcuts have equal column bases and details appear after name or place choice', () => {
  const h=harness();const {MemoryEditorSheet}=load('src/components/create/memory-editor-sheet.tsx',{
    '@/hooks/use-memory-location':{useMemoryLocation:()=>({busy:false,error:null,start(){},cancel(){},isBusy:()=>false})},'../discovery/ui':ui,'./place-picker':{PlacePicker:'PlacePicker',formStyles:{}},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
  },h.hooks);
  const props={value:memory.emptyMemory(sid),isNew:true,proximity:place,busy:false,blocked:false,error:null,onChange(){},onClose(){},onSave(){},photoControl:{type:'PhotoControl',props:{}}};
  let tree=h.render(MemoryEditorSheet,props);const modes=all(tree,'ScrollView')[0].props.children[0];
  assert.equal(modes.props.style.flexWrap,'nowrap');assert.equal(modes.props.children.length,3);
  for(const item of modes.props.children){assert.equal(item.props.style.flex,1);assert.equal(item.props.style.minWidth,0);assert.ok(item.props.style.minHeight>=44);}
  for(const width of [320,360,393,412])assert.ok((width-40-12-8)/3>=80,'Each column retains readable width');
  assert.equal(all(tree,'PhotoControl').length,0);assert.equal(all(tree,'Pressable').some(n=>n.props.accessibilityLabel==='Add note'),false);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Name it now, locate later').props.onPress();tree=h.render(MemoryEditorSheet,props);
  assert.equal(all(tree,'PhotoControl').length,1);assert.ok(all(tree,'Pressable').some(n=>n.props.accessibilityLabel==='Add note'));assert.ok(all(tree,'TextInput').some(n=>n.props.accessibilityLabel==='Memory name'));
  assert.equal(all(all(tree,'ScrollView')[0],'Action').length,0,'Save stays outside scrolling in both stages');
});

test('loaded editor owns a single cover back action and entry no longer adds a duplicate header', () => {
  const h=screenHarness(privateForm());const tree=h.render();assert.equal(all(tree,'Pressable').filter(n=>n.props.accessibilityLabel==='Go back').length,1);
  assert.equal(all(tree,'PhotoField').length,0,'Cover controls live only inside their popup');
  const back=all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Go back');back.props.onPress();assert.equal(h.routes.at(-1),'back');h.setCanGoBack(false);back.props.onPress();assert.equal(h.routes.at(-1),'/discover');
  const entry=screenHarness(privateForm()).renderEntry();assert.equal(all(entry,'ScreenHeader').length,0);assert.equal(all(entry,'DraftEditorEntry').length,1);
  const initial=screenHarness().renderEntry();assert.equal(all(initial,'CreateJourneyHeader').length,1);
});


test('static horizontal history keeps a centered heading, every draft, and no sheet resizing or drag responders', () => {
  const h=harness(), routes=[];
  const entries=Array.from({length:8},(_,i)=>({id:'draft-'+i,title:'Actual draft '+i}));
  const modules={
    '@/lib/create/photo-save':{},'@/lib/create/photo-queries':{},'@/hooks/use-editor-photos':{},'@/hooks/use-local-photos':{},
    '@/components/create/photo-field':{},'@/components/create/memory-editor-sheet':{},'@/components/create/memory-row':{},'@/lib/create/memory':{},
    '@/lib/discovery/model':{},'expo-router/react-navigation':{},'@/components/create/quick-journey-setup':{},'@/lib/create/editor-model':{},
    '@/lib/create/id':{},'react-native-safe-area-context':{},'@/components/discovery/ui':ui,'@/components/create/place-picker':{},
    '@/components/journey/map/journey-map':{},'@/hooks/session-context':{},'@/lib/create/model':{},'@/lib/create/queries':{},
    'expo-router':{useRouter:()=>({push:r=>routes.push(r)}),useFocusEffect:fn=>fn()},
    '@/hooks/use-load':{useLoad:()=>({data:entries,refresh(){}})},'@/lib/remix/queries':{},
    '@/hooks/use-discovery-sheet':{useDiscoverySheet:()=>{throw Error('Create history must not attach sheet gestures');}},
  };
  const {DraftShortcuts}=load('src/app/create.tsx',modules,h.hooks);
  for(const width of [240,320,360,393,412,560]) {
    let tree=h.render(DraftShortcuts,{ownerId:uid});tree.props.onLayout({nativeEvent:{layout:{width:width-32}}});tree=h.render(DraftShortcuts,{ownerId:uid});
    assert.equal(tree.type,'View');assert.equal(tree.props.style.flexShrink,0);assert.equal(tree.props.style.marginTop,12);
    assert.equal(tree.props.style.height,undefined);assert.equal(tree.props.onTouchStart,undefined);assert.equal(all(tree,'AnimatedView').length,0);
    const header=tree.props.children[0], [balance,title,viewAll]=header.props.children;
    assert.equal(title.props.children,'Your drafts');assert.equal(title.props.style.textAlign,'center');
    assert.equal(title.props.style.flex,1);assert.equal(balance.props.style.width,viewAll.props.style.width,'Equal side slots center the heading across the whole section');
    assert.equal(header.props.onMoveShouldSetPanResponderCapture,undefined);assert.equal(header.props.style.minHeight,44);
    const list=all(tree,'ScrollView')[0];assert.equal(list.props.horizontal,true);assert.equal(list.props.directionalLockEnabled,true);
    assert.equal(typeof list.props.onScroll,'function','Scroll only updates Buddy protection measurements');
    list.props.onScroll();assert.equal(h.render(DraftShortcuts,{ownerId:uid}).props.style.height,undefined,'Swiping history still cannot set form/sheet height');
    assert.equal(all(tree,'DeleteDraftAction').length,0);assert.equal(all(tree,'Modal').length,0);
    assert.ok(list.props.children.every(n=>n.type==='Pressable'),'History has only original cards, without extra action rows');
    assert.equal(list.props.style.flexShrink,0);assert.equal(list.props.style.height,undefined,'Text can grow without fixed-height cropping');
    const cards=all(list,'Pressable');assert.equal(cards.length,8,'No collapsed-state truncation');
    const cardStyle=cards[0].props.style({pressed:false});assert.ok(cardStyle[1].width<=width-32);assert.ok(cardStyle[1].width<=320);
    assert.equal(all(tree,'Pressable').length,9,'No expand/collapse controls or drag handle');
    cards[7].props.onPress();assert.deepEqual(routes.at(-1),{pathname:'/create',params:{draft:'draft-7'}});
    viewAll.props.onPress();assert.equal(routes.at(-1),'/account');
  }
  const page=screenHarness().render().props.children;
  assert.equal(page.props.onLayout,undefined,'History no longer measures/resizes the form');
  assert.equal(page.props.children[1].props.availableHeight,undefined);
});


test('embedded Create suggestions stay below an editable icon input and outside dismissal cancels stale autocomplete',async()=>{
  const h=harness(),timers=new Map(),requests=[],selected=[];let timerId=0,dismissed=0,fontScale=1;
  const {PlacePicker}=load('src/components/create/place-picker.tsx',{'../discovery/ui':ui,'react-native':{useWindowDimensions:()=>({width:360,height:780,fontScale}),Keyboard:{dismiss(){dismissed++;}}},'@/lib/create/places':{searchPlaces:(query,destination,proximity,signal)=>new Promise(resolve=>requests.push({query,signal,resolve}))}},h.hooks,{setTimeout:fn=>{const key=++timerId;timers.set(key,fn);return key;},clearTimeout:key=>timers.delete(key)});
  let props={label:'Destination',compact:true,embeddedSuggestions:true,autoSuggest:true,destinationOnly:true,disabled:false,dismissVersion:0,onSelect:p=>selected.push(p)};
  let tree=h.render(PlacePicker,props);all(tree,'TextInput')[0].props.onChangeText('Kochi');tree=h.render(PlacePicker,props);timers.forEach(fn=>fn());timers.clear();
  requests[0].resolve([{...place,name:'Kochi',label:'Kochi'}]);await tick();tree=h.render(PlacePicker,props);
  assert.equal(all(tree,'Modal').length,0);assert.equal(all(tree,'TextInput')[0].props.value,'Kochi');assert.equal(all(tree,'TextInput')[0].props.editable,true);assert.equal(dismissed,0,'Autocomplete does not close keyboard');
  assert.equal(all(tree,'TextInput')[0].props.placeholder,'Search destinations');fontScale=2;tree=h.render(PlacePicker,props);
  assert.equal(all(tree,'TextInput')[0].props.placeholder,'Destination');assert.equal(all(tree,'TextInput')[0].props.value,'Kochi','Resizing preserves the query');assert.equal(all(tree,'ScrollView').length,1,'Resizing preserves available results');assert.equal(requests.length,1,'Resizing does not trigger another search');
  const input=all(tree,'TextInput')[0],list=all(tree,'ScrollView')[0];assert.equal(input.props.style.at(-1).paddingLeft,36);assert.equal(list.props.nestedScrollEnabled,true);assert.equal(list.props.style.maxHeight,132);
  assert.equal(tree.props.children[1].type,'View');assert.equal(tree.props.children[3].type,'View','Suggestions follow the search row in normal flow');
  let stopped=false;tree.props.onTouchStart({stopPropagation(){stopped=true;}});assert.equal(stopped,true,'Search touches do not count as outside taps');
  props={...props,dismissVersion:1};tree=h.render(PlacePicker,props);assert.equal(all(tree,'ScrollView').length,0);assert.equal(requests[0].signal.aborted,true);assert.equal(timers.size,0,'Outside tap does not reopen old query');
  all(tree,'TextInput')[0].props.onChangeText('Munnar');tree=h.render(PlacePicker,props);timers.forEach(fn=>fn());timers.clear();requests[1].resolve([{...place,name:'Munnar',label:'Munnar'}]);await tick();tree=h.render(PlacePicker,props);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Close destination results').props.onPress();tree=h.render(PlacePicker,props);assert.equal(all(tree,'ScrollView').length,0);assert.equal(all(tree,'TextInput')[0].props.value,'Munnar');
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Search destination').props.onPress();requests[2].resolve([{...place,name:'Munnar',label:'Munnar'}]);await tick();tree=h.render(PlacePicker,props);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Select Munnar').props.onPress();tree=h.render(PlacePicker,props);assert.equal(selected[0].name,'Munnar');assert.equal(all(tree,'ScrollView').length,0);assert.equal(dismissed,1);
});

test('Create native globe flies to real destinations, replaces repeated flights, marks selection and preserves exploration on layout changes',async()=>{
  const h=harness(),commands=[];let appChange,motionChange;const motion={configure(){},pause(){},touch(){},observe(){},idle(){},dispose(){}};
  const mapbox=Object.fromEntries(['MapView','Camera','Atmosphere','SymbolLayer','CircleLayer','ShapeSource'].map(n=>[n,n]));mapbox.StyleURL={SatelliteStreet:'satellite',Outdoors:'outdoors'};
  const {NativeGlobe}=load('src/components/discovery/globe/native-globe.tsx',{
    '@rnmapbox/maps':{__esModule:true,default:mapbox},'expo-router':{useFocusEffect:fn=>h.hooks.useEffect(fn,[fn])},
    'react-native':{AppState:{currentState:'active',addEventListener:(name,fn)=>{appChange=fn;return {remove(){}};}},AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:(name,fn)=>{motionChange=fn;return {remove(){}};}}},
    '@/lib/discovery/map':{worldCamera:{centerCoordinate:[35,18],zoomLevel:0.8},selectedJourneyId:()=>null},'@/lib/discovery/camera':{discoveryPadding:()=>({}),locateCamera:()=>null,maxDiscoveryZoom:16,locateDuration:900},
    '@/lib/discovery/locate-transition':{createLocateTransition:()=>({select(){},cancel(){}})},'@/lib/discovery/idle-motion':{createIdleMotion:()=>motion},'@/lib/discovery/globe-style':load('src/lib/discovery/globe-style.ts',{}),'../ui':ui,'@/lib/discovery/presentation':{},'./fallback':{GlobeLoading:'GlobeLoading'},'./journey-overlays':{JourneyOverlays:'JourneyOverlays'},
  },h.hooks);
  let props={preview:true,destinationMode:true,destination:null,destinationVersion:0,points:{features:[]},route:[],onOpen(){},retry(){},bottomInset:0,viewport:{width:344,height:192},selectionId:null,locateVersion:0,sheetInteracting:true};
  let tree=h.render(NativeGlobe,props);all(tree,'Camera')[0].props.ref.current={setCamera:command=>commands.push(command)};await tick();all(tree,'MapView')[0].props.onDidFinishLoadingMap();tree=h.render(NativeGlobe,props);
  assert.equal(all(tree,'MapView')[0].props.scrollEnabled,true);assert.equal(all(tree,'Camera')[0].props.maxZoomLevel,14);
  props={...props,destination:place,destinationVersion:1};tree=h.render(NativeGlobe,props);assert.deepEqual(commands.at(-1).centerCoordinate,[place.longitude,place.latitude]);assert.equal(commands.at(-1).animationMode,'flyTo');assert.equal(commands.at(-1).animationDuration,1000);
  let marker=all(tree,'ShapeSource').find(n=>n.props.id==='create-destination').props.shape;assert.deepEqual(marker.features[0].geometry.coordinates,[place.longitude,place.latitude]);
  const next={...place,name:'New town',latitude:10,longitude:77};props={...props,destination:next,destinationVersion:2};tree=h.render(NativeGlobe,props);assert.deepEqual(commands.at(-1).centerCoordinate,[77,10]);
  const before=commands.length;props={...props,destinationVersion:3};tree=h.render(NativeGlobe,props);assert.equal(commands.length,before+1,'Selecting same place again refocuses');
  props={...props,viewport:{width:344,height:72}};tree=h.render(NativeGlobe,props);assert.equal(commands.at(-1).centerCoordinate,undefined,'Keyboard/layout refit cannot recenter a manual pan');assert.equal(all(tree,'Pressable').length,0,'Short globe never covers branding with World control');
  const count=commands.length;all(tree,'MapView')[0].props.onTouchStart();tree=h.render(NativeGlobe,props);assert.equal(commands.length,count);
  appChange('background');h.render(NativeGlobe,props);props={...props,destination:place,destinationVersion:4};h.render(NativeGlobe,props);assert.equal(commands.length,count);
  appChange('active');h.render(NativeGlobe,props);assert.deepEqual(commands.at(-1).centerCoordinate,[place.longitude,place.latitude]);
  motionChange(true);h.render(NativeGlobe,props);props={...props,destinationVersion:5};h.render(NativeGlobe,props);assert.equal(commands.at(-1).animationDuration,0);
  assert.equal(destinationHelpers.destinationCamera({...place,latitude:NaN},props.viewport),null);assert.equal(destinationHelpers.destinationMarker({...place,longitude:181}).features.length,0);
});

test('Create passes selected destination/version and outside-dismiss state without altering form semantics; CTA compaction is opt-in',()=>{
  const listeners={},old=native.Keyboard.addListener;native.Keyboard.addListener=(event,fn)=>{listeners[event]=fn;return {remove(){}};};
  try {
    const h=screenHarness();let tree=h.renderEntry();let entry=all(tree,'NewJourneyEditor')[0];entry.props.onDestinationFocus(place);tree=h.renderEntry();let header=all(tree,'CreateJourneyHeader')[0];assert.equal(header.props.destination,place);
    const version=header.props.destinationVersion;all(tree,'NewJourneyEditor')[0].props.onDestinationFocus(place);tree=h.renderEntry();assert.equal(all(tree,'CreateJourneyHeader')[0].props.destinationVersion,version+1);
    assert.deepEqual(tree.props.edges,['left','right','bottom']);assert.equal(all(tree,'StackScreen')[0].props.options.statusBarStyle,'light');
    all(tree,'View').find(n=>n.props.onTouchStart).props.onTouchStart();tree=h.renderEntry();assert.equal(all(tree,'NewJourneyEditor')[0].props.dismissSearchVersion,1);
    listeners.keyboardDidShow();tree=h.renderEntry();assert.equal(all(tree,'CreateJourneyHeader')[0].props.keyboardOpen,true);assert.equal(all(tree,'NewJourneyEditor')[0].props.keyboardOpen,true);
    const draftHarness=screenHarness(privateForm()),draft=draftHarness.renderEntry();assert.deepEqual(draft.props.edges,['left','right','bottom']);assert.equal(all(draft,'StackScreen')[0].props.options.statusBarStyle,'dark');
    assert.equal(all(draft,'DraftEditorEntry')[0].props.keyboardOpen,false);listeners.keyboardDidShow();const draftEntry=all(draftHarness.renderEntry(),'DraftEditorEntry')[0];assert.equal(draftEntry.props.keyboardOpen,true);
    assert.equal(all(draftHarness.mountChild(draftEntry),'NewJourneyEditor')[0].props.keyboardOpen,true,'Hydrated draft entry forwards actual route keyboard state to the editor');
    const editorTree=screenHarness().render({keyboardOpen:true});assert.equal(all(editorTree,'DraftShortcuts')[0].props.keyboardHidden,true);
  } finally {native.Keyboard.addListener=old;}
  const shared=load('src/components/discovery/ui.tsx',{'expo-router':{useRouter:()=>({})}});
  const compact=shared.Action({label:'Create my journey',compact:true,onPress(){}});assert.equal(compact.props.style({pressed:false}).at(-1).minHeight,44);assert.equal(shared.ui.action.minHeight,48,'Other screen buttons retain default size');
});


test('Home picker debounces real search adapter, rejects stale responses, handles empty/errors and keyboard dismissal, then selects again', async () => {
  const h=harness(), requests=[], selected=[], timers=new Map(); let key=0, hidden, dismissed=0;
  const {PlacePicker}=load('src/components/create/place-picker.tsx', {
    '../discovery/ui':ui,
    'react-native':{Keyboard:{dismiss(){dismissed++;},addListener(name,fn){assert.equal(name,'keyboardDidHide');hidden=fn;return {remove(){}};}}},
    '@/lib/create/places':{searchPlaces:(query,destination,proximity,signal)=>new Promise((resolve,reject)=>requests.push({query,destination,proximity,signal,resolve,reject}))},
  },h.hooks,{setTimeout:fn=>{timers.set(++key,fn);return key;},clearTimeout:id=>timers.delete(id)});
  const props={label:'Search places',homeSearch:true,compact:true,embeddedSuggestions:true,autoSuggest:true,proximity:place,disabled:false,onSelect:p=>selected.push(p)};
  const render=()=>h.render(PlacePicker,props), flush=()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());};
  let tree=render(); const input=()=>all(tree,'TextInput')[0];
  assert.equal(input().props.onPress,undefined);input().props.onFocus();tree=render();
  input().props.onChangeText('Ko');tree=render();assert.equal(timers.size,0);
  input().props.onChangeText('Kochi');tree=render();assert.equal(requests.length,0);flush();tree=render();
  assert.equal(all(tree,'ActivityIndicator').length,1);assert.equal(requests[0].destination,false);assert.equal(requests[0].proximity,place);
  input().props.onChangeText('Munnar');tree=render();assert.equal(requests[0].signal.aborted,true);flush();
  requests[0].resolve([place]);requests[1].resolve([]);await tick();tree=render();
  assert.ok(all(tree,'Text').some(n=>String(n.props.children).includes('No matching places')));
  input().props.onSubmitEditing();requests[2].reject(Error('Search unavailable'));await tick();tree=render();
  assert.ok(all(tree,'Text').some(n=>n.props.children==='Search unavailable'));
  input().props.onSubmitEditing();requests[3].resolve([place]);await tick();tree=render();
  assert.equal(all(tree,'Modal').length,0);assert.equal(all(tree,'ScrollView')[0].props.keyboardShouldPersistTaps,'handled');
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Select '+place.label).props.onPress();tree=render();
  assert.deepEqual(selected,[place]);assert.equal(dismissed,1);assert.equal(all(tree,'ScrollView').length,0);
  input().props.onFocus();input().props.onChangeText('Second place');tree=render();flush();
  const second={...place,name:'Second place',longitude:77};requests[4].resolve([second]);await tick();tree=render();
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Select '+second.label).props.onPress();tree=render();assert.deepEqual(selected,[place,second]);
  input().props.onFocus();input().props.onChangeText('Pending');tree=render();flush();hidden();tree=render();
  assert.equal(requests[5].signal.aborted,true);requests[5].resolve([place]);await tick();tree=render();assert.equal(all(tree,'ScrollView').length,0);
});

test('Home native globe flies to real destinations, replaces repeated flights, marks selection and preserves exploration on layout changes',async()=>{
  const h=harness(),commands=[];let appChange,motionChange;const motion={configure(){},pause(){},touch(){},observe(){},idle(){},dispose(){}};
  const mapbox=Object.fromEntries(['MapView','Camera','Atmosphere','SymbolLayer','CircleLayer','ShapeSource'].map(n=>[n,n]));mapbox.StyleURL={SatelliteStreet:'satellite',Outdoors:'outdoors'};
  const {NativeGlobe}=load('src/components/discovery/globe/native-globe.tsx',{
    '@rnmapbox/maps':{__esModule:true,default:mapbox},'expo-router':{useFocusEffect:fn=>h.hooks.useEffect(fn,[fn])},
    'react-native':{AppState:{currentState:'active',addEventListener:(name,fn)=>{appChange=fn;return {remove(){}};}},AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:(name,fn)=>{motionChange=fn;return {remove(){}};}}},
    '@/lib/discovery/map':{worldCamera:{centerCoordinate:[35,18],zoomLevel:0.8},selectedJourneyId:()=>null},'@/lib/discovery/camera':{discoveryPadding:()=>({paddingBottom:260,paddingTop:12}),locateCamera:()=>null,maxDiscoveryZoom:16,locateDuration:900},
    '@/lib/discovery/locate-transition':{createLocateTransition:()=>({select(){},cancel(){}})},'@/lib/discovery/idle-motion':{createIdleMotion:()=>motion},'@/lib/discovery/globe-style':load('src/lib/discovery/globe-style.ts',{}),'../ui':ui,'@/lib/discovery/presentation':{},'./fallback':{GlobeLoading:'GlobeLoading'},'./journey-overlays':{JourneyOverlays:'JourneyOverlays'},
  },h.hooks);
  let props={headerInset:100,preview:false,homeSearch:true,destinationMode:true,destination:null,destinationVersion:0,points:{features:[]},route:[],onOpen(){},retry(){},bottomInset:260,viewport:{width:344,height:640},selectionId:null,locateVersion:0,sheetInteracting:true};
  let tree=h.render(NativeGlobe,props);all(tree,'Camera')[0].props.ref.current={setCamera:command=>commands.push(command)};await tick();all(tree,'MapView')[0].props.onDidFinishLoadingMap();tree=h.render(NativeGlobe,props);
  assert.equal(all(tree,'MapView')[0].props.scrollEnabled,true);assert.equal(all(tree,'Camera')[0].props.maxZoomLevel,16);
  assert.equal(all(tree,'MapView')[0].props.compassPosition.top,112);assert.equal(all(tree,'MapView')[0].props.logoPosition.top,112);assert.equal(all(tree,'MapView')[0].props.attributionPosition.top,112);
  props={...props,destination:place,destinationVersion:1};tree=h.render(NativeGlobe,props);assert.deepEqual(commands.at(-1).centerCoordinate,[place.longitude,place.latitude]);assert.equal(commands.at(-1).zoomLevel,10);assert.equal(commands.at(-1).padding.paddingBottom,260);assert.equal(commands.at(-1).animationMode,'flyTo');assert.equal(commands.at(-1).animationDuration,1000);
  let marker=all(tree,'ShapeSource').find(n=>n.props.id==='create-destination').props.shape;assert.deepEqual(marker.features[0].geometry.coordinates,[place.longitude,place.latitude]);
  const next={...place,name:'New town',latitude:10,longitude:77};props={...props,destination:next,destinationVersion:2};tree=h.render(NativeGlobe,props);assert.deepEqual(commands.at(-1).centerCoordinate,[77,10]);
  const before=commands.length;props={...props,destinationVersion:3};tree=h.render(NativeGlobe,props);assert.equal(commands.length,before+1,'Selecting same place again refocuses');
  props={...props,viewport:{width:344,height:72}};tree=h.render(NativeGlobe,props);assert.equal(commands.at(-1).centerCoordinate,undefined,'Keyboard/layout refit cannot recenter a manual pan');
  const world=all(tree,'Pressable')[0], worldStyle=Object.assign({},...world.props.style.filter(Boolean));
  assert.equal(worldStyle.top,undefined);assert.equal(worldStyle.bottom,276,'Home World control sits just above the measured panel');
  assert.equal(worldStyle.minHeight,44);assert.equal(worldStyle.paddingHorizontal,0);
  assert.ok(worldStyle.minHeight>=44,'Small globe icon retains a 44-point touch target');
  const count=commands.length;all(tree,'MapView')[0].props.onTouchStart();tree=h.render(NativeGlobe,props);assert.equal(commands.length,count);
  appChange('background');h.render(NativeGlobe,props);props={...props,destination:place,destinationVersion:4};h.render(NativeGlobe,props);assert.equal(commands.length,count);
  appChange('active');h.render(NativeGlobe,props);assert.deepEqual(commands.at(-1).centerCoordinate,[place.longitude,place.latitude]);
  motionChange(true);h.render(NativeGlobe,props);props={...props,destinationVersion:5};h.render(NativeGlobe,props);assert.equal(commands.at(-1).animationDuration,0);
  assert.equal(destinationHelpers.destinationCamera({...place,latitude:NaN},props.viewport),null);assert.equal(destinationHelpers.destinationMarker({...place,longitude:181}).features.length,0);
});


test('Home selection wires coordinates and repeat flight versions without navigation; journey Locate restores its existing flow', () => {
  const h=harness(),routes=[];
  const {default:Home}=load('src/app/discover.tsx',{
    '@/components/create/place-picker':{PlacePicker:'PlacePicker'},'@/components/floating-navigation':{FloatingNavigation:'Navigation'},
    '../../assets/journey-creator-logo.png':'logo','expo-router':{useRouter:()=>({push:r=>routes.push(r)}),useFocusEffect:()=>{}},
    'react-native-safe-area-context':{SafeAreaView:'SafeAreaView',useSafeAreaInsets:()=>({bottom:24})},
    '@/components/discovery/globe/discovery-globe':{DiscoveryGlobe:'Globe'},'@/components/discovery/discovery-panel':{DiscoveryPanel:'Panel'},
    '@/hooks/use-load':{useLoad:()=>({data:[],refresh(){}})},'@/lib/discovery/map':{discoveryPoints:()=>({features:[]}),worldCamera:{centerCoordinate:[35,18]}},
    '@/lib/discovery/travel':{discoveryRoute:()=>[]},'@/lib/discovery/presentation':{},'@/lib/discovery/queries':{loadDiscoveryEntries(){},loadPublicJourney(){}},
    '@/hooks/use-discovery-viewer':{useDiscoveryViewer:()=>({pending:false,id:null})},'@/lib/discovery/model':{hideViewerJourneys:rows=>rows.map(r=>r.journey),discoveryJourneys:rows=>rows.map(r=>r.journey)},
  },h.hooks);
  let tree=h.render(Home,{});let picker=all(tree,'PlacePicker')[0];assert.equal(picker.props.proximity.longitude,35);
  all(tree,'Globe')[0].props.onCenterChange([76,9]);tree=h.render(Home,{});picker=all(tree,'PlacePicker')[0];assert.equal(picker.props.proximity.latitude,9);
  picker.props.onSelect(place);tree=h.render(Home,{});let globe=all(tree,'Globe')[0];assert.equal(globe.props.destination,place);assert.equal(globe.props.destinationMode,true);assert.equal(globe.props.destinationVersion,1);
  const next={...place,longitude:77};all(tree,'PlacePicker')[0].props.onSelect(next);tree=h.render(Home,{});globe=all(tree,'Globe')[0];assert.equal(globe.props.destination,next);assert.equal(globe.props.destinationVersion,2);
  all(tree,'PlacePicker')[0].props.onSelect(next);tree=h.render(Home,{});assert.equal(all(tree,'Globe')[0].props.destinationVersion,3);assert.deepEqual(routes,[]);
  all(tree,'Panel')[0].props.onLocate('journey');tree=h.render(Home,{});globe=all(tree,'Globe')[0];assert.equal(globe.props.destination,null);assert.equal(globe.props.destinationMode,false);assert.equal(globe.props.selectionId,'journey');assert.equal(globe.props.locateVersion,1);
  assert.equal(all(tree,'Navigation')[0].props.active,'explore');assert.equal(all(tree,'PlacePicker')[0].props.dismissVersion,1);
});


test('Home proximity uses only already-granted recent location; denied, missing and failed location still search from map center', async () => {
  for (const mode of ['denied','granted','missing','error']) {
    const h=harness();let positionReads=0,permissionRequests=0;
    const {default:Home}=load('src/app/discover.tsx',{
      '@/components/create/place-picker':{PlacePicker:'PlacePicker'},'@/components/floating-navigation':{FloatingNavigation:'Navigation'},
      '../../assets/journey-creator-logo.png':'logo','expo-router':{useRouter:()=>({}),useFocusEffect:fn=>h.hooks.useEffect(fn,[fn])},
      'react-native':{StatusBar:{pushStackEntry(){},popStackEntry(){}}},
      'expo-location':{getForegroundPermissionsAsync:async()=>{if(mode==='error')throw Error('Unavailable');return {granted:mode!=='denied'};},requestForegroundPermissionsAsync:async()=>{permissionRequests++;throw Error('No prompt allowed');},getLastKnownPositionAsync:async options=>{positionReads++;assert.equal(options.maxAge,300000);return mode==='missing'?null:{coords:{longitude:76,latitude:9}};}},
      'react-native-safe-area-context':{SafeAreaView:'SafeAreaView',useSafeAreaInsets:()=>({bottom:0})},
      '@/components/discovery/globe/discovery-globe':{DiscoveryGlobe:'Globe'},'@/components/discovery/discovery-panel':{DiscoveryPanel:'Panel'},
      '@/hooks/use-load':{useLoad:()=>({data:[],refresh(){}})},'@/lib/discovery/map':{discoveryPoints:()=>({features:[]}),worldCamera:{centerCoordinate:[35,18]}},
      '@/lib/discovery/travel':{discoveryRoute:()=>[]},'@/lib/discovery/presentation':{},'@/lib/discovery/queries':{loadDiscoveryEntries(){},loadPublicJourney(){}},
    '@/hooks/use-discovery-viewer':{useDiscoveryViewer:()=>({pending:false,id:null})},'@/lib/discovery/model':{hideViewerJourneys:rows=>rows.map(r=>r.journey),discoveryJourneys:rows=>rows.map(r=>r.journey)},
    },h.hooks);
    h.render(Home,{});await tick();const tree=h.render(Home,{}),picker=all(tree,'PlacePicker')[0];
    assert.equal(permissionRequests,0);assert.equal(positionReads,mode==='denied'||mode==='error'?0:1);
    assert.equal(picker.props.disabled,false);assert.equal(picker.props.proximity.longitude,mode==='granted'?76:35);
  }
});

test('private memory deck preserves order and edit semantics without moving publish footer', () => {
 const stops=[memoryRow(sid,'First',{day:'1',rating:'0'}),memoryRow(uid,'Second')];
 const h=screenHarness({...privateForm(),stops});let tree=h.render();
 const deck=all(tree,'MemoryDeck')[0];assert.deepEqual(deck.props.stops.map(s=>s.id),stops.map(s=>s.id));
 assert.equal(all(tree.props.children[1],'SwipeAction').length,1);
 deck.props.onSelect(uid);tree=h.render();assert.equal(all(tree,'MemoryRow')[1].props.selected,true);
 all(tree,'MemoryRow')[1].props.onEdit();tree=h.render();assert.equal(all(tree,'MemoryEditorSheet')[0].props.value.id,uid);
 assert.equal(h.writes.length,0);
});

test('photo memory card shows real day, zero rating, notes and unsaved photo status while busy locks every action', () => {
  const {MemoryRow}=load('src/components/create/memory-row.tsx',{'../discovery/ui':ui,'../discovery/journey-photo':{JourneyPhoto:'JourneyPhoto'}});
  const tree=MemoryRow({stop:memoryRow(sid,'Sunset',{description:'Actual note',day:'2',rating:'0'}),index:1,total:3,cardWidth:220,photo:'file:///real-local.jpg',localPhoto:true,disabled:true,onEdit(){},onMove(){},onRemove(){}});
  assert.equal(all(tree,'JourneyPhoto')[0].props.uri,'file:///real-local.jpg');
  const text=all(tree,'Text').map(n=>n.props.children);
  assert.ok(text.includes('Day 2 · 0/5 ★'));assert.ok(text.includes('Actual note'));assert.ok(text.includes('Photo - Not saved'));
  assert.ok(all(tree,'Pressable').every(n=>n.props.disabled));
  assert.equal(tree.props.style[1].width,220);
});

test('memory map receives resolved photos and selection without changing geometry on photo preparation',()=>{
  const photos={candidates:{[sid]:{uri:'file:///local-memory.jpg'}}};
  const h=screenHarness({...privateForm(),stops:[memoryRow(sid,'First',{latitude:8,longitude:76,photoPath:'journey-media/raw/stop.png'}),memoryRow(uid,'Second',{latitude:9,longitude:77})]},photos);
  let tree=h.render(),map=all(tree,'DraftMap')[0];const geometry=map.props.geometry;
  assert.equal(JSON.parse(map.props.photos)[sid],'file:///local-memory.jpg');assert.equal(JSON.parse(map.props.photos)[uid],null);
  const rail=all(tree,'MemoryDeck')[0];rail.props.onSelect(uid);tree=h.render();assert.equal(all(tree,'DraftMap')[0].props.selectedId,uid);
  map.props.onSelect(uid);tree=h.render();assert.equal(all(tree,'DraftMap')[0].props.selectedId,uid);assert.equal(all(tree,'MemoryRow')[1].props.selected,true);
  delete photos.candidates[sid];tree=h.render();assert.equal(all(tree,'DraftMap')[0].props.geometry,geometry);assert.equal(JSON.parse(all(tree,'DraftMap')[0].props.photos)[sid],'https://signed.test/stop');
  all(tree,'MemoryRow')[0].props.onEdit();tree=h.render();assert.equal(all(tree,'DraftMap')[0].props.active,false);assert.equal(all(tree,'DraftMap')[0].props.selectedId,sid);
  assert.equal(h.writes.length,0,'Map selection and photo previews do not persist anything');
});

test('remix editor opts into running Story map and pauses it behind keyboard, settings, memory sheet and blur without writing',()=>{
  const initial={...privateForm(),sourceId:uid,stops:[memoryRow(sid,'First',{latitude:8,longitude:76}),memoryRow(uid,'Second',{latitude:9,longitude:77})]};
  const h=screenHarness(initial);let tree=h.render();
  assert.equal(all(tree,'DraftMap')[0].props.remix,true);assert.equal(all(tree,'DraftMap')[0].props.active,true);
  all(tree,'MemoryDeck')[0].props.onSelect(uid);tree=h.render();assert.equal(all(tree,'DraftMap')[0].props.selectedId,uid);
  tree=h.render({keyboardOpen:true});assert.equal(all(tree,'DraftMap')[0].props.active,false);
  tree=h.render({keyboardOpen:false});all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Journey settings').props.onPress();tree=h.render();assert.equal(all(tree,'DraftMap')[0].props.active,false);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Close journey settings').props.onPress();tree=h.render();
  all(tree,'MemoryRow')[0].props.onEdit();tree=h.render();assert.equal(all(tree,'DraftMap')[0].props.active,false);
  h.blur();tree=h.render();assert.equal(all(tree,'DraftMap')[0].props.active,false);assert.equal(h.writes.length,0);
  const own=screenHarness({...initial,sourceId:undefined});assert.equal(all(own.render(),'DraftMap')[0].props.remix,false);
});

test('actual remix map shares card and pin selection, runs only its selected route, preserves controller until geometry changes and releases old timers',()=>{
  const h=screenHarness(),selected=[];
  const props={geometry:JSON.stringify([memoryRow(sid,'First',{latitude:8,longitude:76}),memoryRow(uid,'Second',{latitude:9,longitude:77})]),selectedId:sid,onSelect:id=>selected.push(id),active:true,topInset:24};
  let tree=h.renderRemixMap(props),map=all(tree,'JourneyMap')[0],playback=map.props.storyBuddy;
  const back=all(tree,'Pressable').find(node=>node.props.accessibilityLabel==='Go back');
  assert.ok(back,'Remix map exposes Back');back.props.onPress();assert.deepEqual(h.routes,['back']);
  h.setCanGoBack(false);back.props.onPress();assert.deepEqual(h.routes,['back','/discover']);
  assert.equal(h.writes.length,0,'Back never saves or copies a journey');
  assert.equal(map.props.presentation,'expanded');assert.equal(map.props.storyBuddyMotion,'run');assert.equal(map.props.storyBuddySize,36);assert.equal(map.props.memoryPhotos,undefined);assert.equal(map.props.animateMemoryRoute,undefined);assert.equal(map.props.controlTopInset,24);
  map.props.onExpand(); tree=h.renderRemixMap(props);
  assert.equal(all(tree,'StorySheet').length,1);assert.equal(all(tree,'JourneyMap').length,1);
  assert.equal(all(tree,'JourneyMap')[0].props.storyBuddy,playback);assert.equal(all(tree,'JourneyMap')[0].props.storyBuddySize,64);
  all(tree,'StorySheet')[0].props.onClose();tree=h.renderRemixMap(props);map=all(tree,'JourneyMap')[0];
  assert.equal(all(tree,'StorySheet').length,0);assert.equal(map.props.storyBuddySize,36);assert.equal(h.writes.length,0);
  assert.deepEqual(playback.get().coordinate,[76,8]);playback.configure(true,false);
  props.selectedId=uid;tree=h.renderRemixMap(props);map=all(tree,'JourneyMap')[0];assert.equal(map.props.storyBuddy,playback);assert.equal(playback.get().moving,true);map.props.onSelect(sid);assert.deepEqual(selected,[sid]);
  props.active=false;tree=h.renderRemixMap(props);assert.equal(all(tree,'JourneyMap')[0].props.storyBuddy,undefined);assert.equal(playback.get().moving,false);
  props.active=true;tree=h.renderRemixMap(props);assert.equal(all(tree,'JourneyMap')[0].props.storyBuddy,playback);
  props.geometry=JSON.stringify([memoryRow(uid,'Remaining',{latitude:9,longitude:77})]);tree=h.renderRemixMap(props);const replacement=all(tree,'JourneyMap')[0].props.storyBuddy;assert.notEqual(replacement,playback);assert.deepEqual(replacement.get().coordinate,[77,9]);replacement.dispose();
});

test('shared Home overlays keep original speed and route while editor opts into slow indicator and existing line',()=>{
  const mapbox={ShapeSource:'ShapeSource',LineLayer:'LineLayer',PointAnnotation:'PointAnnotation'};
  const {JourneyOverlays}=load('src/components/discovery/globe/journey-overlays.tsx',{
    '@rnmapbox/maps':{__esModule:true,default:mapbox},'../ui':ui,
    '@/hooks/use-journey-buddy':{useBuddyPreference:()=>({loaded:true,enabled:false})},'./traveling-buddy':{TravelingBuddy:'TravelingBuddy'},
    '@/lib/discovery/travel':{travelLegs:route=>route.length?[{duration:2800}]:[],travelLine:route=>({geometry:{coordinates:route}})},
  });
  const props={points:{features:[]},route:[[[76,8],[77,9]]],playing:true,playbackKey:'route',onOpen(){}};
  let tree=JourneyOverlays(props);assert.equal(all(tree,'ShapeSource').length,1);assert.equal(all(tree,'TravelingPlane')[0].props.legs[0].duration,2800);
  tree=JourneyOverlays({...props,drawRoute:false,durationScale:3});assert.equal(all(tree,'ShapeSource').length,0);assert.equal(all(tree,'TravelingPlane')[0].props.legs[0].duration,8400);
  assert.equal(all(JourneyOverlays({...props,playing:false}),'TravelingPlane').length,0);
  assert.equal(all(JourneyOverlays({...props,route:[]}),'TravelingPlane').length,0);
});

test('journey settings popup retains edits on close and saves the full draft through the existing controller', async () => {
  const h=screenHarness(privateForm());let tree=h.render();
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Journey settings').props.onPress();tree=h.render();
  assert.equal(all(tree,'Modal').length,1);assert.equal(all(tree,'QuickJourneySetup')[0].props.editing,true);
  all(tree,'QuickJourneySetup')[0].props.onTitle('Updated journey');
  tree=h.render();all(tree,'Modal')[0].props.onRequestClose();tree=h.render();assert.equal(all(tree,'Modal').length,0);assert.equal(h.writes.length,0);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Journey settings').props.onPress();tree=h.render();assert.equal(all(tree,'QuickJourneySetup')[0].props.form.title,'Updated journey');
  all(tree,'QuickJourneySetup')[0].props.onStart();await tick();tree=h.render();assert.equal(h.writes.length,1);assert.equal(all(tree,'Modal').length,0);
});

test('journey settings keeps validation failures open and creation controls expose the existing description',async()=>{
  const h=screenHarness(privateForm());let tree=h.render();all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Journey settings').props.onPress();tree=h.render();
  all(tree,'QuickJourneySetup')[0].props.onTitle('');tree=h.render();all(tree,'QuickJourneySetup')[0].props.onStart();await tick();tree=h.render();assert.equal(all(tree,'Modal').length,1);assert.equal(h.writes.length,0);assert.ok(all(tree,'QuickJourneySetup')[0].props.feedback);
  const {QuickJourneySetup}=load('src/components/create/quick-journey-setup.tsx',{'../discovery/ui':ui,'./place-picker':{PlacePicker:'PlacePicker',formStyles:{}}});
  const patches=[];tree=QuickJourneySetup({form:privateForm(),editing:true,disabled:false,onTitle(){},onDestination(){},onChange:p=>patches.push(p),onStart(){}});
  const description=all(tree,'TextInput').find(n=>n.props.accessibilityLabel==='Journey description (optional)');assert.equal(description.props.maxLength,5000);description.props.onChangeText('A new note');assert.deepEqual(patches,[{description:'A new note'}]);
  assert.equal(all(tree,'Action')[0].props.label,'Save Changes');assert.equal(all(tree,'PlacePicker')[0].props.destinationOnly,true);
});
test('Create memory rows and map previews receive companion URLs while unsaved candidates and full edit controls retain originals',()=>{
 const full='journey-media/'+uid+'/'+id+'/stops/'+sid+'/'+uid+'.full-v1.jpg';const thumb=full.replace('.full-v1.jpg','.thumb-512-v1.jpg');const photos={candidates:{[sid]:{uri:'file:///candidate.jpg'}},previews:{[full]:'https://signed.test/full-memory',[thumb]:'https://signed.test/thumb-memory'}};
 const h=screenHarness({...privateForm(),stops:[memoryRow(sid,'QA memory',{latitude:8,longitude:76,photoPath:full})]},photos);let tree=h.render();let row=all(tree,'MemoryRow')[0],map=all(tree,'DraftMap')[0];assert.equal(row.props.photo,'file:///candidate.jpg');assert.equal(row.props.photoThumbnail,null);assert.equal(JSON.parse(map.props.thumbnails)[sid],null);assert.equal(JSON.parse(map.props.photos)[sid],'file:///candidate.jpg');const geometry=map.props.geometry;
 delete photos.candidates[sid];tree=h.render();row=all(tree,'MemoryRow')[0];map=all(tree,'DraftMap')[0];assert.equal(row.props.photo,'https://signed.test/full-memory');assert.equal(row.props.photoThumbnail,'https://signed.test/thumb-memory');assert.equal(JSON.parse(map.props.thumbnails)[sid],'https://signed.test/thumb-memory');assert.equal(JSON.parse(map.props.photos)[sid],'https://signed.test/full-memory');assert.equal(map.props.geometry,geometry);
 row.props.onEdit();tree=h.render();assert.equal(all(tree,'MemoryEditorSheet')[0].props.photoControl.props.savedUri,'https://signed.test/full-memory');assert.equal(h.writes.length,0);
});


test('cover popup retains local controls without writes, disables publish and closes without saving',()=>{
 const state={candidates:{cover:{uri:'file:///cover.jpg'}}};
 const h=screenHarness({...privateForm(),stops:[memoryRow(sid,'Located',{latitude:0,longitude:0})]},state);let tree=h.render();
 assert.equal(all(tree,'PhotoField').length,0);assert.equal(all(tree,'SwipeAction')[0].props.active,true);
 all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Edit cover photo').props.onPress();tree=h.render();
 assert.equal(all(tree,'SwipeAction')[0].props.active,false);assert.equal(all(tree,'DraftMap')[0].props.active,false);
 assert.equal(all(tree,'PhotoField')[0].props.candidate.uri,'file:///cover.jpg');
 all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Close cover photo options').props.onPress();tree=h.render();
 assert.equal(all(tree,'PhotoField').length,0);assert.equal(all(tree,'SwipeAction')[0].props.active,true);
 assert.equal(state.candidates.cover.uri,'file:///cover.jpg');assert.equal(h.writes.length,0);assert.equal(h.uploads.length,0);
 state.busyKey='cover';tree=h.render();assert.equal(all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Edit cover photo').props.disabled,true);
});
test('publish confirmation calls current save once and ordinary failures reenable while uncertain stays blocked',async()=>{
 for(const ambiguous of [false,true]){
 const h=screenHarness({...privateForm(),stops:[memoryRow(sid,'Located',{latitude:0,longitude:0,photoPath:'journey-media/raw/stop.png'})]});let tree=h.render();
 const confirmation=all(tree,'SwipeAction')[0];h.setFailure(true,ambiguous);
 confirmation.props.onComplete();confirmation.props.onComplete();tree=h.render();assert.equal(h.writes.length,1);assert.equal(h.writes[0].status,'published');assert.equal(all(tree,'SwipeAction')[0].props.active,false);
 await tick();tree=h.render();assert.equal(all(tree,'SwipeAction')[0].props.active,!ambiguous);assert.equal(h.writes.length,1);
 assert.ok(all(tree,'Text').some(n=>String(n.props.children).includes('changed')));
 }
});


test('first-stop CTA opens one existing memory buffer with no write, and stale modal/focus callbacks are inert',()=>{
 const h=screenHarness(privateForm());let tree=h.render();const cta=all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Add your first stop');
 assert.equal(all(tree,'SwipeAction').length,0);assert.ok(all(tree,'Text').some(n=>n.props.children==='Add a stop to start building your journey.'));
 cta.props.onPress();cta.props.onPress();tree=h.render();const sheet=all(tree,'MemoryEditorSheet')[0];assert.equal(sheet.props.isNew,true);assert.equal(sheet.props.value.name,'');
 cta.props.onPress();tree=h.render();assert.equal(all(tree,'MemoryEditorSheet')[0].props.value,sheet.props.value);assert.equal(h.writes.length,0);assert.equal(h.uploads.length,0);
 all(tree,'MemoryEditorSheet')[0].props.onClose();tree=h.render();
 all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Edit cover photo').props.onPress();tree=h.render();cta.props.onPress();tree=h.render();assert.equal(all(tree,'MemoryEditorSheet').length,0);
 all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Close cover photo options').props.onPress();tree=h.render();h.blur();cta.props.onPress();tree=h.render();assert.equal(all(tree,'MemoryEditorSheet').length,0);assert.equal(h.writes.length,0);
});
test('empty onboarding guards preparation and ambiguous-save state while secondary private save remains available',async()=>{
 const photos={busyKey:'cover'};const h=screenHarness(privateForm(),photos);let tree=h.render();let cta=all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Add your first stop');assert.equal(cta.props.disabled,true);cta.props.onPress();tree=h.render();assert.equal(all(tree,'MemoryEditorSheet').length,0);
 photos.busyKey=null;tree=h.render();cta=all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Add your first stop');assert.equal(cta.props.disabled,false);
 h.setFailure(true,true);all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Save Draft').props.onPress();await tick();tree=h.render();assert.equal(all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Add your first stop').props.disabled,true);cta.props.onPress();tree=h.render();assert.equal(all(tree,'MemoryEditorSheet').length,0);assert.equal(h.writes.length,1);assert.equal(h.uploads.length,0);
});

test('Journey Buddy uses the actual guarded memory buffer, never writes on opening and advertises only loaded editable drafts',()=>{
 const registrations=[];const h=screenHarness(privateForm(),{},registrations);let tree=h.render();
 assert.equal(registrations.at(-1).state.canAddMemory,true);const open=registrations.at(-1).actions.addMemory;
 open();open();tree=h.render();assert.equal(all(tree,'MemoryEditorSheet').length,1);assert.equal(h.writes.length,0);assert.equal(h.uploads.length,0);
 assert.equal(registrations.at(-1).state.suppressed,true);all(tree,'MemoryEditorSheet')[0].props.onClose();tree=h.render();
 h.blur();open();tree=h.render();assert.equal(all(tree,'MemoryEditorSheet').length,0);assert.equal(h.writes.length,0);
 const setup=[];screenHarness(undefined,{},setup).render();assert.equal(setup.at(-1).state.canAddMemory,false,'Quick Start must save a draft explicitly first');
 const photos={busyKey:'cover'},busy=[];const pending=screenHarness(privateForm(),photos,busy);pending.render();
 assert.equal(busy.at(-1).state.suppressed,true);busy.at(-1).actions.addMemory();assert.equal(all(pending.render(),'MemoryEditorSheet').length,0);
});
test('R3: editor offers device-only recovery; Restore refills unsaved edits without saving and a save clears the copy',async()=>{
  const recovery=load('src/lib/create/recovery.ts',{}),key=recovery.recoveryKey(uid,id);
  const initial={...model.newForm(id),title:'Saved',destination:place,traveler:'solo',updatedAt:'2026-10-14T10:00:00Z',stops:[{id:sid,name:'Beach',description:'',latitude:1,longitude:1,mapboxId:null,photoPath:null,day:'',rating:''}]};
  const data=new Map([[key,JSON.stringify(recovery.buildSnapshot(uid,{...initial,title:'Recovered title',stops:[{...initial.stops[0],description:'Unsaved words'}]},null,true,Date.now()))]]);
  const storage={getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{data.set(k,v);},removeItem:async k=>{data.delete(k);},getAllKeys:async()=>[...data.keys()]};
  const h=screenHarness(initial,{},[],storage);let tree=h.render();await new Promise(setImmediate);await new Promise(setImmediate);tree=h.render();
  const prompt=h.alerts.find(a=>a[0]==='Restore unsaved changes?');assert.ok(prompt);assert.match(prompt[1],/New photos that weren’t saved can’t be restored/);
  tree=h.render();assert.equal(all(tree,'MemoryDeck')[0].props.title,'Saved','Nothing restored until the user chooses');
  prompt[2].find(b=>b.text==='Restore').onPress();tree=h.render();
  assert.equal(all(tree,'MemoryDeck')[0].props.title,'Recovered title');assert.equal(all(tree,'MemoryDeck')[0].props.stops[0].description,'Unsaved words');
  assert.equal(all(tree,'MemoryDeck')[0].props.status,'Unsaved changes');assert.equal(h.writes.length,0,'Restore never saves');
  assert.ok(data.has(key));
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Save Draft').props.onPress();await new Promise(setImmediate);await new Promise(setImmediate);
  assert.equal(h.writes.length,1);assert.equal(h.writes[0].title,'Recovered title');assert.equal(h.writes[0].updated_at,initial.updatedAt);
  assert.equal(data.has(key),false,'A successful save removes the recovery copy');
});
test('R3: Discard in the leave alert also removes the recovery copy',async()=>{
  const recovery=load('src/lib/create/recovery.ts',{}),key=recovery.recoveryKey(uid,id);
  const initial={...model.newForm(id),title:'Saved',destination:place,traveler:'solo',updatedAt:'2026-10-14T10:00:00Z',stops:[]};
  const data=new Map([[key,JSON.stringify(recovery.buildSnapshot(uid,{...initial,title:'Recovered'},null,false,Date.now()))]]);
  const storage={getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{data.set(k,v);},removeItem:async k=>{data.delete(k);},getAllKeys:async()=>[...data.keys()]};
  const h=screenHarness(initial,{},[],storage);h.render();await new Promise(setImmediate);await new Promise(setImmediate);h.render();
  h.alerts.find(a=>a[0]==='Restore unsaved changes?')[2].find(b=>b.text==='Restore').onPress();h.render();h.render();
  assert.equal(h.prevented().enabled,true);h.prevented().callback({data:{action:'leave'}});
  h.alerts.find(a=>a[0]==='Discard unsaved changes?')[2].find(b=>b.text==='Discard').onPress();await new Promise(setImmediate);
  assert.deepEqual(h.dispatches,['leave']);assert.equal(data.has(key),false);assert.equal(h.writes.length,0);
});
test('R3: Restore is ignored while a photo is preparing; the recovery copy stays',async()=>{
  const recovery=load('src/lib/create/recovery.ts',{}),key=recovery.recoveryKey(uid,id);
  const initial={...model.newForm(id),title:'Saved',destination:place,traveler:'solo',updatedAt:'2026-10-14T10:00:00Z',stops:[]};
  const data=new Map([[key,JSON.stringify(recovery.buildSnapshot(uid,{...initial,title:'Recovered'},null,false,Date.now()))]]);
  const storage={getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{data.set(k,v);},removeItem:async k=>{data.delete(k);},getAllKeys:async()=>[...data.keys()]};
  const photoState={},h=screenHarness(initial,photoState,[],storage);h.render();await new Promise(setImmediate);await new Promise(setImmediate);h.render();
  photoState.busyKey='cover';h.alerts.find(a=>a[0]==='Restore unsaved changes?')[2].find(b=>b.text==='Restore').onPress();const tree=h.render();
  assert.equal(all(tree,'MemoryDeck')[0].props.title,'Saved');assert.equal(h.writes.length,0);assert.ok(data.has(key));
});

test('U8 memory intent continues into the private draft after explicit quick-start save', async () => {
  const h = screenHarness(undefined, {}, [], null, 'memory');
  let setup = all(h.render(), 'QuickJourneySetup')[0];
  setup.props.onDestination(place); setup = all(h.render(), 'QuickJourneySetup')[0];
  setup.props.onChange({traveler:'solo'}); setup = all(h.render(), 'QuickJourneySetup')[0];
  assert.equal(h.writes.length, 0, 'Guidance itself never saves');
  setup.props.onStart(); await new Promise(setImmediate);
  assert.equal(h.writes.length, 1);
  assert.deepEqual(h.routes.at(-1), {pathname:'/create',params:{draft:id,guide:'memory'}});
});

test('U8 saved-draft guidance describes adding a stop without inventing an Add memory control', () => {
  const h = screenHarness(privateForm(), {}, [], null, 'memory');
  const hint = all(h.renderEntry(), 'FirstOutcomeHint')[0];
  assert.equal(hint.props.title, 'Add your first memory');
  assert.match(hint.props.children, /^Add a stop to your journey\./);
  assert.doesNotMatch(hint.props.children, /Open Add memory/);
  assert.equal(h.writes.length, 0);
});
