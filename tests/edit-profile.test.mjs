import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
// Execute the actual dependency-free shared theme in the component harness.
const mobileTheme = {};
new Function('exports', ts.transpileModule(readFileSync('src/theme/mobile-theme.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mobileTheme);

const jsx=(type,props)=>({type,props});
function load(path,modules){const exports={};const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function('require','exports',code)(name=>name==='@/theme/mobile-theme'?mobileTheme:name==='@/components/branded-loading'?{BrandedLoading:'BrandedLoading'}:name==='react/jsx-runtime'?{jsx,jsxs:jsx,Fragment:'Fragment'}:name in modules?modules[name]:(()=>{throw Error(name);})(),exports);return exports;}
const uid='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333',uuid='11111111-1111-4111-8111-111111111111';
const discovery={isJourneyId:s=>/^[0-9a-f-]{36}$/.test(s),object:v=>v&&typeof v==='object'?v:null,safePhoto:s=>typeof s==='string'&&/^https:\/\//.test(s)?s:null};
const model=load('src/lib/profile/edit-model.ts',{'../discovery/model':discovery,'./model':{validHandle:s=>/^[a-zA-Z0-9_]{3,30}$/.test(s)&&s.toLowerCase()!=='edit'}});
const fields={displayName:'Real name',username:'real_user',bio:'Real bio',avatarPath:null};
const profile={...fields,id:uid,avatarPreview:null};
const photo={uri:'file:///prepared.jpg',width:100,height:100,size:12,mime:'image/jpeg'};
const signal=()=>new AbortController().signal;
function apiHarness(){let row={id:uid,display_name:'Original',username:'original',bio:'Before',avatar_path:null},viewer=uid,updateError=null,uploadError=false,signError=false,transport=false,missing=false;const calls=[];const bytes=new ArrayBuffer(12);
  const client={auth:{getUser:async()=>({data:{user:{id:viewer}},error:null})},from:table=>{
    let payload;const builder={select(){return builder;},eq(key,id){assert.equal(key,'id');assert.equal(id,uid);return builder;},abortSignal(s){assert.equal(s.aborted,false);return builder;},update(value){payload=value;return builder;},async maybeSingle(){calls.push({table,payload});if(!payload)return {data:row,error:null};if(updateError)return {data:null,error:updateError};if(missing)return {data:null,error:null};row={...row,...payload};if(transport)throw Error('lost response');return {data:row,error:null};}};return builder;
  },storage:{from:bucket=>({async upload(path,body,options){calls.push({bucket,path,body,options});return {data:{path},error:uploadError?{statusCode:403}:null};},async createSignedUrl(path){calls.push({bucket,signed:path});return {data:{signedUrl:signError?null:'https://test/avatar'},error:signError?{}:null};}})}};
  const queries=load('src/lib/profile/edit-queries.ts',{'../supabase/client':{supabase:client},'../create/id':{randomUUID:()=>uuid},'../create/photo-device':{readPreparedPhoto:async()=>bytes},'../create/photo-model':{MAX_PHOTO_BYTES:15*1024*1024,MAX_PHOTO_SIDE:2048},'./edit-model':model});
  return {queries,calls,bytes,setRow:v=>row=v,setViewer:v=>viewer=v,setUpdateError:v=>updateError=v,setUploadError:v=>uploadError=v,setSignError:v=>signError=v,setTransport:v=>transport=v,setMissing:v=>missing=v};
}
test('owner profile prefill preserves nullable values/raw avatar path and safely resolves a preview',async()=>{
  const h=apiHarness();h.setRow({id:uid,display_name:null,username:null,bio:null,avatar_path:'profile-avatars/'+uid+'/old.jpg'});
  let value=await h.queries.loadOwnProfile(uid,signal());assert.equal(value.displayName,'');assert.equal(value.username,'');assert.equal(value.bio,'');assert.equal(value.avatarPath,'profile-avatars/'+uid+'/old.jpg');assert.equal(value.avatarPreview,'https://test/avatar');
  h.setSignError(true);value=await h.queries.loadOwnProfile(uid,signal());assert.equal(value.avatarPreview,null);assert.ok(value.avatarPath);
  h.setViewer(other);await assert.rejects(()=>h.queries.loadOwnProfile(uid,signal()),/sign in/);
  assert.throws(()=>model.ownProfile({id:other},uid),/unavailable/);
});
test('text validation follows existing limits/username rules and saves only current owner supported columns',async()=>{
  for(const patch of [{username:''},{username:'edit'},{username:'bad name'},{displayName:'x'.repeat(81)},{bio:'x'.repeat(501)},{avatarPath:42}])assert.throws(()=>model.profileFields({...fields,...patch}),model.ProfileEditFailure);
  const h=apiHarness();const saved=await h.queries.updateOwnProfile({...fields,displayName:' New name ',username:' New_USER ',bio:' New bio '},uid,signal());
  assert.equal(saved.displayName,'New name');assert.equal(saved.username,'new_user');
  assert.deepEqual(h.calls.find(c=>c.payload).payload,{display_name:'New name',username:'new_user',bio:'New bio',avatar_path:null});
  assert.equal((await h.queries.loadOwnProfile(uid,signal())).username,'new_user','Reload reads the actual saved profile, not auth metadata');
});
test('avatar save uploads exact prepared bytes immutably to existing owner bucket and verifies it before row update',async()=>{
  const h=apiHarness();const path=await h.queries.uploadProfileAvatar(photo,uid,signal());assert.equal(path,'profile-avatars/'+uid+'/'+uuid+'.jpg');
  const upload=h.calls.find(c=>c.body);assert.equal(upload.bucket,'profile-avatars');assert.equal(upload.body,h.bytes);assert.equal(upload.options.upsert,false);assert.equal(upload.options.contentType,'image/jpeg');
  const saved=await h.queries.updateOwnProfile({...fields,avatarPath:path},uid,signal());assert.equal(saved.avatarPath,path);assert.equal(saved.avatarPreview,'https://test/avatar');
  await assert.rejects(()=>h.queries.updateOwnProfile({...fields,avatarPath:'profile-avatars/'+other+'/foreign.jpg'},uid,signal()),/own uploaded/);
  h.setSignError(true);await assert.rejects(()=>h.queries.updateOwnProfile({...fields,avatarPath:'profile-avatars/'+uid+'/missing.jpg'},uid,signal()),/verified/);
});
test('failed uploads never update profile; validation and current auth protect the upload path',async()=>{
  const h=apiHarness();h.setUploadError(true);await assert.rejects(()=>h.queries.uploadProfileAvatar(photo,uid,signal()),/upload failed/);assert.equal(h.calls.some(c=>c.payload),false);
  for(const patch of [{mime:'image/heic'},{size:0},{size:16*1024*1024},{width:3000}])await assert.rejects(()=>h.queries.uploadProfileAvatar({...photo,...patch},uid,signal()));
  h.setViewer(other);await assert.rejects(()=>h.queries.uploadProfileAvatar(photo,uid,signal()),/sign in/);
});
test('save conflicts/missing rows do not claim success, while transport failure after update is uncertain',async()=>{
  const h=apiHarness();h.setUpdateError({code:'23505'});await assert.rejects(()=>h.queries.updateOwnProfile(fields,uid,signal()),e=>e.message.includes('taken')&&!e.uncertain);
  h.setUpdateError({code:'42501'});await assert.rejects(()=>h.queries.updateOwnProfile(fields,uid,signal()),e=>!e.uncertain);
  h.setUpdateError(null);h.setMissing(true);await assert.rejects(()=>h.queries.updateOwnProfile(fields,uid,signal()),/could not be updated/);
  h.setMissing(false);h.setTransport(true);await assert.rejects(()=>h.queries.updateOwnProfile(fields,uid,signal()),e=>e.uncertain===true);
  assert.equal((await h.queries.loadOwnProfile(uid,signal())).displayName,fields.displayName,'Uncertain response can follow a real committed write');
});
test('save coordinator locks repeated saves and reuses an uploaded avatar after a definite text failure',async()=>{
  let uploads=0,updates=0,fail=true,finish;
  const saver=model.createProfileSaver({upload:async()=>{uploads++;return 'profile-avatars/'+uid+'/new.jpg';},update:async input=>{updates++;if(fail)throw new model.ProfileEditFailure('Taken');return new Promise(resolve=>{finish=()=>resolve({...input,id:uid,avatarPreview:null});});}});
  await assert.rejects(()=>saver.save(fields,photo),/Taken/);fail=false;
  const first=saver.save({...fields,username:'available'},photo);await new Promise(setImmediate);await assert.rejects(()=>saver.save(fields,photo),/in progress/);
  assert.equal(uploads,1);assert.equal(updates,2);finish();assert.equal((await first).username,'available');
  const mismatch=model.createProfileSaver({upload:async()=>'',update:async input=>({...input,id:uid,avatarPreview:null,username:'different'})});await assert.rejects(()=>mismatch.save(fields),e=>e.uncertain===true);
});

function all(tree,type){if(!tree||typeof tree!=='object')return [];return [...((tree.type===type||tree.type?.name===type)?[tree]:[]),...[tree.props?.children].flat(Infinity).flatMap(t=>all(t,type))];}
function editorHarness(){let slots=[],cursor=0,effects=[],updates=0,uploadCount=0,fail=null,resolveUpdate;const routes=[],alerts=[];const photos={candidates:{},errors:{},busyKey:null,isBusy:()=>false,select(key,source){photos.picked={key,source};},remove(key){delete photos.candidates[key];},acceptSaved(){photos.candidates={};}};
  const memo=(fn,deps)=>{const i=cursor++;if(!slots[i]||deps.some((d,j)=>d!==slots[i].deps[j]))slots[i]={value:fn(),deps};return slots[i].value;};
  const react={useState:init=>{const i=cursor++;if(!(i in slots))slots[i]=typeof init==='function'?init():init;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef:init=>{const i=cursor++;return slots[i]??={current:init};},useMemo:memo,useCallback:(fn,deps)=>memo(()=>fn,deps),useEffect:(fn,deps)=>{const i=cursor++;if(!slots[i]||deps.some((d,j)=>d!==slots[i][j])){slots[i]=deps;effects.push(fn);}}};
  const native=Object.fromEntries(['View','Text','TextInput','Pressable','ScrollView','KeyboardAvoidingView','ActivityIndicator'].map(n=>[n,n]));native.StyleSheet={create:s=>s};native.Platform={OS:'android'};native.Alert={alert:(...args)=>alerts.push(args)};
  const modules={'react':react,'react-native':native,'expo-router':{useRouter:()=>({replace:r=>routes.push(r),push:r=>routes.push(r),canGoBack:()=>true,back:()=>routes.push('back')}),useNavigation:()=>({dispatch:r=>routes.push(r)}),useFocusEffect:()=>{}},'expo-router/react-navigation':{usePreventRemove:()=>{}},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
    '@/components/discovery/ui':{Action:'Action',Message:'Message',ui:{},colors:{}},'@/components/discovery/journey-photo':{JourneyPhoto:'JourneyPhoto'},'@/hooks/session-context':{useSessionState:()=>({session:{user:{id:uid}}})},'@/hooks/use-load':{useLoad:()=>({data:profile})},'@/hooks/use-local-photos':{useLocalPhotos:()=>photos},'@/lib/profile/edit-model':model,
    '@/lib/profile/edit-queries':{loadOwnProfile:async()=>profile,uploadProfileAvatar:async()=>{uploadCount++;return 'profile-avatars/'+uid+'/new.jpg';},updateOwnProfile:async input=>{updates++;if(fail)throw fail;return new Promise(resolve=>{resolveUpdate=()=>resolve({...input,id:uid,avatarPreview:'https://test/new'});});}}};
  const {ProfileEditor}=load('src/app/profile/edit.tsx',modules);
  const render=()=>{cursor=0;effects=[];const tree=ProfileEditor({profile,ownerId:uid,onReload:()=>routes.push('reload')});effects.forEach(f=>f());return tree;};
  return {render,routes,alerts,photos,updates:()=>updates,uploads:()=>uploadCount,setFail:e=>fail=e,finish:()=>resolveUpdate()};
}
test('editor prefills, selects a local preview without upload, locks Save, confirms actual save then returns to refreshed Account',async()=>{
  const h=editorHarness();let tree=h.render();assert.deepEqual(all(tree,'TextInput').map(n=>n.props.value),['Real name','real_user','Real bio']);
  all(tree,'Pressable').find(n=>n.props.accessibilityLabel==='Change profile photo').props.onPress();h.alerts.at(-1)[2].find(b=>b.text==='Photo library').onPress();assert.deepEqual(h.photos.picked,{key:'avatar',source:undefined});
  h.photos.candidates.avatar=photo;tree=h.render();assert.equal(all(tree,'JourneyPhoto')[0].props.uri,photo.uri);assert.equal(h.uploads(),0);
  all(tree,'TextInput')[0].props.onChangeText('Updated name');tree=h.render();const save=all(tree,'Action').find(n=>n.props.label==='Save Changes');save.props.onPress();save.props.onPress();await new Promise(setImmediate);
  assert.equal(h.uploads(),1);assert.equal(h.updates(),1);tree=h.render();assert.equal(all(tree,'Action')[0].props.disabled,true);assert.equal(all(tree,'TextInput')[0].props.editable,false);
  h.finish();await new Promise(setImmediate);tree=h.render();assert.ok(all(tree,'Text').some(n=>n.props.accessibilityLiveRegion==='polite'));assert.equal(h.photos.candidates.avatar,undefined);
  all(tree,'Action').find(n=>n.props.label==='Back to Profile').props.onPress();assert.equal(h.routes.at(-1),'/account');
  assert.equal(all(all(tree,'ScrollView')[0],'Action').some(n=>n.props.label==='Save Changes'),false,'Save stays outside keyboard-aware content scrolling');
});
test('editor validation/failure keeps input and candidate; uncertain saves block retry until explicit reload',async()=>{
  const h=editorHarness();let tree=h.render();all(tree,'TextInput')[1].props.onChangeText('bad name');tree=h.render();all(tree,'Action')[0].props.onPress();await new Promise(setImmediate);assert.equal(h.updates(),0);
  tree=h.render();assert.ok(all(tree,'Text').some(n=>n.props.accessibilityRole==='alert'));
  all(tree,'TextInput')[1].props.onChangeText('valid_name');h.photos.candidates.avatar=photo;h.setFail(new model.ProfileEditFailure('Save unconfirmed',true));tree=h.render();all(tree,'Action')[0].props.onPress();await new Promise(setImmediate);tree=h.render();
  assert.equal(all(tree,'TextInput')[1].props.value,'valid_name');assert.equal(h.photos.candidates.avatar,photo);assert.equal(all(tree,'Action').find(n=>n.props.label==='Save Changes').props.disabled,true);
  all(tree,'Action').find(n=>n.props.label==='Reload saved profile').props.onPress();h.alerts.at(-1)[2].find(b=>b.text==='Reload').onPress();assert.equal(h.routes.at(-1),'reload');
});
