import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
// Execute the actual dependency-free shared theme in the component harness.
const mobileTheme = {};
new Function('exports', ts.transpileModule(readFileSync('src/theme/mobile-theme.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mobileTheme);

function harness() {
  const slots=[]; let cursor=0,effects=[],serial=0;
  const timers=new Map();
  const react={
    useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
    useRef:value=>{const i=cursor++;return slots[i]??={current:value};},
    useCallback:(fn,deps)=>react.useMemo(()=>fn,deps),
    useMemo:(fn,deps)=>{const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i].deps[j]))slots[i]={deps,value:fn()};return slots[i].value;},
    useEffect:(fn,deps)=>{const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i].deps[j])){slots[i]?.cleanup?.();slots[i]={deps};effects.push(()=>{slots[i].cleanup=fn();});}},
  };
  return {react,timers,setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id),
    render(fn,arg){cursor=0;effects=[];const value=fn(arg);effects.forEach(fn=>fn());return value;},
    expire(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());},
    dispose(){slots.forEach(s=>s?.cleanup?.());},
  };
}
function load(file,h,modules={}) {
  const exports={};const jsx=(type,props)=>({type,props});
  const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','exports','setTimeout','clearTimeout',code)(name=>{ if (name === '@/theme/mobile-theme') return mobileTheme;
    if(name==='react')return h.react;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name.endsWith('.png'))return name;
    if(name in modules)return modules[name];throw Error(name);
  },exports,h.setTimeout,h.clearTimeout);return exports;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function all(tree,type){if(!tree||typeof tree!=='object')return [];return [...(tree.type===type?[tree]:[]),...[tree.props?.children].flat(Infinity).flatMap(n=>all(n,type))];}

test('initial focus refresh remains loading until essential data arrives; retained data stays visible during refresh and failures',async()=>{
  const h=harness(),requests=[];const loader=()=>{const d=deferred();requests.push(d);return d.promise;};
  const {useLoad}=load('src/hooks/use-load.ts',h);let state=h.render(useLoad,loader);assert.equal(state.loading,true);
  state.refresh();state=h.render(useLoad,loader);assert.equal(state.loading,true,'Focus refresh cannot reveal an empty page');
  requests[0].resolve(['obsolete']);await tick();assert.equal(h.render(useLoad,loader).data,null);
  requests[1].resolve(['ready']);await tick();state=h.render(useLoad,loader);assert.equal(state.loading,false);assert.deepEqual(state.data,['ready']);
  state.refresh();state=h.render(useLoad,loader);assert.equal(state.loading,false);assert.equal(state.refreshing,true);assert.deepEqual(state.data,['ready']);
  requests[2].reject(Error('Offline'));await tick();state=h.render(useLoad,loader);assert.equal(state.loading,false);assert.equal(state.error,'Offline');assert.deepEqual(state.data,['ready']);state.retry();state=h.render(useLoad,loader);assert.equal(state.loading,false);assert.deepEqual(state.data,['ready']);h.dispose();
});

test('transport ignoring cancellation still exits loading on deadline; late results cannot erase timeout and retry works',async()=>{
  const h=harness(),requests=[];const loader=()=>{const d=deferred();requests.push(d);return d.promise;};
  const {useLoad}=load('src/hooks/use-load.ts',h);h.render(useLoad,loader);h.expire();let state=h.render(useLoad,loader);
  assert.equal(state.loading,false);assert.match(state.error,/timed out/);
  requests[0].resolve(['late']);await tick();state=h.render(useLoad,loader);assert.equal(state.data,null);assert.match(state.error,/timed out/);
  state.retry();state=h.render(useLoad,loader);assert.equal(state.loading,true);requests[1].resolve([]);await tick();state=h.render(useLoad,loader);assert.equal(state.loading,false);assert.deepEqual(state.data,[]);h.dispose();
});

test('changing the loader hides previous owner data and an empty successful result does not replay loading',async()=>{
  const h=harness();const {useLoad}=load('src/hooks/use-load.ts',h);const first=()=>Promise.resolve([]),second=()=>new Promise(()=>{});
  h.render(useLoad,first);await tick();let state=h.render(useLoad,first);assert.equal(state.loading,false);state.refresh();state=h.render(useLoad,first);assert.equal(state.loading,false);
  state=h.render(useLoad,second);assert.equal(state.loading,true);assert.equal(state.data,null);h.dispose();assert.equal(h.timers.size,0);
});

test('startup overlay follows session readiness, expires safely and cleans its deadline without touching authentication',()=>{
  const h=harness();let loading=true;const {StartupLoading}=load('src/components/startup-loading.tsx',h,{'@/hooks/session-context':{useSessionState:()=>({loading})},'./branded-loading':{BrandedLoading:'BrandedLoading'}});
  assert.equal(h.render(StartupLoading).type,'BrandedLoading');loading=false;assert.equal(h.render(StartupLoading),null);assert.equal(h.timers.size,0);h.dispose();
  const slow=harness();loading=true;const component=load('src/components/startup-loading.tsx',slow,{'@/hooks/session-context':{useSessionState:()=>({loading})},'./branded-loading':{BrandedLoading:'BrandedLoading'}}).StartupLoading;
  slow.render(component);slow.expire();assert.equal(slow.render(component),null);assert.equal(loading,true,'Presentation timeout never changes auth state');slow.dispose();
});

test('branded loader uses bundled logo, respects motion preference/background and stops animations on unmount',async()=>{
  const h=harness(),events={};let started=0,stopped=0,removed=0;
  const native={StyleSheet:{create:s=>s,absoluteFillObject:{position:'absolute'}},View:'View',Image:'Image',Text:'Text',ActivityIndicator:'ActivityIndicator',
    AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:(name,fn)=>{events[name]=fn;return {remove:()=>removed++};}},
    AppState:{currentState:'active',addEventListener:(name,fn)=>{events[name]=fn;return {remove:()=>removed++};}},
    Animated:{View:'AnimatedView',Value:class {setValue(){}},timing:()=>({}),sequence:()=>({}),loop:()=>({start:()=>started++,stop:()=>stopped++})}};
  const {BrandedLoading}=load('src/components/branded-loading.tsx',h,{'react-native':native,'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'}});
  let tree=h.render(BrandedLoading,{});assert.equal(started,0);assert.equal(all(tree,'ActivityIndicator').length,0);
  assert.match(all(tree,'Image')[0].props.source,/assets\/journey-creator-logo.png$/);await tick();tree=h.render(BrandedLoading,{});assert.equal(started,1);assert.equal(all(tree,'ActivityIndicator').length,1);
  events.change('background');tree=h.render(BrandedLoading,{});assert.equal(stopped,1);assert.equal(all(tree,'ActivityIndicator').length,0);
  events.change('active');h.render(BrandedLoading,{});assert.equal(started,2);events.reduceMotionChanged(true);tree=h.render(BrandedLoading,{});assert.equal(stopped,2);assert.equal(all(tree,'ActivityIndicator').length,0);h.dispose();assert.equal(removed,2);
});
