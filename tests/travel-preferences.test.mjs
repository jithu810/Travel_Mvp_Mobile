import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
function load(file, modules = {}) {
  const exports = {};
  new Function('require','exports',ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>{assert.ok(name in modules,name);return modules[name];},exports);
  return exports;
}
const model = load('src/lib/buddy/travel-preferences.ts');
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const choice={interests:['Nature','Food'],pace:'Relaxed'};
const record=(owner=A,value=choice)=>JSON.stringify({version:1,userId:owner,...value});
const tick=()=>new Promise(setImmediate);
function storage(){const data=new Map();return {data,getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{data.set(k,v);},removeItem:async k=>{data.delete(k);}};}
test('B2 strict finite versioned parsing rejects corrupt, oversized, other-account and inferred/unknown fields',()=>{
  assert.deepEqual(model.parseTravelPreferences(record(),A),choice);
  for(const raw of ['{','x'.repeat(1025),record(B),record(A,{interests:['Nature','Nature'],pace:null}),record(A,{interests:['Tracking'],pace:null}),record(A,{interests:[],pace:'Fast'}),JSON.stringify({...JSON.parse(record()),version:2}),JSON.stringify({...JSON.parse(record()),gps:[0,0]})])assert.deepEqual(model.parseTravelPreferences(raw,A),model.neutralTravelPreferences);
  assert.equal(model.validPreferenceOwner('guest'),false);
});
test('B2 save, reload and Forget remain per user on this phone and sign-out never removes another record',async()=>{
 const port=storage(),store=model.createTravelPreferences(port);await store.select(A);assert.equal(await store.save(A,choice),true);
 await store.select(null);assert.deepEqual(store.get().value,model.neutralTravelPreferences);assert.ok(port.data.has(model.travelPreferenceKey(A)));
 await store.select(B);assert.deepEqual(store.get().value,model.neutralTravelPreferences);assert.equal(await store.save(A,choice),false);
 await store.save(B,{interests:['Culture'],pace:'Packed'});await store.select(A);assert.deepEqual(store.get().value,choice);
 assert.equal(await store.forget(A),true);assert.equal(port.data.has(model.travelPreferenceKey(A)),false);assert.ok(port.data.has(model.travelPreferenceKey(B)));
 await store.select(A,true);assert.deepEqual(store.get().value,model.neutralTravelPreferences);
});
test('B2 late read A cannot publish after B selection or guest; queued save cannot recreate after Forget',async()=>{
 const port=storage();let release;port.getItem=()=>new Promise(resolve=>{release=resolve;});const store=model.createTravelPreferences(port);
 const loadA=store.select(A);await tick();const guest=store.select(null);release(record());await loadA;await guest;assert.equal(store.get().owner,null);assert.deepEqual(store.get().value,model.neutralTravelPreferences);
 port.getItem=async()=>null;await store.select(A);let writeRelease;port.setItem=async(k,v)=>{await new Promise(resolve=>{writeRelease=resolve;});port.data.set(k,v);};
 const save=store.save(A,choice);await tick();const forget=store.forget(A);writeRelease();await save;await forget;assert.equal(port.data.has(model.travelPreferenceKey(A)),false);assert.deepEqual(store.get().value,model.neutralTravelPreferences);
});
test('B2 failed load/save/forget are visible, never claim success, retry retains authoritative data',async()=>{
 const port=storage(),store=model.createTravelPreferences(port);port.getItem=async()=>{throw Error('disk');};await store.select(A);assert.equal(store.get().loaded,false);assert.match(store.get().error,/load/);assert.equal(await store.save(A,choice),false);
 port.getItem=async()=>null;await store.retry(A);port.setItem=async()=>{throw Error('disk');};assert.equal(await store.save(A,choice),false);assert.equal(store.get().message,null);assert.match(store.get().error,/save/);
 port.setItem=async(k,v)=>{port.data.set(k,v);};assert.equal(await store.save(A,choice),true);port.removeItem=async()=>{throw Error('disk');};assert.equal(await store.forget(A),false);assert.equal(store.get().message,null);assert.match(store.get().error,/forget/);assert.deepEqual(store.get().value,choice);
});
test('B2 hook synchronously masks loading, auth error and switches; stale callbacks cannot write across accounts',async()=>{
 const port=storage(),store=model.createTravelPreferences(port);let auth={loading:false,error:null,session:{user:{id:A}}};let slots=[],cursor=0,effects=[];
 const react={useMemo:(fn,deps)=>{const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i].deps[j]))slots[i]={deps,value:fn()};return slots[i].value;},useLayoutEffect:fn=>{fn();},useRef:initial=>{const i=cursor++;return slots[i]??={current:initial};},useEffect:fn=>{effects.push(fn);},useSyncExternalStore:(_,get)=>get()};
 const {useTravelPreferences}=load('src/hooks/use-travel-preferences.ts',{react,'@/hooks/session-context':{useSessionState:()=>auth},'@/lib/buddy/travel-preferences-store':{travelPreferences:store},'@/lib/buddy/travel-preferences':model});
 const render=(flush=true)=>{cursor=0;effects=[];const runHook=useTravelPreferences;const view=runHook();if(flush)effects.forEach(fn=>fn());return view;};
 render();await tick();let view=render();await view.save(choice);view=render();const stale=view;
 auth={...auth,loading:true};view=render(false);assert.equal(view.loaded,false);assert.deepEqual(view.value,model.neutralTravelPreferences);assert.equal(await stale.save(choice),false);
 auth={loading:false,error:null,session:{user:{id:B}}};view=render(false);assert.equal(view.loaded,false);assert.equal(await stale.forget(),false);render();await tick();view=render();assert.deepEqual(view.value,model.neutralTravelPreferences);
 auth={loading:false,error:'unavailable',session:{user:{id:B}}};view=render(false);assert.equal(view.available,false);assert.equal(view.loaded,false);
 auth={loading:false,error:null,session:{user:{id:A}}};render();await tick();assert.equal(await stale.forget(),false,'Old A callback stays stale even after returning to A');
});
test('B2 tips use only explicit options on Home/Search and promise no ranking or route changes',()=>{
 assert.match(model.travelPreferenceTip('/search',choice),/Nature, Food/);assert.match(model.travelPreferenceTip('/discover',choice),/tips only; search results and routes are unchanged/);
 assert.equal(model.travelPreferenceTip('/travel/id',choice),undefined);assert.equal(model.travelPreferenceTip('/account',choice),undefined);assert.equal(model.travelPreferenceTip('/search',model.neutralTravelPreferences),undefined);
});

