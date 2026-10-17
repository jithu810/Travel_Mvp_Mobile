import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function load(file,modules={},timers=globalThis){const exports={};new Function('require','exports','setTimeout','clearTimeout',ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>{assert.ok(id in modules,id);return modules[id];},exports,timers.setTimeout,timers.clearTimeout);return exports;}
const discovery=load('src/lib/discovery/model.ts',{'../../types/journey':load('src/types/journey.ts')});
const sharing=load('src/lib/social/sharing.ts',{'../discovery/model':discovery});
const model=load('src/lib/social/share-artwork.ts',{'../discovery/model':discovery,'./sharing':sharing});
const journey={id:'11111111-1111-4111-8111-111111111111',title:'The coast',destination:'Kerala',cover:'https://example.test/cover.jpg',stops:[{id:'first',name:'One',photo:'https://example.test/one.jpg'},{id:'second',name:'Two',photo:null},{id:'third',name:'Three',photo:'https://example.test/three.jpg'}]};
test('share snapshots exactly the selected third photo and valid public URL, never cover or first-photo fallback',()=>{
 const artwork=model.createShareArtwork(journey,'third','https://example.test');assert.equal(artwork.photo,journey.stops[2].photo);assert.equal(artwork.memoryId,'third');assert.equal(artwork.url,'https://example.test/journey/'+journey.id);
 assert.equal(model.createShareArtwork(journey,'second','https://example.test').photo,null);assert.equal(model.createShareArtwork(journey,'unknown','https://example.test').photo,null);
 assert.equal(model.createShareArtwork(journey,'third','http://localhost'),null);
 const changed={...journey,stops:journey.stops.map(s=>({...s}))};const snapshot=model.createShareArtwork(changed,'third','https://example.test');changed.stops[2].photo='https://example.test/new.jpg';assert.equal(snapshot.photo,journey.stops[2].photo);
});
test('image capture creates 1080x1920 PNG locally and shares only the file; retains recent files for receivers',async()=>{
 const captures=[],shares=[],released=[];let n=0;
 const {shareArtworkImage}=load('src/lib/social/share-image.ts',{'react-native-view-shot':{captureRef:async(view,options)=>{captures.push({view,options});return 'file:///capture'+(++n)+'.png';},releaseCapture:uri=>released.push(uri)},'expo-sharing':{isAvailableAsync:async()=>true,shareAsync:async(uri,options)=>shares.push({uri,options})}});
 for(let i=0;i<4;i++)await shareArtworkImage('view',()=>true);
 assert.equal(captures[0].options.width,1080);assert.equal(captures[0].options.height,1920);assert.equal(captures[0].options.format,'png');assert.equal(shares[0].options.mimeType,'image/png');assert.ok(!('message' in shares[0].options));assert.deepEqual(released,['file:///capture1.png']);
});
test('unsupported sharing and an inactive screen never capture or open another app',async()=>{
 let captures=0,shares=0;
 const {shareArtworkImage}=load('src/lib/social/share-image.ts',{'react-native-view-shot':{captureRef:async()=>{captures++;return 'file:///x';},releaseCapture(){}},'expo-sharing':{isAvailableAsync:async()=>false,shareAsync:async()=>shares++}});
 await shareArtworkImage('view',()=>false);await assert.rejects(shareArtworkImage('view',()=>true),/unavailable/);assert.equal(captures,0);assert.equal(shares,0);
});
test('timed-out capture rejects, ignores late completion and releases its temporary image',async()=>{
 let timeout,resolve,shares=0;const released=[];
 const {shareArtworkImage}=load('src/lib/social/share-image.ts',{'react-native-view-shot':{captureRef:()=>new Promise(r=>resolve=r),releaseCapture:uri=>released.push(uri)},'expo-sharing':{isAvailableAsync:async()=>true,shareAsync:async()=>shares++}},{setTimeout:fn=>{timeout=fn;return 1;},clearTimeout(){}});
 const pending=shareArtworkImage('view',()=>true);await new Promise(setImmediate);timeout();await assert.rejects(pending,/timed out/);resolve('file:///late.png');await new Promise(setImmediate);assert.equal(shares,0);assert.deepEqual(released,['file:///late.png']);
});
function uiHarness(){let cursor=0;const slots=[];return {hooks:{useState:v=>{const i=cursor++;if(!(i in slots))slots[i]=v;return [slots[i],v=>{slots[i]=v;}];},useRef:v=>{const i=cursor++;return slots[i]??={current:v};},useCallback:fn=>fn},render:fn=>{cursor=0;return fn();}};}
const all=(tree,type)=>!tree||typeof tree!=='object'?[]:[...(tree.type===type?[tree]:[]),...[tree.props?.children].flat(Infinity).flatMap(n=>all(n,type))];
test('Share tap freezes the visible memory and compact Like shows zero and authoritative updates',()=>{
 const h=uiHarness();const social={auth:{session:{},loading:false},state:{liked:false,saved:false,likes:0},act(){this.state={liked:true,saved:false,likes:1};},busy:null};
 const native={View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{create:x=>x},Platform:{OS:'android'}};
 const {SocialActions}=load('src/components/journey/social-actions.tsx',{'react':h.hooks,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'react-native':native,'expo-router':{useRouter:()=>({}),useFocusEffect(){}},'@/hooks/action-intent':{useActionIntent:()=>({})},'./story-sheet':{StorySheet:'StorySheet'},'./journey-share-sheet':{JourneyShareSheet:'JourneyShareSheet'},'@/lib/social/share-artwork':model,'@/components/discovery/ui':{colors:{}},'@/hooks/use-journey-social':{useJourneySocial:()=>social},'@/lib/social/sharing':sharing});
 const previous=process.env.EXPO_PUBLIC_SITE_URL;process.env.EXPO_PUBLIC_SITE_URL='https://example.test';
 try{let selected='third';const render=()=>h.render(()=>SocialActions({journey,compact:true,selectedMemoryId:selected}));let tree=render();
 const label=()=>all(tree,'Text').map(n=>[n.props.children].flat().join('')).join('|');assert.match(label(),/Like.*0/);
 all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Like journey').props.onPress();tree=render();assert.match(label(),/Like.*1/);
 all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Share public journey').props.onPress();selected='first';tree=render();assert.equal(all(tree,'JourneyShareSheet')[0].props.artwork.memoryId,'third');
 social.state=null;tree=render();assert.ok(!label().includes('Like · 1'));
 }finally{if(previous===undefined)delete process.env.EXPO_PUBLIC_SITE_URL;else process.env.EXPO_PUBLIC_SITE_URL=previous;}
});
