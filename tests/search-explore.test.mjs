import { buddyGeometryStub } from './helpers/buddy-geometry-stub.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
function load(path, modules) {
  modules={'@/components/first-outcome-hint':{FirstOutcomeHint:'FirstOutcomeHint'},...modules};
  modules={'@/components/first-outcome-hint':{FirstOutcomeHint:'FirstOutcomeHint'},...modules};
  modules={'@/hooks/use-buddy-geometry':buddyGeometryStub,...modules};
  modules={'@/hooks/use-journey-buddy':{useBuddyScreen(){}},...modules};
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(readFileSync(path, 'utf8'), {compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS}}).outputText)(id => { assert.ok(id in modules, id); return modules[id]; }, exports);
  return exports;
}
const jsx = (type, props) => ({type, props});
const runtime = {jsx, jsxs: jsx};
const native = Object.fromEntries(['View','Text','Pressable','FlatList','TextInput','KeyboardAvoidingView','RefreshControl','Image'].map(x => [x,x]));
native.StyleSheet = {create: x => x}; native.Platform = {OS:'android'};
const all = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(all)];
function screen({ signedIn = false } = {}) {
  let view, cursor = 0;
  const routes = [];
  const slots = [];
  const rows = Array.from({length:19}, (_,i) => ({journey:{id:String(i),destination:i%2 ? 'Coast':'Hill'},creatorId:null}));
  let state = {data:rows, loading:false, refreshing:false, refresh(){},retry(){}};
  const component = load('src/app/search.tsx', {
    react: {useCallback:fn=>fn,useEffect(){},useRef:()=>({current:null}),useMemo:fn=>fn(),useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],x=>{slots[i]=typeof x==='function'?x(slots[i]):x;}];}},
    '@/components/discovery/compact-search-input':{CompactSearchInput:'TextInput'},'@/components/journey/journey-action-icon':{JourneyActionIcon:'Icon'},'@/hooks/session-context':{useSessionState:()=>({session:signedIn?{user:{id:'owner'},access_token:'token'}:null,loading:false})},'@/lib/social/saved-queries':{loadSavedJourneys:async()=>[]},
    'react/jsx-runtime':runtime,'react-native':native,'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
    'expo-router':{useLocalSearchParams:()=>({view}),useRouter:()=>({push:route=>routes.push(route)}),useFocusEffect(){}},'@/components/branded-loading':{BrandedLoading:'BrandedLoading'},
    '@/components/discovery/explore-tile':{ExploreTile:'ExploreTile'},'@/components/discovery/journey-card':{JourneyCard:'JourneyCard'},
    '@/components/discovery/ui':{colors:{},ui:{},ScreenHeader:'ScreenHeader',Message:'Message',LoadingCards:'LoadingCards'},
    '@/hooks/use-load':{useLoad:()=>state},'@/lib/discovery/queries':{invalidatePublicJourneys(){},loadDiscoveryEntries(){}},'@/hooks/use-discovery-viewer':{useDiscoveryViewer:()=>({pending:false,id:null})},
    '@/lib/discovery/model':{hideViewerJourneys:rows=>rows.map(r=>r.journey),discoveryJourneys:rows=>rows.map(r=>r.journey),searchJourneys:(rows,q)=>rows.filter(x=>x.destination.includes(q))},
  }).default;
  return {routes,render(){cursor=0;return all(component());},view(v){view=v;},state(s){state={...state,...s};}};
}
test('Search uses three columns, all 19 results, no title/back/place chips; Story retains its independent list',()=>{
  const s=screen();let tree=s.render();let list=tree.find(n=>n.type==='FlatList');
  assert.equal(list.props.numColumns,3);assert.equal(list.props.data.length,19);assert.equal(list.props.initialNumToRender,4);assert.equal(list.props.maxToRenderPerBatch,2);assert.equal(list.props.windowSize,3);
  assert.equal(list.props.renderItem({item:list.props.data[18]}).type,'ExploreTile');
  assert.ok(!tree.some(n=>n.type==='ScreenHeader'));
  assert.ok(!all(list.props.ListHeaderComponent).some(n=>n.type==='Pressable'));
  tree.find(n=>n.type==='TextInput').props.onChangeText('Coast');
  assert.equal(s.render().find(n=>n.type==='FlatList').props.data.length,9);
  s.view('stories');tree=s.render();list=tree.find(n=>n.type==='FlatList');assert.equal(list.props.numColumns,1);assert.equal(list.props.initialNumToRender,undefined);assert.equal(list.props.windowSize,undefined);assert.equal(list.props.data.length,19);assert.equal(list.props.renderItem({item:list.props.data[0]}).type,'JourneyCard');assert.ok(tree.some(n=>n.type==='ScreenHeader'));
  s.view('search');assert.equal(s.render().find(n=>n.type==='TextInput').props.value,'Coast');
});
test('Search preserves refresh, stale-result error, retry and empty/clear-search behavior',()=>{
  const s=screen();let list=s.render().find(n=>n.type==='FlatList');assert.equal(list.props.refreshControl.type,'RefreshControl');
  s.state({error:'Offline'});list=s.render().find(n=>n.type==='FlatList');assert.ok(all(list.props.ListHeaderComponent).some(n=>n.props.title==='Couldn’t refresh results'));
  s.state({data:[]});list=s.render().find(n=>n.type==='FlatList');assert.equal(list.props.ListEmptyComponent.props.children.props.title,'Search took a detour');assert.equal(typeof list.props.ListEmptyComponent.props.children.props.retry,'function');
  s.state({error:null});let tree=s.render();const empty=tree.find(n=>n.type==='FlatList').props.ListEmptyComponent.props.children;assert.equal(empty.props.title,'No public journeys yet');empty.props.retry();assert.deepEqual(s.routes,['/create']);
  tree.find(n=>n.type==='TextInput').props.onChangeText('Unknown');list=s.render().find(n=>n.type==='FlatList');assert.equal(list.props.ListEmptyComponent.props.children.props.title,'No journeys match your search');list.props.ListEmptyComponent.props.children.props.retry();assert.equal(s.render().find(n=>n.type==='TextInput').props.value,'');
});

