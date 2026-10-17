import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const jsx=(type,props)=>({type,props});
const native=Object.fromEntries(['View','Text','Image','Pressable','FlatList','ScrollView','Modal','ActivityIndicator','RefreshControl'].map(n=>[n,n]));
native.StyleSheet={create:s=>s};let width=360;native.useWindowDimensions=()=>({width,height:800});
const colors={ink:'#153E35',paper:'#F5F3EC',white:'#FFFFFF',line:'#DEE2D7',muted:'#65736A',green:'#708454',pale:'#E5EBD9'};
const ui={colors,ui:{},Action:'Action',Message:'Message',LoadingCards:'LoadingCards'};
function hooks(){let slots=[],cursor=0,effects=[];return {
  react:{useState:init=>{let i=cursor++;if(!(i in slots))slots[i]=typeof init==='function'?init():init;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef:init=>{let i=cursor++;return slots[i]??={current:init};},
    useCallback:fn=>fn,useEffect:(fn,deps)=>{let i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i][j])){slots[i]=deps;effects.push(fn);}}},
  render(fn){cursor=0;effects=[];const tree=fn();effects.forEach(f=>f());return tree;},
};}
function load(path,modules={},react=hooks().react){const exports={};const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('require','exports',code)(name=>name==='react'?react:name==='@/components/branded-loading'?{BrandedLoading:'BrandedLoading'}:name==='react/jsx-runtime'?{jsx,jsxs:jsx,Fragment:'Fragment'}:name==='react-native'?native:name.endsWith('.png')?1:name in modules?modules[name]:(()=>{throw Error(name);})(),exports);return exports;}
function all(tree,type){if(!tree||typeof tree!=='object')return [];return [...(tree.type===type?[tree]:[]),...[tree.props?.children].flat(Infinity).flatMap(t=>all(t,type))];}
const uid='22222222-2222-4222-8222-222222222222';const journey={id:'real',title:'Hill journey',destination:'Ponmudi',cover:'https://test/cover.jpg',durationDays:1,stops:[{},{}]};
function shared(routes=[]){return load('src/components/profile/profile-ui.tsx',{'expo-router':{useFocusEffect:()=>{},useRouter:()=>({canGoBack:()=>true,back:()=>routes.push('back'),push:r=>routes.push(r)})},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'@/components/discovery/ui':ui,'@/components/discovery/journey-photo':{JourneyPhoto:'JourneyPhoto'},'@/lib/discovery/model':{journeyFacts:j=>j.durationDays+' day · '+j.stops.length+' stops'}});}

test('reference profile composition retains real identity/avatar, owner-only functional edit and responsive touch targets',()=>{
  const routes=[],components=shared(routes);
  for(width of [320,360,393,412]){
    const tree=components.ProfileIdentity({name:'Real traveler',username:'real_user',bio:'Real bio',avatar:'https://test/avatar',count:1,owner:true});
    assert.equal(tree.props.style.flexDirection,'row');assert.equal(all(tree,'JourneyPhoto')[0].props.uri,'https://test/avatar');
    assert.ok(all(tree,'Text').some(n=>n.props.children==='Real bio'));assert.ok(all(tree,'Text').some(n=>[n.props.children].flat().join('')==='@real_user'));
    const button=all(tree,'Pressable')[0];assert.equal(button.props.disabled,undefined);assert.equal(typeof button.props.onPress,'function');button.props.onPress();assert.equal(routes.at(-1),'/profile/edit');assert.equal(button.props.style.minHeight,44);
    assert.equal(tree.props.children[0].props.style[1].width,width<360?72:88);
  }
  const visitor=components.ProfileIdentity({name:'Visitor',count:0});assert.equal(all(visitor,'Pressable').length,0);assert.equal(all(visitor,'JourneyPhoto').length,0);
  const tabs=components.ProfileTabs({selected:'published',onSelect(){}});assert.equal(all(tabs,'Pressable').length,1,'No private Drafts tab for a visitor');
  let selected;const ownerTabs=components.ProfileTabs({selected:'drafts',drafts:true,onSelect:v=>selected=v});all(ownerTabs,'Pressable')[0].props.onPress();assert.equal(selected,'published');
  assert.equal(all(ownerTabs,'Pressable')[1].props.accessibilityState.selected,true);
});

