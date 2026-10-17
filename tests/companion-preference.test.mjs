import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
function load(file,deps={},timers={setTimeout,clearTimeout}) {
  const exports={};
  const output=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('require','exports','setTimeout','clearTimeout',output)(name=>{assert.ok(name in deps,name);return deps[name];},exports,timers.setTimeout,timers.clearTimeout);
  return exports;
}
const model=load('src/lib/companion/model.ts');
const preference=load('src/lib/companion/preference.ts');
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
function fixture(storage,{flag='true',platform='android',native=true}={}) {
  const hooks=[],pending=[],timers=new Map();let index=0,id=0;
  const react={
    useState(initial){const i=index++;hooks[i]??={value:typeof initial==='function'?initial():initial};return [hooks[i].value,next=>{hooks[i].value=typeof next==='function'?next(hooks[i].value):next;}];},
    useRef(initial){const i=index++;hooks[i]??={value:{current:initial}};return hooks[i].value;},
    useCallback:fn=>fn,
    useEffect(fn,deps){const i=index++;const old=hooks[i];if(!old||!deps.every((v,j)=>v===old.deps[j]))pending.push({i,fn,deps,cleanup:old?.cleanup});},
  };
  const oldFlag=process.env.EXPO_PUBLIC_TRAVEL_COMPANION;
  if(flag==null)delete process.env.EXPO_PUBLIC_TRAVEL_COMPANION;else process.env.EXPO_PUBLIC_TRAVEL_COMPANION=flag;
  const hook=load('src/hooks/use-companion-preference.ts',{
    react,'react-native':{Platform:{OS:platform}},expo:{requireOptionalNativeModule:()=>{if(native==='throws')throw Error('native missing');return native?{}:null;}},
    '@react-native-async-storage/async-storage':storage,
    '@/lib/companion/model':model,'@/lib/companion/preference':preference,
  },{setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:i=>timers.delete(i)});
  const render=()=>{index=0;const value=hook.useCompanionPreference();pending.forEach(p=>p.cleanup?.());for(const p of pending)hooks[p.i]={deps:p.deps,cleanup:p.fn()};pending.length=0;return value;};
  const cleanup=()=>{hooks.forEach(h=>h.cleanup?.());if(oldFlag===undefined)delete process.env.EXPO_PUBLIC_TRAVEL_COMPANION;else process.env.EXPO_PUBLIC_TRAVEL_COMPANION=oldFlag;};
  return {render,cleanup,timers};
}
function memory(initial=null){let value=initial;return {getItem:async()=>value,setItem:async(_key,next)=>{value=next;},value:()=>value};}
function entry(enabled,platform='android'){
  const component=load('src/components/companion/travel-companion.native.tsx',{
    react:{Component:class {}},'react/jsx-runtime':{jsx:(type,props)=>({type,props})},
    'react-native':{Platform:{OS:platform},StyleSheet:{create:x=>x}},expo:{},
    '@/hooks/use-companion-motion':{},'@/hooks/use-companion-lifecycle':{},'@/lib/companion/model':model,
  });
  return component.TravelCompanion({enabled});
}
test('saved OFF mounts no companion at startup despite default ON; toggles stop immediately, restore, and survive restart',async()=>{
  const storage=memory('off'),f=fixture(storage);
  let current=f.render();assert.equal(current.enabled,false);assert.equal(entry(current.enabled),null);assert.equal(current.status,'loading');
  await flush();current=f.render();assert.equal(current.enabled,false);assert.equal(current.status,'ready');assert.equal(f.timers.size,0);
  current.setEnabled(true);current=f.render();assert.ok(entry(current.enabled));await flush();current=f.render();assert.equal(storage.value(),'on');
  let stopped=0;current.registerDisable(()=>stopped++);current.setEnabled(false);assert.equal(stopped,1,'Frames stopped before waiting for storage');
  current=f.render();assert.equal(current.enabled,false);assert.equal(entry(current.enabled),null);await flush();assert.equal(storage.value(),'off');
  f.cleanup();
  const restart=fixture(storage);assert.equal(restart.render().enabled,false);await flush();assert.equal(restart.render().enabled,false);restart.cleanup();
});
test('missing saved preference uses flag only as default; saved ON overrides false/unset flag and survives restart',async()=>{
  for(const flag of ['true','false',null]){
    const storage=memory(),f=fixture(storage,{flag});
    assert.equal(f.render().enabled,false);await flush();let current=f.render();assert.equal(current.enabled,flag==='true');
    current.setEnabled(true);await flush();assert.equal(f.render().enabled,true);assert.equal(storage.value(),'on');f.cleanup();
    const restarted=fixture(storage,{flag:'false'});assert.equal(restarted.render().enabled,false);await flush();assert.equal(restarted.render().enabled,true);restarted.cleanup();
  }
  assert.equal(await preference.createCompanionPreferenceStore(memory('invalid')).load(true),false);
});
test('storage read/write failure keeps Home usable and choice works in session without claiming persistence',async()=>{
  const f=fixture({getItem:async()=>{throw Error('read');},setItem:async()=>{throw Error('write');}});
  f.render();await flush();let current=f.render();assert.equal(current.enabled,false);assert.equal(current.status,'load-error');
  current.setEnabled(true);assert.ok(entry(f.render().enabled));await flush();current=f.render();assert.equal(current.enabled,true);assert.equal(current.status,'save-error');
  current.setEnabled(false);assert.equal(entry(f.render().enabled),null);await flush();assert.equal(f.render().status,'save-error');f.cleanup();
});
test('read timeout and unmount reject late results; unsupported platforms/builds cannot claim ON or touch storage',async()=>{
  let resolve;const f=fixture({getItem:()=>new Promise(r=>{resolve=r;}),setItem:async()=>{}});
  f.render();await flush();[...f.timers.values()][0]();let current=f.render();assert.equal(current.enabled,false);assert.equal(current.status,'load-error');
  current.setEnabled(true);await flush();resolve('off');await flush();assert.equal(f.render().enabled,true);f.cleanup();assert.equal(f.timers.size,0);
  let late;const disposed=fixture({getItem:()=>new Promise(r=>{late=r;}),setItem:async()=>{}});
  disposed.render();await flush();disposed.cleanup();late('on');await flush();assert.equal(disposed.timers.size,0);
  for(const options of [{platform:'ios'},{platform:'web'},{native:false},{native:'throws'}]){
    let reads=0,writes=0;const f=fixture({getItem:async()=>{reads++;return 'on';},setItem:async()=>writes++},options);
    let current=f.render();assert.equal(current.available,false);current.setEnabled(true);await flush();current=f.render();assert.equal(current.enabled,false);assert.equal(reads,0);assert.equal(writes,0);f.cleanup();
  }
});
test('rapid toggles serialize persistence; stale completion cannot replace the latest UI choice; remount reads after pending writes',async()=>{
  const pending=[],calls=[];let value='off';
  const storage={getItem:async()=>value,setItem:(_key,next)=>new Promise((resolve,reject)=>{calls.push(next);pending.push({resolve:()=>{value=next;resolve();},reject});})};
  const f=fixture(storage);f.render();await flush();let current=f.render();
  current.setEnabled(true);current=f.render();current.setEnabled(false);current=f.render();assert.equal(current.enabled,false);
  await flush();assert.deepEqual(calls,['on']);pending[0].resolve();await flush();assert.equal(f.render().enabled,false);assert.equal(f.render().status,'saving');assert.deepEqual(calls,['on','off']);
  pending[1].resolve();await flush();assert.equal(f.render().status,'ready');assert.equal(value,'off');f.cleanup();
  const store=preference.createCompanionPreferenceStore(storage);
  const first=store.save(true);first.catch(()=>{});const second=store.save(false);const restored=store.load(true);
  await flush();pending[2].reject(Error('old write'));await flush();assert.deepEqual(calls.slice(2),['on','off']);pending[3].resolve();
  await assert.rejects(first);await second;assert.equal(await restored,false);
  assert.equal(preference.COMPANION_PREFERENCE_KEY,'journey-creator:travel-companion:v1');
});
test('compact control is in normal flow, exposes ON/OFF and errors, and disables unsupported native builds',()=>{
  const jsx=(type,props)=>({type,props});
  const control=load('src/components/companion/companion-toggle.tsx',{
    'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{Platform:{OS:'android'},StyleSheet:{create:x=>x},View:'View',Text:'Text',Switch:'Switch'},
  });
  for(const enabled of [false,true]){
    let choice;const tree=control.CompanionToggle({enabled,available:true,status:'ready',onChange:value=>{choice=value;}});
    assert.equal(tree.props.style.position,undefined);assert.equal(tree.props.style.minHeight,44);
    const [label,state,toggle]=tree.props.children;assert.equal(label.props.children,'Travel Companion');assert.equal(state.props.children,enabled?'On':'Off');
    assert.equal(toggle.props.accessibilityLabel,'Travel Companion');assert.equal(toggle.props.value,enabled);assert.equal(toggle.props.disabled,false);
    toggle.props.onValueChange(!enabled);assert.equal(choice,!enabled);
  }
  for(const status of ['loading','save-error','load-error']){
    const tree=control.CompanionToggle({enabled:false,available:true,status,onChange:()=>{}});
    assert.equal(tree.props.children[2].props.disabled,status==='loading');assert.ok(tree.props.children[1].props.children);
  }
  const unavailable=control.CompanionToggle({enabled:true,available:false,status:'ready',onChange:()=>assert.fail()});
  assert.equal(unavailable.props.children[1].props.children,'Unavailable');assert.equal(unavailable.props.children[2].props.value,false);assert.equal(unavailable.props.children[2].props.disabled,true);
});