test('R6 empty Saved offers browsing; saved no-match clears only the query and retains Saved',()=>{
 const s=screen({signedIn:true});s.state({data:[]});let tree=s.render();
 tree.find(n=>n.props.accessibilityLabel==='Show saved journeys').props.onPress();
 const empty=()=>s.render().find(n=>n.type==='FlatList').props.ListEmptyComponent.props.children.props;
 assert.equal(empty().title,'No saved journeys yet');assert.equal(empty().action,'Browse journeys');
 tree=s.render();tree.find(n=>n.type==='TextInput').props.onChangeText('Missing');
 assert.equal(empty().title,'No saved journeys match');assert.match(empty().body,/only includes your saved public journeys/);
 empty().retry();assert.equal(s.render().find(n=>n.type==='TextInput').props.value,'');
 assert.ok(s.render().some(n=>n.props.accessibilityLabel==='Show all public journeys'));
 empty().retry();assert.ok(s.render().some(n=>n.props.accessibilityLabel==='Show saved journeys'));
 assert.deepEqual(s.routes,[],'Browsing is a local filter change, with no save or route write');
});
const artModules={'@/components/art/journey-art':{JourneyArt:'JourneyArt',StopArt:'StopArt'},'@/lib/art/journey-art':{artSeed:(id,stops)=>'seed:'+id+':'+(stops||[]).length}};
test('Explore tile navigates with source marker and falls back to journey art after image failure, recovering for a changed cover',()=>{
  let failed=null;const routes=[];
  const {ExploreTile}=load('src/components/discovery/explore-tile.tsx',{'react/jsx-runtime':runtime,react:{useState:()=>[failed,x=>{failed=x;}]},'expo-router':{useRouter:()=>({push:x=>routes.push(x)})},'react-native':native,'./journey-photo':{JourneyPhoto:'JourneyPhoto'},...artModules});
  const journey={id:'a',title:'Coast',destination:'Kerala',creatorName:'Owner',cover:'https://example.test/a.jpg',stops:[{id:'s'}]};
  const render=()=>ExploreTile({journey});let tree=render();tree.props.onPress();assert.deepEqual(routes[0],{pathname:'/journey/[id]',params:{id:'a',source:'search'}});assert.match(tree.props.accessibilityLabel,/Coast.*Kerala.*Owner/);
  const media=t=>t.props.children[0], caption=t=>all(t.props.children[1]).filter(n=>n.type==='Text').map(n=>n.props.children);
  assert.deepEqual(caption(tree),['Coast','Kerala'],'Photo tiles show title and destination');
  media(tree).props.onError();tree=render();const art=media(tree);assert.equal(art.type,'JourneyArt');assert.equal(art.props.accessibilityLabel,undefined,'Decorative inside the labelled tile');
  assert.equal(art.props.seed,'seed:a:1');assert.equal(art.props.destination,'Kerala');assert.equal(art.props.showDestination,undefined,'The shared caption replaces the art destination label');assert.equal(art.props.compact,true);
  assert.deepEqual(caption(tree),['Coast','Kerala'],'Art tiles share the same caption');assert.equal(tree.props.children[1].props.importantForAccessibility,'no-hide-descendants','The tile label already announces the caption');
  journey.cover='https://example.test/b.jpg';assert.equal(media(render()).type,'JourneyPhoto');journey.cover=null;assert.equal(media(render()).type,'JourneyArt');
  journey.title='  ';tree=render();assert.deepEqual(caption(tree),['Kerala'],'A blank title leaves only the destination');
});
test('Search source reaches the single existing social action owner',()=>{
  const source=readFileSync('src/app/journey/[id].tsx','utf8');assert.match(source,/saveFirst=\{params.source === 'search'\}/);assert.match(source,/<SocialActions[^>]*saveFirst=\{saveFirst\}/);assert.equal((source.match(/<SocialActions /g)||[]).length,1);
});
test('Bookmark moves first only when requested, preserving sign-in, selected, busy and retry handling',()=>{
  const calls=[], intents=[],routes=[];let social={auth:{session:null,loading:false},state:null,busy:null,act:x=>calls.push(x),load:()=>calls.push('load')};
  const {SocialActions}=load('src/components/journey/social-actions.tsx',{
    'react/jsx-runtime':runtime,react:{useState:x=>[x,()=>{}],useRef:x=>({current:x}),useCallback:x=>x},
    'react-native':{...native,ActivityIndicator:'ActivityIndicator',Share:{}},
    'expo-router':{useRouter:()=>({push:x=>routes.push(x)}),useFocusEffect(){}},
    '@/hooks/action-intent':{useActionIntent:()=>({begin:(id,action)=>{intents.push([id,action]);return true;}})},
    '@/hooks/use-journey-social':{useJourneySocial:()=>social},'./journey-action-icon':{JourneyActionIcon:'Icon'},'./journey-share-sheet':{JourneyShareSheet:'ShareSheet'},'./story-sheet':{StorySheet:'Sheet'},
    '@/components/discovery/ui':{colors:{}},'@/lib/social/share-artwork':{createShareArtwork(){}},'@/lib/social/sharing':{sharePublicJourney(){}},
  });
  const render=saveFirst=>all(SocialActions({journey:{id:'a',likes:0},layout:'rail',saveFirst}));
  const buttons=tree=>tree.filter(n=>n.type==='Pressable');let tree=render(true);assert.equal(buttons(tree)[0].props.accessibilityLabel,'Save journey');assert.equal(tree.filter(n=>n.type==='Icon'&&n.props.name==='bookmark').length,1);buttons(tree)[0].props.onPress();assert.deepEqual(intents,[['a','save']]);assert.deepEqual(routes,['/auth']);assert.deepEqual(calls,[]);
  assert.equal(buttons(render(false))[0].props.accessibilityLabel,'Like journey');
  social={...social,auth:{session:{},loading:false},state:{saved:true,liked:false,likes:0}};tree=render(true);assert.equal(buttons(tree)[0].props.accessibilityLabel,'Remove journey from Saved');assert.equal(buttons(tree)[0].props.accessibilityState.selected,true);buttons(tree)[0].props.onPress();assert.deepEqual(calls,['save']);
  social.busy='save';tree=render(true);assert.equal(buttons(tree)[0].props.disabled,true);assert.ok(tree.some(n=>n.type==='ActivityIndicator'));
  social.busy=null;social.error='Offline';tree=render(true);const sheet=tree.find(n=>n.type==='Sheet');all(sheet.props.children).find(n=>n.type==='Pressable').props.onPress();assert.deepEqual(calls,['save','load']);
});
function stateHarness() {
  const slots=[];let cursor=0,effects=[];
  const memo=(fn,deps)=>{const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i].deps[j]))slots[i]={value:fn(),deps};return slots[i].value;};
  const hooks={useMemo:memo,useCallback:(fn,deps)=>memo(()=>fn,deps),useRef:v=>{const i=cursor++;return slots[i]??={current:v};},useState:v=>{const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useEffect:(fn,deps)=>{const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i].deps[j])){slots[i]?.cleanup?.();const slot={deps};slots[i]=slot;effects.push(()=>{slot.cleanup=fn();});}}};
  return {hooks,render(fn){cursor=0;effects=[];const tree=fn();effects.forEach(fn=>fn());return all(tree);},dispose(){slots.forEach(s=>s?.cleanup?.());}};
}
const tick=()=>new Promise(setImmediate);
test('Saved mode isolates identities and public failures, keeps query, refreshes on focus/foreground, aborts stale reads and prompts guests',async()=>{
 const h=stateHarness(), requests=[],routes=[];let invalidations=0;let auth={session:null,loading:false,error:null},view,focus,foreground;
 let publicFailure=true;const publicLoader=async()=>{if(publicFailure)throw Error('Public offline');return [{journey:{id:'public',destination:'Coast'},creatorId:null}];};
 const useLoad=load('src/hooks/use-load.ts',{react:h.hooks}).useLoad;
 const component=load('src/app/search.tsx',{
  react:h.hooks,'react/jsx-runtime':runtime,'react-native':{...native,AppState:{addEventListener:(_name,fn)=>{foreground=fn;return {remove(){foreground=null;}};}}},
  'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'expo-router':{useRouter:()=>({push:x=>routes.push(x)}),useLocalSearchParams:()=>({view}),useFocusEffect:fn=>{focus=fn;}},
  '@/hooks/session-context':{useSessionState:()=>auth},'@/hooks/use-load':{useLoad},'@/lib/social/saved-queries':{loadSavedJourneys:(id,signal)=>new Promise(resolve=>requests.push({id,signal,resolve}))},
  '@/components/discovery/compact-search-input':{CompactSearchInput:'TextInput'},'@/components/journey/journey-action-icon':{JourneyActionIcon:'Icon'},'@/components/branded-loading':{BrandedLoading:'BrandedLoading'},'@/components/discovery/explore-tile':{ExploreTile:'ExploreTile'},'@/components/discovery/journey-card':{JourneyCard:'JourneyCard'},
  '@/components/discovery/ui':{colors:{},ui:{},ScreenHeader:'Header',Message:'Message',LoadingCards:'LoadingCards'},'@/lib/discovery/queries':{invalidatePublicJourneys(){invalidations++;},loadDiscoveryEntries:publicLoader},'@/hooks/use-discovery-viewer':{useDiscoveryViewer:()=>({pending:false,id:null})},'@/lib/discovery/model':{hideViewerJourneys:rows=>rows.map(r=>r.journey),discoveryJourneys:rows=>rows.map(r=>r.journey),searchJourneys:(rows,q)=>rows.filter(x=>x.destination.includes(q))},
 }).default;
 const render=()=>h.render(component),list=t=>t.find(n=>n.type==='FlatList'),toggle=t=>t.find(n=>n.props.accessibilityLabel==='Show saved journeys');
 try {
  render();await tick();let tree=render();toggle(tree).props.onPress();tree=render();await tick();tree=render();assert.equal(requests.length,0);assert.equal(list(tree).props.data.length,0);list(tree).props.ListEmptyComponent.props.children.props.retry();assert.deepEqual(routes,['/auth']);
  auth={session:{user:{id:'a'},access_token:'token-a'},loading:false,error:null};tree=render();assert.equal(requests.length,1);requests[0].resolve([{id:'old',destination:'Coast'}]);await tick();tree=render();assert.equal(list(tree).props.data[0].id,'old');tree.find(n=>n.type==='TextInput').props.onChangeText('Coast');tree=render();
  auth={session:{user:{id:'b'},access_token:'token-b'},loading:false,error:null};tree=render();assert.equal(list(tree).props.data.length,0);assert.equal(requests[0].signal.aborted,true);assert.equal(requests.at(-1).id,'b');
  requests.at(-1).resolve([{id:'new',destination:'Hill'},{id:'new-coast',destination:'Coast'}]);await tick();tree=render();assert.deepEqual(list(tree).props.data.map(x=>x.id),['new-coast']);
  focus();tree=render();assert.equal(invalidations,0);assert.equal(requests.at(-1).id,'b');requests.at(-1).resolve([]);await tick();tree=render();assert.equal(list(tree).props.data.length,0);
  foreground('active');tree=render();const stale=requests.at(-1);auth={...auth,loading:true};tree=render();assert.equal(list(tree).props.data.length,0);assert.equal(stale.signal.aborted,true);stale.resolve([{id:'leak',destination:'Coast'}]);await tick();tree=render();assert.equal(list(tree).props.data.length,0);
  auth={session:null,loading:false,error:null};tree=render();assert.match(list(tree).props.ListEmptyComponent.props.children.props.body,/Sign in/);view='stories';tree=render();assert.equal(list(tree).props.numColumns,1);assert.equal(list(tree).props.ListEmptyComponent.props.children.props.body,'Public offline');publicFailure=false;focus();render();await tick();tree=render();assert.equal(invalidations,0);assert.equal(list(tree).props.data[0].id,'public');foreground('active');render();await tick();tree=render();assert.equal(invalidations,0);list(tree).props.refreshControl.props.onRefresh();assert.equal(invalidations,1);render();await tick();tree=render();assert.equal(list(tree).props.data[0].id,'public');
 }finally{h.dispose();}
});
test('shared compact input retains Home pill geometry, real focus and consumer input callbacks',()=>{
 const theme={muted:'#888',surface:'#fff',shadow:'none',white:'#fff',text:'#111'};const {CompactSearchInput}=load('src/components/discovery/compact-search-input.tsx',{'react/jsx-runtime':runtime,'react-native':native,'@/theme/mobile-theme':{theme}});let focused=0,changed='';const tree=CompactSearchInput({inputRef:{current:{focus(){focused++;}}},focusLabel:'Focus journey search',value:'a',onChangeText:x=>{changed=x;},placeholder:'Search'});tree.props.onPress();assert.equal(focused,1);assert.equal(tree.props.style.minHeight,44);const surface=tree.props.children;assert.equal(surface.props.style.minHeight,34);assert.equal(surface.props.style.borderRadius,24);const input=all(tree).find(n=>n.type==='TextInput');input.props.onChangeText('b');assert.equal(changed,'b');assert.equal(input.props.style.fontSize,12);
});
test('Home and Explore prefer thumbnails, retry original once on failure then default; changed URLs recover',()=>{
 for(const kind of ['home','explore']) {
  const h=stateHarness();const journey={id:'a',title:'Coast',destination:'Kerala',creatorName:'Owner',cover:'https://example.test/full.jpg',coverThumbnail:'https://example.test/thumb.jpg',stops:[]};
  const modules={'react/jsx-runtime':runtime,react:{...h.hooks,memo:fn=>fn},'react-native':native,'expo-router':{useRouter:()=>({push(){}})},'./journey-photo':{JourneyPhoto:'JourneyPhoto'},'@/lib/discovery/model':{journeyFacts:()=>''},'./ui':{colors:{}},'./home-control-icon':{HomeControlIcon:'Icon'},...artModules};
  const exports=load(kind==='home'?'src/components/discovery/home-journey-card.tsx':'src/components/discovery/explore-tile.tsx',modules);
  const render=()=>h.render(()=>kind==='home'?exports.HomeJourneyCard({journey,expanded:false,width:300,onOpen(){},onLocate(){}}):exports.ExploreTile({journey}));
  const remote=tree=>tree.find(n=>n.type==='JourneyPhoto'||n.type==='Image'&&n.props.source?.uri);
  const uri=image=>image.props.uri||image.props.source.uri;
  let tree=render();assert.equal(uri(remote(tree)),journey.coverThumbnail);remote(tree).props.onError();tree=render();assert.equal(uri(remote(tree)),journey.cover);remote(tree).props.onError();tree=render();assert.equal(remote(tree),undefined);assert.equal(tree.filter(n=>n.type==='JourneyArt').length,1,'Both variants failed: journey art, never the stock photo');assert.equal(journey.cover,'https://example.test/full.jpg');
  journey.coverThumbnail='https://example.test/new-thumb.jpg';tree=render();assert.equal(uri(remote(tree)),journey.coverThumbnail);remote(tree).props.onError();journey.cover='https://example.test/new-full.jpg';tree=render();assert.equal(uri(remote(tree)),journey.cover);h.dispose();
 }
});