test('profile journey and draft cards retain their routes, truthful facts and photo fallbacks',()=>{
  const routes=[],components=shared(routes);const card=components.ProfileJourneyCard({journey});
  assert.equal(all(card,'JourneyPhoto')[0].props.uri,journey.cover);card.props.onPress();assert.deepEqual(routes.at(-1),{pathname:'/journey/[id]',params:{id:'real'}});
  assert.ok(all(card,'Text').some(n=>n.props.children==='1 day · 2 stops'));
  const draft=components.ProfileDraftCard({draft:{id:'private',title:'Real private draft'}});draft.props.onPress();assert.deepEqual(routes.at(-1),{pathname:'/create',params:{draft:'private'}});
  assert.equal(all(draft,'JourneyPhoto').length,0,'No fabricated cover for title-only draft projection');
  const header=components.ProfileHeader({onSettings:()=>routes.push('settings')});all(header,'Pressable')[0].props.onPress();assert.equal(routes.at(-1),'back');all(header,'Pressable')[1].props.onPress();assert.equal(routes.at(-1),'settings');
  assert.ok(all(header,'View').some(n=>n.props.accessibilityLabel==='Notifications, coming soon'));
});

function accountHarness(){const h=hooks(),routes=[],loaders=[];let auth={loading:false,session:{user:{id:uid,email:'private@example.test',user_metadata:{display_name:'Real owner'}}}},finish,fail=false,calls=0,cancels=0;
  const draftState={data:[{id:'draft',title:'Actual draft'}],refresh(){},retry(){},loading:false};const publishedState={data:{profile:null,journeys:[journey]},refresh(){},retry(){},loading:false};
  const components=Object.fromEntries(['ProfileHeader','ProfileIdentity','ProfileDraftCard','ProfileJourneyCard','ProfileTabs'].map(n=>[n,n]));components.profileStyles={};
  const modules={'expo-router':{useRouter:()=>({push:r=>routes.push(r)}),useFocusEffect:()=>{}},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'@/components/discovery/ui':ui,'@/components/profile/profile-ui':components,
    '@/hooks/session-context':{useSessionState:()=>auth},'@/hooks/action-intent':{useActionIntent:()=>({cancel(){cancels++;}})},
    '@/hooks/use-load':{useLoad:fn=>{loaders.push(fn);return loaders.length%2?draftState:publishedState;}},
    '@/lib/remix/queries':{loadPrivateDrafts:async()=>draftState.data},'@/lib/profile/queries':{loadPublicProfile:async()=>null,loadPublishedProfileJourneys:async()=>[journey]},
    '@/lib/profile/edit-queries':{loadOwnProfile:async()=>({id:uid,username:'real',displayName:'Real owner',bio:'',avatarPreview:null})},'@/lib/discovery/model':{safePhoto:()=>null},'@/lib/auth/queries':{signOutAccount:()=>{calls++;return new Promise((resolve,reject)=>{finish=()=>fail?reject(Error('failure')):resolve();});}}};
  const {default:Screen}=load('src/app/account.tsx',modules,h.react);
  return {render:()=>h.render(Screen),routes,loaders,draftState,publishedState,setAuth:v=>auth=v,setFail:v=>fail=v,finish:()=>finish(),calls:()=>calls,cancels:()=>cancels};
}
test('Account tabs preserve private draft entry, published cards, settings actions and guarded sign-out failure',async()=>{
  const h=accountHarness();let tree=h.render(),list=all(tree,'FlatList')[0];assert.equal(list.props.data[0].kind,'draft');
  const authoritative=await h.loaders.at(-1)(new AbortController().signal);assert.equal(authoritative.profile.username,'real');assert.equal(authoritative.profile.displayName,'Real owner');
  let header=list.props.ListHeaderComponent;assert.equal(all(header,'ProfileIdentity')[0].props.name,'Real owner');assert.equal(all(header,'ProfileIdentity')[0].props.count,1);
  all(header,'ProfileTabs')[0].props.onSelect('published');tree=h.render();list=all(tree,'FlatList')[0];assert.equal(list.props.data[0].kind,'published');assert.equal(list.props.renderItem({item:list.props.data[0]}).type,'ProfileJourneyCard');
  all(tree,'ProfileHeader')[0].props.onSettings();tree=h.render();assert.equal(all(tree,'Modal')[0].props.visible,true);
  const signOut=all(tree,'Action').find(n=>n.props.label==='Sign out');h.setFail(true);signOut.props.onPress();signOut.props.onPress();assert.equal(h.calls(),1);assert.equal(h.cancels(),1);
  tree=h.render();assert.equal(all(tree,'Action').find(n=>n.props.label==='Signing out…').props.disabled,true);h.finish();await new Promise(setImmediate);tree=h.render();assert.ok(all(tree,'Text').some(n=>n.props.accessibilityRole==='alert'));
  h.setFail(false);all(tree,'Action').find(n=>n.props.label==='Sign out').props.onPress();h.finish();await new Promise(setImmediate);assert.equal(all(h.render(),'Modal')[0].props.visible,false);
});
test('Account gates private content while signed out/loading and preserves draft failure/empty recovery',()=>{
  const h=accountHarness();h.setAuth({loading:true,session:null});assert.equal(all(h.render(),'FlatList').length,0);
  h.setAuth({loading:false,session:null});let tree=h.render();assert.equal(all(tree,'FlatList').length,0);all(tree,'Message')[0].props.retry();assert.equal(h.routes.at(-1),'/auth');
  h.setAuth({loading:false,session:{user:{id:uid,user_metadata:{}}}});h.draftState.data=[];h.draftState.error='Offline';tree=h.render();let list=all(tree,'FlatList')[0];assert.equal(list.props.ListEmptyComponent.props.body,'Offline');
  h.draftState.error=null;list=all(h.render(),'FlatList')[0];list.props.ListEmptyComponent.props.retry();assert.equal(h.routes.at(-1),'/create');
});
test('public Profile exposes only published data and gates owner tab navigation',()=>{
  const routes=[];let viewer=null,state={data:{profile:{id:uid,username:'real',displayName:'Actual creator',avatar:null,bio:'Bio'},journeys:[journey]}};
  const modules={'expo-router':{useFocusEffect:()=>{},useRouter:()=>({push:r=>routes.push(r)}),useLocalSearchParams:()=>({username:'real'})},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'@/components/discovery/ui':ui,
    '@/components/profile/profile-ui':{ProfileHeader:'ProfileHeader',ProfileIdentity:'ProfileIdentity',ProfileJourneyCard:'JourneyCard',ProfileTabs:'ProfileTabs',profileStyles:{}},
    '@/hooks/session-context':{useSessionState:()=>({session:viewer?{user:{id:viewer}}:null})},'@/hooks/use-load':{useLoad:()=>state},'@/lib/profile/queries':{loadPublicProfile(){}}};
  const {default:Screen}=load('src/app/profile/[username].tsx',modules);let tree=Screen(),list=all(tree,'FlatList')[0];let tabs=all(list.props.ListHeaderComponent,'ProfileTabs')[0];assert.equal(tabs.props.drafts,false);tabs.props.onSelect('drafts');assert.equal(routes.length,0);
  viewer=uid;list=all(Screen(),'FlatList')[0];tabs=all(list.props.ListHeaderComponent,'ProfileTabs')[0];assert.equal(tabs.props.drafts,true);tabs.props.onSelect('drafts');assert.equal(routes.at(-1),'/account');
  state={data:null,error:'Offline',retry(){}};assert.equal(all(Screen(),'Message')[0].props.body,'Offline');state={loading:true};assert.equal(all(Screen(),'BrandedLoading').length,1);
});