test('B2 settings edits are explicit, Cancel drops changes, and save/Forget errors remain visible', async()=>{
 const jsx=(type,props)=>({type,props});const all=tree=>!tree||typeof tree!=='object'?[]:[tree,...[tree.props?.children].flat(Infinity).flatMap(all)];
 let slots=[],cursor=0;const react={useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];}};
 let saves=0,forgets=0;const p={owner:A,available:true,loaded:true,busy:false,value:choice,error:null,message:null,save:async value=>{saves++;p.error='Could not save preferences. Try again.';return false;},forget:async()=>{forgets++;p.error='Could not forget preferences. Try again.';return false;}};
 const {TravelPreferencesSettings}=load('src/components/buddy/travel-preferences-settings.tsx',{react,'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{Pressable:'Pressable',Text:'Text',View:'View',StyleSheet:{create:x=>x}},'@/hooks/use-travel-preferences':{useTravelPreferences:()=>p},'@/lib/buddy/travel-preferences':model,'@/components/discovery/ui':{colors:{}}});
 const parent=TravelPreferencesSettings();const editor=all(parent).find(n=>typeof n.type==='function'&&n.type.name==='PreferenceEditor');
 const render=()=>{cursor=0;return editor.type(editor.props);};const control=(tree,label)=>all(tree).find(n=>n.props?.label===label);
 let tree=render();control(tree,'Edit travel preferences').props.onPress();tree=render();control(tree,'Culture').props.onPress();control(tree,'Cancel preference edits').props.onPress();tree=render();assert.equal(saves,0);assert.equal(p.value.interests.includes('Culture'),false);
 control(tree,'Edit travel preferences').props.onPress();tree=render();control(tree,'Save on this phone').props.onPress();await tick();tree=render();assert.equal(saves,1);assert.ok(all(tree).some(n=>n.props?.accessibilityRole==='alert'));assert.ok(control(tree,'Cancel preference edits'),'Failure retains edits');
 control(tree,'Cancel preference edits').props.onPress();tree=render();control(tree,'Forget travel preferences').props.onPress();await tick();tree=render();assert.equal(forgets,1);assert.ok(all(tree).some(n=>n.props?.children==='Could not forget preferences. Try again.'));
});