test('B3 saved prompt uses only settled visible Saved results and clears on uncertainty',()=>{
 const h=stateHarness();let buddy,auth={session:{user:{id:'a'},access_token:'token'},loading:false,error:null};
 const row={id:'saved',title:'Coast trip',destination:'Coast'};
 let saved={data:[row],loading:false,refreshing:false,error:null};
 const publicLoader=()=>{};
 const component=load('src/app/search.tsx',{
  react:h.hooks,'react/jsx-runtime':runtime,'react-native':{...native,AppState:{addEventListener:()=>({remove(){}})}},
  'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'expo-router':{useRouter:()=>({}),useLocalSearchParams:()=>({}),useFocusEffect(){}},
  '@/hooks/use-journey-buddy':{useBuddyScreen:s=>{buddy=s;}},'@/hooks/session-context':{useSessionState:()=>auth},
  '@/hooks/use-load':{useLoad:loader=>loader===publicLoader?{data:[],loading:false}:saved},'@/lib/social/saved-queries':{loadSavedJourneys(){}},
  '@/components/discovery/compact-search-input':{CompactSearchInput:'TextInput'},'@/components/journey/journey-action-icon':{JourneyActionIcon:'Icon'},'@/components/branded-loading':{BrandedLoading:'BrandedLoading'},'@/components/discovery/explore-tile':{ExploreTile:'ExploreTile'},'@/components/discovery/journey-card':{JourneyCard:'JourneyCard'},
  '@/components/discovery/ui':{colors:{},ui:{},Message:'Message'},'@/lib/discovery/queries':{loadDiscoveryEntries:publicLoader},'@/hooks/use-discovery-viewer':{useDiscoveryViewer:()=>({pending:false,id:null})},
  '@/lib/discovery/model':{hideViewerJourneys:()=>[],discoveryJourneys:()=>[],searchJourneys:(rows,q)=>rows.filter(r=>r.destination.includes(q))},
 }).default;
 const render=()=>h.render(component);
 try {
  let tree=render();assert.equal(buddy.savedJourney,undefined);
  tree.find(n=>n.props.accessibilityLabel==='Show saved journeys').props.onPress();tree=render();assert.deepEqual(buddy.savedJourney,{id:'saved',title:'Coast trip'});
  for(const patch of [{loading:true},{refreshing:true},{error:'Offline'},{data:[]}]){const before=saved;saved={...saved,...patch};render();assert.equal(buddy.savedJourney,undefined);saved=before;}
  for(const patch of [{loading:true},{error:'Unavailable'},{session:null}]){const before=auth;auth={...auth,...patch};render();assert.equal(buddy.savedJourney,undefined);auth=before;}
  tree=render();tree.find(n=>n.type==='TextInput').props.onChangeText('Missing');render();assert.equal(buddy.savedJourney,undefined);
 } finally {h.dispose();}
});
