import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
function load(path, modules={}, development=false, logger=console) {
  const exports={};const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','exports','__DEV__','console',code)(name=>{if(name in modules)return modules[name];if(name==='./photo-diagnostics')return diagnostics;if(name==='./jpeg-source-header')return load('src/lib/create/jpeg-source-header.ts',{'./photo-model':model});throw Error(name);},exports,development,logger);return exports;
}
const diagnostics=load('src/lib/create/photo-diagnostics.ts');
const model=load('src/lib/create/photo-model.ts');
function png(width=800,height=600) {const b=new Uint8Array(32);b.set([137,80,78,71,13,10,26,10]);b.set([73,72,68,82],12);const v=new DataView(b.buffer);v.setUint32(16,width);v.setUint32(20,height);return b;}
function jpeg(width=800,height=600,orientation=1) {
 const exif=new Uint8Array(32);exif.set([69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0]);const v=new DataView(exif.buffer);v.setUint16(16,0x112,true);v.setUint16(18,3,true);v.setUint32(20,1,true);v.setUint16(24,orientation,true);
 return Uint8Array.from([255,216,255,225,0,34,...exif,255,192,0,17,8,height>>8,height&255,width>>8,width&255,3,1,0x11,0,2,0x11,0,3,0x11,0,255,217]);
}
function webp(width=100,height=80) {const b=new Uint8Array(32);b.set(Buffer.from('RIFF'),0);b.set(Buffer.from('WEBPVP8X'),8);b[24]=width-1;b[27]=height-1;return b;}
const asset={uri:'file:///source.jpg',mimeType:'image/jpeg',fileName:'source.jpg'};
test('header validation accepts supported signatures, rejects mismatches/HEIC, corrupt or unbounded dimensions and actual oversized/empty files',()=>{
 assert.deepEqual(model.photoHeader(png()),{mime:'image/png',width:800,height:600});assert.equal(model.photoHeader(webp()).mime,'image/webp');assert.equal(model.photoHeader(jpeg()).mime,'image/jpeg');
 assert.throws(()=>model.validatePhotoFile(asset,100,png()),/match/);
 for(const a of [{...asset,mimeType:'image/heic'},{...asset,fileName:'camera.HEIF'},{...asset,mimeType:'image/gif'}])assert.throws(()=>model.validatePhotoFile(a,100,jpeg()));
 for(const b of [new Uint8Array(),png(0,1),png(12001,1),png(10000,10000),Buffer.from('not an image')])assert.throws(()=>model.photoHeader(b));
 assert.throws(()=>model.validatePhotoFile(asset,model.MAX_PHOTO_BYTES+1,jpeg()),/15 MiB/);assert.throws(()=>model.validatePhotoFile(asset,0,jpeg()),/read/);
 assert.equal(model.validatePhotoFile(asset,model.MAX_PHOTO_BYTES,jpeg()).width,800);
});
test('orientation-derived dimensions resize without upscaling and keep aspect ratio',()=>{
 assert.deepEqual(model.photoDimensions(800,600),{width:800,height:600});assert.deepEqual(model.photoDimensions(4000,3000),{width:2048,height:1536});
 assert.deepEqual(model.photoHeader(jpeg(4000,3000,6)),{mime:'image/jpeg',width:3000,height:4000});assert.deepEqual(model.photoDimensions(3000,4000),{width:1536,height:2048});
 assert.deepEqual(model.photoDimensions(12000,1),{width:2048,height:1});assert.equal(model.JPEG_QUALITY,0.83);
});
test('preparation re-encodes oriented JPEG and preserves PNG/WebP transparency with PNG, then validates output',async()=>{
 for(const [header,inputMime,width,height] of [[jpeg(4000,3000,6),'image/jpeg',1536,2048],[png(4000,3000),'image/png',2048,1536],[webp(),'image/webp',100,80]]) {
  let outputMime;const removed=[];const io={inspect:async uri=>({size:1024,header:uri===asset.uri?header:outputMime==='image/jpeg'?jpeg(width,height):png(width,height)}),
   render:async(_uri,target,mime)=>{assert.deepEqual(target,{width,height});outputMime=mime;return {uri:'file:///prepared',...target};},remove:uri=>removed.push(uri)};
  const result=await model.preparePhoto({...asset,mimeType:inputMime,fileName:'photo'},io);assert.equal(result.mime,inputMime==='image/jpeg'?'image/jpeg':'image/png');assert.equal(result.width,width);assert.deepEqual(removed,[]);
 }
});
test('preparation rejects oversized/corrupt output and unexpected dimensions, cleaning only its generated file',async()=>{
 for(const [size,header,width,height] of [[model.MAX_PHOTO_BYTES+1,jpeg(),800,600],[100,png(),800,600],[100,jpeg(100,100),100,100]]) {
  const removed=[];const io={inspect:async uri=>uri===asset.uri?{size:100,header:jpeg()}:{size,header},render:async()=>({uri:'file:///prepared',width,height}),remove:uri=>removed.push(uri)};
  await assert.rejects(model.preparePhoto(asset,io));assert.deepEqual(removed,['file:///prepared']);
 }
 let renders=0;await assert.rejects(model.preparePhoto(asset,{inspect:async()=>({size:model.MAX_PHOTO_BYTES+1,header:jpeg()}),render:async()=>{renders++;},remove(){}}));assert.equal(renders,0);
});
const candidate=n=>({uri:'file:///prepared-'+n,width:800,height:600,size:100,mime:'image/jpeg'});
test('selection cancellation, permission denial and failed replacement preserve the previous candidate',async()=>{
 let pick=asset,fail=false,n=0;const removed=[];const store=model.createLocalPhotoStore({pick:async()=>{if(pick instanceof Error)throw pick;return pick;},prepare:async()=>{if(fail)throw Error('Preparation failed');return candidate(++n);},remove:uri=>removed.push(uri)},()=>{});
 await store.select('cover');const first=store.getState().candidates.cover;pick=null;await store.select('cover');assert.equal(store.getState().candidates.cover,first);
 pick=Error('Gallery permission denied');await store.select('cover');assert.match(store.getState().errors.cover,/permission denied/);assert.equal(store.getState().candidates.cover,first);
 pick=asset;fail=true;await store.select('cover');assert.equal(store.getState().candidates.cover,first);assert.deepEqual(removed,[]);
 fail=false;await store.select('cover');assert.equal(store.getState().candidates.cover.uri,candidate(2).uri);assert.deepEqual(removed,[first.uri]);
 store.remove('cover');assert.deepEqual(store.getState().candidates,{});assert.equal(removed.length,2);store.dispose();
});
test('one global operation lock rejects duplicate picks/removal and a disposed editor cleans late preparation results',async()=>{
 let finish,prepares=0,picks=0;const removed=[];let notifications=0;const pending=new Promise(resolve=>{finish=resolve;});
 const store=model.createLocalPhotoStore({pick:async()=>{picks++;return asset;},prepare:async()=>{prepares++;return pending;},remove:uri=>removed.push(uri)},()=>notifications++);
 const first=store.select('cover');await new Promise(setImmediate);await store.select('stop');store.remove('cover');assert.equal(picks,1);assert.equal(prepares,1);assert.equal(store.getState().busyKey,'cover');
 store.dispose();const before=notifications;finish(candidate(1));await first;assert.deepEqual(removed,[candidate(1).uri]);assert.equal(notifications,before);assert.deepEqual(store.getState().candidates,{});
});
test('native adapter uses single gallery only, handles cancellation/permission denial and bounded binary reads with release',async()=>{
 let result={canceled:true},deny=false,options;const removed=[],reads=[],release=[];let rendered;
 const picker={UIImagePickerPreferredAssetRepresentationMode:{Current:'current'},launchImageLibraryAsync:async value=>{options=value;if(deny)throw Error('Permission denied');return result;}};
 class File {constructor(uri){this.uri=uri;this.size=1000;this.exists=true;}open(){return {readBytes:n=>{reads.push(n);return jpeg();},close:()=>release.push('handle')};}delete(){removed.push(this.uri);}}
 const context={resize:target=>{assert.deepEqual(target,{width:800,height:600});},renderAsync:async()=>({saveAsync:async opts=>{rendered=opts;return {uri:'file:///prepared',width:800,height:600};},release:()=>release.push('image')}),release:()=>release.push('context')};
 const {photoDevice}=load('src/lib/create/photo-device.native.ts',{'./photo-model':model,'expo-image-picker':picker,'expo-file-system':{File},'expo-image-manipulator':{ImageManipulator:{manipulate:()=>context},SaveFormat:{JPEG:'jpeg',PNG:'png'}}});
 assert.equal(await photoDevice.pick(),null);assert.deepEqual(options.mediaTypes,['images']);assert.equal(options.allowsMultipleSelection,false);assert.equal(options.base64,false);assert.equal(options.allowsEditing,false);
 deny=true;await assert.rejects(photoDevice.pick(),/Gallery access was denied/);deny=false;result={canceled:false,assets:[asset]};assert.deepEqual(await photoDevice.pick(),asset);
 const photo=await photoDevice.prepare(asset);assert.equal(photo.uri,'file:///prepared');assert.equal(rendered.compress,0.83);assert.equal(rendered.base64,false);assert.equal(rendered.format,'jpeg');assert.deepEqual(reads,[1000,1000]);assert.ok(release.includes('image'));assert.ok(release.includes('context'));
 photoDevice.remove(photo.uri);await new Promise(setImmediate);assert.deepEqual(removed,[photo.uri]);
});
test('camera is configured explicitly, microphone remains blocked and photo selection contains no upload or save path',()=>{
 const config=JSON.parse(readFileSync('app.json','utf8'));const plugin=config.expo.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-image-picker');assert.equal(plugin[1].cameraPermission,'Take an optional photo for your journey or memory.');assert.equal(plugin[1].microphonePermission,false);
 for(const file of ['src/lib/create/photo-model.ts','src/lib/create/photo-device.native.ts','src/hooks/use-local-photos.ts']) {const code=readFileSync(file,'utf8');assert.equal(/from ['"](?:.*supabase|.*queries)['"]|\bfetch\(|\.upload\(|\.rpc\(|\.base64\(/.test(code),false);}
});
test('camera permission is checked only for camera, requested only when needed, and capture is images-only',async()=>{
 for(const granted of [true,false]) {
  const calls=[];const picker={getCameraPermissionsAsync:async()=>{calls.push('check');return {granted,canAskAgain:true};},requestCameraPermissionsAsync:async()=>{calls.push('request');return {granted:true,canAskAgain:true};},launchCameraAsync:async options=>{calls.push(options);return {canceled:false,assets:[asset]};},launchImageLibraryAsync:async()=>({canceled:true})};
  const {photoDevice}=load('src/lib/create/photo-device.native.ts',{'./photo-model':model,'expo-image-picker':picker});
  assert.deepEqual(await photoDevice.pick('camera'),{...asset,width:undefined,height:undefined});assert.deepEqual(calls.slice(0,-1),granted?['check']:['check','request']);
  assert.deepEqual(calls.at(-1),{mediaTypes:['images'],allowsEditing:false,quality:1,base64:false,exif:false});
 }
});
test('denied/permanent camera permission never launches camera, and gallery still works without camera permission',async()=>{
 for(const canAskAgain of [true,false]) {
  let requests=0,cameras=0;const picker={UIImagePickerPreferredAssetRepresentationMode:{Current:'current'},getCameraPermissionsAsync:async()=>({granted:false,canAskAgain}),requestCameraPermissionsAsync:async()=>{requests++;return {granted:false,canAskAgain:true};},launchCameraAsync:async()=>{cameras++;},launchImageLibraryAsync:async()=>({canceled:false,assets:[asset]})};
  const alerts=[];let settings=0;const {photoDevice}=load('src/lib/create/photo-device.native.ts',{'./photo-model':model,'expo-image-picker':picker,'react-native':{Alert:{alert:(...args)=>alerts.push(args)},Linking:{openSettings:async()=>{settings++;}}}});
  await assert.rejects(photoDevice.pick('camera'),canAskAgain?/Camera permission denied/:/Settings/);assert.equal(requests,canAskAgain?1:0);assert.equal(cameras,0);
  assert.equal(settings,0);assert.equal(alerts[0][2][0].text,'Cancel');alerts[0][2][1].onPress();await new Promise(setImmediate);assert.equal(settings,1);
  assert.deepEqual(await photoDevice.pick('gallery'),asset);assert.equal(requests,canAskAgain?1:0);
 }
});
test('camera cancellation, malformed result and camera unavailability return safely without preparation',async()=>{
 let result={canceled:true};const picker={getCameraPermissionsAsync:async()=>({granted:true,canAskAgain:true}),launchCameraAsync:async()=>{if(result instanceof Error)throw result;return result;}};
 const {photoDevice}=load('src/lib/create/photo-device.native.ts',{'./photo-model':model,'expo-image-picker':picker});
 assert.equal(await photoDevice.pick('camera'),null);result={canceled:false,assets:[]};await assert.rejects(photoDevice.pick('camera'),/captured photo is unavailable/);
 result=Error('No camera activity');await assert.rejects(photoDevice.pick('camera'),/development build.*gallery/);
});
test('camera and gallery share the same locked candidate preparation/replacement pipeline without saved-path mutations',async()=>{
 let next=asset,fail=false,n=0;const sources=[],prepared=[],removed=[];const saved={coverPath:'journey-media/original',stops:[{id:'memory',photoPath:'journey-media/stop',description:'Keep'}]};const original=structuredClone(saved);
 const store=model.createLocalPhotoStore({pick:async source=>{sources.push(source);if(next instanceof Error)throw next;return next;},prepare:async selected=>{prepared.push(selected);if(fail)throw Error('Invalid capture');return candidate(++n);},remove:uri=>removed.push(uri)},()=>{});
 await store.select('cover','gallery');const first=store.getState().candidates.cover;next=null;await store.select('cover','camera');assert.equal(store.getState().candidates.cover,first);
 next=Error('Camera permission denied');await store.select('cover','camera');assert.equal(store.getState().candidates.cover,first);
 next=asset;fail=true;await store.select('cover','camera');assert.equal(store.getState().candidates.cover,first);
 fail=false;await store.select('cover','camera');await store.select('memory','camera');assert.deepEqual(sources,['gallery','camera','camera','camera','camera','camera']);assert.equal(store.getState().candidates.cover.uri,candidate(2).uri);assert.equal(store.getState().candidates.memory.uri,candidate(3).uri);assert.deepEqual(saved,original);assert.deepEqual(removed,[first.uri]);assert.equal(prepared.length,4);
});
test('camera permission/capture locks out gallery and duplicate camera taps; disposal ignores a late capture',async()=>{
 let finish,picks=0,prepares=0;const pending=new Promise(resolve=>{finish=resolve;});let notifications=0;
 const store=model.createLocalPhotoStore({pick:async source=>{assert.equal(source,'camera');picks++;return pending;},prepare:async()=>{prepares++;return candidate(1);},remove(){}},()=>notifications++);
 const first=store.select('cover','camera');await store.select('cover','camera');await store.select('memory','gallery');assert.equal(picks,1);assert.equal(store.getState().busyKey,'cover');
 store.dispose();const before=notifications;finish(asset);await first;assert.equal(prepares,0);assert.equal(notifications,before);
});

test('native prepared-file reading uses one ArrayBuffer, verifies actual bytes and dimensions, and rejects changed files',async()=>{
 let reads=0,actual=jpeg(),size=actual.length;class File {constructor(){this.exists=true;}get size(){return size;}async arrayBuffer(){reads++;return actual.buffer;}}
 const {readPreparedPhoto}=load('src/lib/create/photo-device.native.ts',{'./photo-model':model,'expo-file-system':{File}});
 const selected={...candidate(1),mime:'image/jpeg',size};const bytes=await readPreparedPhoto(selected);assert.ok(bytes instanceof ArrayBuffer);assert.equal(reads,1);
 size++;await assert.rejects(readPreparedPhoto(selected),/changed|unavailable/);assert.equal(reads,1);size=selected.size;actual=jpeg(600,800);await assert.rejects(readPreparedPhoto(selected),/dimensions changed/);
});
test('accepting confirmed saved candidates clears only matching local previews and never another pending replacement',async()=>{
 let n=0;const removed=[];const store=model.createLocalPhotoStore({pick:async()=>asset,prepare:async()=>candidate(++n),remove:uri=>removed.push(uri)},()=>{});
 await store.select('cover');const first=store.getState().candidates.cover;await store.select('cover');store.acceptSaved({cover:first});assert.equal(store.getState().candidates.cover.uri,candidate(2).uri);store.acceptSaved({cover:candidate(2)});assert.equal(store.getState().candidates.cover,undefined);assert.deepEqual(removed,[candidate(1).uri,candidate(2).uri]);
});

test('strict prepared-file validation rejects HEIF metadata before any actual conversion',()=>{
 const camera={...asset,mimeType:'image/heic',fileName:'capture.HEIC',width:4000,height:3000};
 assert.throws(()=>model.validatePhotoFile(camera,100,jpeg()),/HEIC\/HEIF must be converted/);
});
test('camera encoding admits only verified JPEG bytes for HEIC, missing or mismatched metadata and supported source types',async()=>{
 for(const [header,mimeType,fileName] of [[new Uint8Array([0,0,0,24,102,116,121,112,104,101,105,99]),'image/heic','capture.HEIC'],[jpeg(4000,3000),'image/heif','capture.heif'],[png(4000,3000),'image/png','capture.png'],[webp(),undefined,undefined],[jpeg(4000,3000),'image/jpeg','capture.jpeg']]){
  const camera={uri:'file:///capture',mimeType,fileName,width:4000,height:3000};let output;const renders=[];
  const result=await model.preparePhoto(camera,{inspect:async uri=>({size:1000,header:uri===camera.uri?header:jpeg(output.width,output.height)}),render:async(uri,target,mime)=>{renders.push({uri,target,mime});output=target;return {uri:'file:///encoded-camera.jpg',...target};},remove(){}},'camera');
  assert.equal(renders.length,1);assert.equal(renders[0].mime,'image/jpeg');assert.ok(Math.max(result.width,result.height)<=2048);assert.equal(result.mime,'image/jpeg');assert.match(result.uri,/\.jpg$/);
  if(mimeType==='image/png')assert.deepEqual(renders[0].target,{width:2048,height:1536});
 }
 const small={uri:'file:///small.heic',mimeType:'image/heic',fileName:'small.heic',width:640,height:480};
 const result=await model.preparePhoto(small,{inspect:async uri=>({size:100,header:uri===small.uri?new Uint8Array([1,2,3]):jpeg(640,480)}),render:async(_uri,target,mime)=>{assert.deepEqual(target,{width:640,height:480});assert.equal(mime,'image/jpeg');return {uri:'file:///small.jpg',...target};},remove(){}},'camera');assert.equal(result.width,640);
});
test('camera rejects oversized/invalid source dimensions and bogus, oversized or wrong-dimension encoded output',async()=>{
 const camera={uri:'file:///capture.heic',mimeType:'image/heic',fileName:'capture.heic',width:800,height:600};
 for(const patch of [{width:0},{height:NaN},{width:12001},{width:10000,height:10000}]){
  let renders=0;await assert.rejects(model.preparePhoto({...camera,...patch},{inspect:async()=>({size:100,header:new Uint8Array([1,2,3])}),render:async()=>{renders++;},remove(){}},'camera'));assert.equal(renders,0);
 }
 let renders=0;await assert.rejects(model.preparePhoto(camera,{inspect:async()=>({size:model.MAX_PHOTO_BYTES+1,header:new Uint8Array()}),render:async()=>{renders++;},remove(){}},'camera'),/15 MiB/);assert.equal(renders,0);
 for(const [header,size] of [[png(),100],[jpeg(),model.MAX_PHOTO_BYTES+1],[jpeg(100,100),100],[new Uint8Array([1,2,3]),100]]){
  const removed=[];await assert.rejects(model.preparePhoto(camera,{inspect:async uri=>uri===camera.uri?{size:100,header:new Uint8Array([1,2,3])}:{size,header},render:async()=>({uri:'file:///converted.jpg',width:800,height:600}),remove:uri=>removed.push(uri)},'camera'));assert.deepEqual(removed,['file:///converted.jpg']);
 }
 await assert.rejects(model.preparePhoto(camera,{inspect:async()=>({size:100,header:jpeg(12001,1)}),render:async()=>{throw Error('must not decode');},remove(){}},'camera'),/too large/);
});
test('native camera result is encoded as JPEG using installed manipulator and the actual prepared bytes are validated',async()=>{
 const capture={uri:'file:///capture.heic',mimeType:'image/heic',fileName:'capture.heic',width:4000,height:3000};const calls=[],removed=[],released=[];
 class File{constructor(uri){this.uri=uri;this.exists=true;this.size=1000;}open(){return {readBytes:()=>this.uri===capture.uri?new Uint8Array([1,2,3]):jpeg(2048,1536),close:()=>released.push('handle')};}delete(){removed.push(this.uri);}}
 const picker={getCameraPermissionsAsync:async()=>({granted:true,canAskAgain:true}),launchCameraAsync:async()=>({canceled:false,assets:[capture]})};
 const manipulator={ImageManipulator:{manipulate:uri=>{calls.push(uri);return {resize:target=>calls.push(target),renderAsync:async()=>({saveAsync:async options=>{calls.push(options);return {uri:'file:///camera.jpg',width:2048,height:1536};},release:()=>released.push('image')}),release:()=>released.push('context')};}},SaveFormat:{JPEG:'jpeg',PNG:'png'}};
 const {photoDevice}=load('src/lib/create/photo-device.native.ts',{'./photo-model':model,'expo-image-picker':picker,'expo-file-system':{File},'expo-image-manipulator':manipulator});
 const selected=await photoDevice.pick('camera');assert.deepEqual(selected,capture);const prepared=await photoDevice.prepare(selected,'camera');assert.equal(prepared.mime,'image/jpeg');assert.deepEqual(calls,[capture.uri,{width:2048,height:1536},{format:'jpeg',compress:0.83,base64:false}]);assert.ok(released.includes('image'));assert.ok(released.includes('context'));assert.deepEqual(removed,[]);
});
test('camera conversion failure is recoverable and retains the previous candidate; cancellation never converts',async()=>{
 let next=asset,sourceSeen,n=0,fail=false;const removed=[];
 const store=model.createLocalPhotoStore({pick:async()=>next,prepare:async(_asset,source)=>{sourceSeen=source;if(fail)throw Error('Camera conversion failed. Use gallery.');return candidate(++n);},remove:uri=>removed.push(uri)},()=>{});
 await store.select('cover','gallery');const previous=store.getState().candidates.cover;fail=true;await store.select('cover','camera');assert.equal(sourceSeen,'camera');assert.equal(store.getState().candidates.cover,previous);assert.match(store.getState().errors.cover,/Use gallery/);next=null;sourceSeen=null;await store.select('cover','camera');assert.equal(sourceSeen,null);assert.equal(store.getState().candidates.cover,previous);assert.deepEqual(removed,[]);
 const {photoDevice}=load('src/lib/create/photo-device.native.ts',{'./photo-model':model,'expo-file-system':{File:class{constructor(){this.exists=true;this.size=100;}open(){return {readBytes:()=>new Uint8Array([1,2,3]),close(){}};}}},'expo-image-manipulator':{ImageManipulator:{manipulate:()=>{throw Error('decoder failed');}},SaveFormat:{JPEG:'jpeg',PNG:'png'}}});
 await assert.rejects(photoDevice.prepare({...asset,width:800,height:600},'camera'),/failed at manipulate.*Retry Take Photo.*previous photo is unchanged/);
 const missing=load('src/lib/create/photo-device.native.ts',{'./photo-model':model});await assert.rejects(missing.photoDevice.prepare({...asset,width:800,height:600},'camera'),/Retry Take Photo.*previous photo is unchanged/);
});
test('settings-link failure is recoverable and gallery selection does not access camera permission',async()=>{
 const alerts=[];let checks=0;const picker={UIImagePickerPreferredAssetRepresentationMode:{Current:'current'},getCameraPermissionsAsync:async()=>{checks++;return {granted:false,canAskAgain:false};},launchImageLibraryAsync:async()=>({canceled:false,assets:[asset]})};
 const {photoDevice}=load('src/lib/create/photo-device.native.ts',{'./photo-model':model,'expo-image-picker':picker,'react-native':{Alert:{alert:(...args)=>alerts.push(args)},Linking:{openSettings:async()=>{throw Error('unsupported');}}}});
 assert.deepEqual(await photoDevice.pick('gallery'),asset);assert.equal(checks,0);await assert.rejects(photoDevice.pick('camera'),/blocked/);alerts[0][2][1].onPress();await new Promise(setImmediate);assert.equal(alerts[1][0],'Settings unavailable');assert.deepEqual(await photoDevice.pick('gallery'),asset);assert.equal(checks,1);
});

test('SDK57 zero/missing picker dimensions do not reject readable JPEG camera files with valid actual dimensions',async()=>{
 for(const metadata of [{width:0,height:0},{width:800,height:0},{}]){
  const stages=[];const result=await model.preparePhoto({...asset,...metadata},{stage:(stage,facts)=>stages.push({stage,facts}),inspect:async uri=>({size:100,header:uri===asset.uri?jpeg(800,600):jpeg(800,600)}),render:async(_uri,target,mime)=>{assert.deepEqual(target,{width:800,height:600});assert.equal(mime,'image/jpeg');return {uri:'file:///output.jpg',...target};},remove(){}},'camera');
  assert.equal(result.mime,'image/jpeg');assert.equal(result.width,800);assert.equal(stages.at(-1).stage,'ready');
 }
 // No trustworthy header OR picker dimensions still fails before native decode.
 let renders=0;await assert.rejects(model.preparePhoto({...asset,width:0,height:0},{inspect:async()=>({size:100,header:new Uint8Array([1,2,3])}),render:async()=>{renders++;},remove(){}},'camera'));assert.equal(renders,0);
});
test('development diagnostics redact unknown exceptions, paths, URLs, tokens, filenames and arbitrary fact keys; production emits nothing',()=>{
 const logs=[],logger={warn:(...args)=>logs.push(args),info:(...args)=>logs.push(args)};const dev=load('src/lib/create/photo-diagnostics.ts',{},true,logger),prod=load('src/lib/create/photo-diagnostics.ts',{},false,logger);
 const privateMessage='decode file:///private/photo.jpg https://secret.test?token=abc password=mysecret';
 dev.photoDiagnostic('render',{width:800,height:600,size:100,uri:privateMessage,format:privateMessage},new TypeError(privateMessage));
 const text=JSON.stringify(logs);for(const secret of ['file:///','photo.jpg','secret.test','token','abc','password','mysecret'])assert.equal(text.includes(secret),false);
 assert.equal(logs[0][1].stage,'render');assert.equal(logs[0][1].exception.name,'TypeError');assert.match(logs[0][1].exception.message,/decoding/);
 prod.photoDiagnostic('render',{},Error(privateMessage));assert.equal(logs.length,1);
 dev.photoDiagnostic('source-validate',{},Error('Choose a photo no larger than 15 MiB.'));assert.equal(logs[1][1].exception.message,'Choose a photo no larger than 15 MiB.');
 dev.photoDiagnostic('ready',{width:800,height:600,format:'image/jpeg',uri:privateMessage});assert.equal(logs[2][1].format,'image/jpeg');assert.equal(JSON.stringify(logs[2]).includes(privateMessage),false);
});
function cameraStageHarness(failure) {
 const events=[];const capture={...asset,width:0,height:0};let deleted=0;
 class File{constructor(uri){this.uri=uri;this.exists=!(failure==='source-missing'&&uri===asset.uri);this.size=1000;}open(){if(failure==='source-read'&&this.uri===asset.uri)throw Error('read private path');return {readBytes:()=>this.uri===asset.uri?jpeg():failure==='output-validate'?png():jpeg(),close(){}};}delete(){deleted++;}}
 const manipulator={ImageManipulator:{manipulate:()=>{if(failure==='manipulate')throw Error('decode private path');return {resize(){if(failure==='resize')throw Error('resize failed');},renderAsync:async()=>{if(failure==='render')throw Error('bitmap failed');return {saveAsync:async()=>{if(failure==='encode')throw Error('encode failed');return {uri:'file:///output.jpg',width:800,height:600};},release(){if(failure==='cleanup')throw Error('release failed');}};},release(){}};}},SaveFormat:{JPEG:'jpeg',PNG:'png'}};
 const {photoDevice}=load('src/lib/create/photo-device.native.ts',{'./photo-model':model,'./photo-diagnostics':{photoDiagnostic:(stage,facts,error)=>events.push({stage,facts,error})},'expo-file-system':{File},'expo-image-manipulator':manipulator});
 return {photoDevice,capture,events,deleted:()=>deleted};
}
test('real native adapter accepts zero-dimension camera metadata and checks actual file/header before preview',async()=>{
 const h=cameraStageHarness();const result=await h.photoDevice.prepare(h.capture,'camera');assert.equal(result.mime,'image/jpeg');assert.equal(result.width,800);
 assert.ok(h.events.some(e=>e.stage==='source-read'&&e.facts?.exists===true));assert.ok(h.events.some(e=>e.stage==='source-read'&&e.facts?.readable===true));assert.ok(h.events.some(e=>e.stage==='output-read'&&e.facts?.exists===true));assert.equal(h.events.at(-1).stage,'ready');
 assert.ok(h.events.some(e=>e.stage==='source-read'&&e.facts?.format==='image/jpeg'));assert.ok(h.events.some(e=>e.stage==='output-read'&&e.facts?.format==='image/jpeg'));
});
test('conversion failures identify source IO, manipulation, resize, render, encoding, cleanup and output-validation stages',async()=>{
 for(const [failure,stage] of [['source-missing','source-read'],['source-read','source-read'],['manipulate','manipulate'],['resize','resize'],['render','render'],['encode','encode'],['cleanup','cleanup'],['output-validate','output-validate']]){
  const h=cameraStageHarness(failure);await assert.rejects(h.photoDevice.prepare(h.capture,'camera'),new RegExp('failed at '+stage));assert.equal(h.events.filter(e=>e.error).at(-1).stage,stage);if(failure==='output-validate')assert.equal(h.deleted(),1);
 }
});

function jpegWithLargeMetadata(width=4096,height=3072,orientation=6) {
 const original=jpeg(width,height,orientation),sofOffset=38;
 const app2=new Uint8Array(65537);app2.set([255,226,255,255]);
 const app13=new Uint8Array(10004);app13.set([255,237,39,18]);
 const data=new Uint8Array(original.length+app2.length+app13.length);
 data.set(original.slice(0,sofOffset));data.set(app2,sofOffset);data.set(app13,sofOffset+app2.length);data.set(original.slice(sofOffset),sofOffset+app2.length+app13.length);
 return {data,dimensionOffset:sofOffset+app2.length+app13.length};
}
function byteHandle(data,reads=[]) {return {offset:0,readBytes(n){reads.push(n);const bytes=data.slice(this.offset,this.offset+n);this.offset+=bytes.length;return bytes;}};}
test('reproduces camera JPEG rejection when the dimension marker lies beyond the 64KiB peek; structural reader preserves actual EXIF orientation',()=>{
 const {data,dimensionOffset}=jpegWithLargeMetadata();assert.throws(()=>model.photoHeader(data.slice(0,65536)),/Choose a valid/);
 const reads=[];const {readJpegSourceHeader}=load('src/lib/create/jpeg-source-header.ts',{'./photo-model':model});const result=readJpegSourceHeader(byteHandle(data,reads),data.length);
 assert.equal(result.dimensionOffset,dimensionOffset);assert.ok(dimensionOffset>65536);assert.deepEqual(model.photoHeader(result.header),{mime:'image/jpeg',width:3072,height:4096});
 assert.ok(result.header.length<100);assert.ok(reads.reduce((sum,n)=>sum+n,0)<200,'bulk APP metadata is sought over, not copied');
});
test('structural JPEG reading handles marker fill and rejects truncation, missing SOF, segment overflow and excessive markers',()=>{
 const {readJpegSourceHeader}=load('src/lib/create/jpeg-source-header.ts',{'./photo-model':model});const filled=Uint8Array.from([255,216,255,...jpeg().slice(2)]);assert.equal(model.photoHeader(readJpegSourceHeader(byteHandle(filled),filled.length).header).width,800);
 for(const data of [new Uint8Array(),Uint8Array.from([255,216,255,217]),Uint8Array.from([255,216,255,226,255,255]),Uint8Array.from([255,216,255,218,0,2]),Uint8Array.from([255,216,...new Array(600).fill(255)])])assert.throws(()=>readJpegSourceHeader(byteHandle(data),data.length),/header.*safely/);
});
test('actual camera adapter skips large JPEG metadata, encodes JPEG, validates output and emits structural-read evidence without changing source',async()=>{
 const {data,dimensionOffset}=jpegWithLargeMetadata(),sourceCopy=data.slice(),events=[],targets=[];const raw={...asset,width:3072,height:4096};
 class File{constructor(uri){this.uri=uri;this.exists=true;this.size=uri===asset.uri?data.length:1000;}open(){const handle=byteHandle(this.uri===asset.uri?data:jpeg(1536,2048));return {...handle,close(){}};}delete(){}}
 const manipulator={ImageManipulator:{manipulate:uri=>{assert.equal(uri,asset.uri);return {resize:target=>targets.push(target),renderAsync:async()=>({saveAsync:async options=>{assert.equal(options.format,'jpeg');return {uri:'file:///output.jpg',width:1536,height:2048};},release(){}}),release(){}};}},SaveFormat:{JPEG:'jpeg',PNG:'png'}};
 const {photoDevice}=load('src/lib/create/photo-device.native.ts',{'./photo-model':model,'./photo-diagnostics':{photoDiagnostic:(stage,facts,error)=>events.push({stage,facts,error})},'expo-file-system':{File},'expo-image-manipulator':manipulator});
 const result=await photoDevice.prepare(raw,'camera');assert.equal(result.mime,'image/jpeg');assert.deepEqual(targets,[{width:1536,height:2048}]);assert.deepEqual(data,sourceCopy);assert.ok(events.some(e=>e.facts?.structuralRead===true&&e.facts?.dimensionOffset===dimensionOffset));assert.equal(events.at(-1).stage,'ready');
});

function heif(brand='heic', compatible=['mif1']) {
 const bytes=new Uint8Array(16+compatible.length*4);new DataView(bytes.buffer).setUint32(0,bytes.length);
 bytes.set(Buffer.from('ftyp'),4);bytes.set(Buffer.from(brand),8);compatible.forEach((value,i)=>bytes.set(Buffer.from(value),16+i*4));return bytes;
}
test('camera and gallery HEIC/HEIF reach native JPEG encoding before strict output validation with bounded original dimensions',async()=>{
 for(const source of ['camera','gallery']) for(const mimeType of ['image/heic','image/heif','image/heic-sequence','image/heif-sequence',undefined]) {
  const raw={uri:'file:///library.heif',fileName:'library.heif',mimeType,width:4032,height:3024};const stages=[],calls=[],removed=[];
  const result=await model.preparePhoto(raw,{stage:s=>stages.push(s),inspect:async uri=>({size:1000,header:uri===raw.uri?heif():jpeg(2048,1536)}),
   render:async(uri,target,mime)=>{calls.push({uri,target,mime});return {uri:'file:///encoded.jpg',...target};},remove:uri=>removed.push(uri)},source);
  assert.deepEqual(calls,[{uri:raw.uri,target:{width:2048,height:1536},mime:'image/jpeg'}]);assert.equal(result.uri,'file:///encoded.jpg');assert.equal(result.mime,'image/jpeg');
  assert.ok(stages.indexOf('source-validate')<stages.indexOf('output-validate'));assert.equal(stages.at(-1),'ready');assert.deepEqual(removed,[]);
 }
});
test('gallery provider JPEG bytes with stale HEIF name/type are re-encoded from actual oriented dimensions',async()=>{
 const raw={uri:'file:///library.heic',fileName:'IMG.HEIC',mimeType:'image/heic',width:0,height:0};
 const result=await model.preparePhoto(raw,{inspect:async uri=>({size:1000,header:uri===raw.uri?jpeg(4096,3072,6):jpeg(1536,2048)}),
  render:async(uri,target,mime)=>{assert.equal(uri,raw.uri);assert.deepEqual(target,{width:1536,height:2048});assert.equal(mime,'image/jpeg');return {uri:'file:///genuine.jpg',...target};},remove(){}},'gallery');
 assert.equal(result.width,1536);assert.equal(result.height,2048);assert.equal(result.mime,'image/jpeg');
});
test('gallery HEIF detection never trusts extensions alone or admits AVIF/GIF/corrupt data and preserves source limits',async()=>{
 const raw={uri:'file:///photo.heic',fileName:'photo.heic',mimeType:'image/heic',width:800,height:600};
 for(const header of [new Uint8Array([1,2,3]),heif('avif'),heif('mif1',['avif']),Buffer.from('GIF89a'),heif().subarray(0,12)]) {
  let renders=0;await assert.rejects(model.preparePhoto(raw,{inspect:async()=>({size:1000,header}),render:async()=>{renders++;},remove(){}},'gallery'));assert.equal(renders,0);
 }
 for(const patch of [{width:0},{height:NaN},{width:12001},{width:10000,height:10000}]){
  let renders=0;await assert.rejects(model.preparePhoto({...raw,...patch},{inspect:async()=>({size:1000,header:heif()}),render:async()=>{renders++;},remove(){}},'gallery'));assert.equal(renders,0);
 }
 let renders=0;await assert.rejects(model.preparePhoto(raw,{inspect:async()=>({size:model.MAX_PHOTO_BYTES+1,header:heif()}),render:async()=>{renders++;},remove(){}},'gallery'),/15 MiB/);assert.equal(renders,0);
});
test('gallery HEIF conversion must produce genuine bounded JPEG bytes; failures retain previous candidate',async()=>{
 const raw={uri:'file:///photo.heic',mimeType:'image/heic',width:800,height:600};
 for(const [header,size] of [[heif(),1000],[png(),1000],[new Uint8Array([1,2,3]),1000],[jpeg(100,100),1000],[jpeg(),model.MAX_PHOTO_BYTES+1]]){
  const removed=[];await assert.rejects(model.preparePhoto(raw,{inspect:async uri=>uri===raw.uri?{size:1000,header:heif()}:{size,header},render:async()=>({uri:'file:///not-just-renamed.jpg',width:800,height:600}),remove:uri=>removed.push(uri)},'gallery'));assert.deepEqual(removed,['file:///not-just-renamed.jpg']);
 }
 let failed=false;const store=model.createLocalPhotoStore({pick:async()=>raw,prepare:async(_asset,source)=>{
  if(!failed)return candidate(1);
  return model.preparePhoto(raw,{inspect:async()=>({size:1000,header:heif()}),render:async()=>{throw Error('decoder unavailable file:///private/photo');},remove(){}},source);
 },remove(){}},()=>{});
 await store.select('cover');const before=store.getState().candidates.cover;failed=true;await store.select('cover');assert.equal(store.getState().candidates.cover,before);assert.match(store.getState().errors.cover,/device could not convert.*previous photo is unchanged/);assert.equal(store.getState().errors.cover.includes('file:///'),false);
});
test('actual library picker retains dimensions and native adapter creates JPEG data then upload reads that exact encoded file',async()=>{
 const selected={uri:'file:///library.heif',mimeType:'image/heif',fileName:'library.heif',width:4032,height:3024};const encoded=jpeg(2048,1536),calls=[],released=[];
 class File{constructor(uri){this.uri=uri;this.exists=true;this.size=uri===selected.uri?1000:encoded.length;}open(){return {...byteHandle(this.uri===selected.uri?heif():encoded),close:()=>released.push('handle')};}async arrayBuffer(){assert.equal(this.uri,'file:///encoded-library.jpg');return encoded.buffer;}delete(){}}
 const picker={UIImagePickerPreferredAssetRepresentationMode:{Current:'current'},launchImageLibraryAsync:async()=>({canceled:false,assets:[selected]}),getCameraPermissionsAsync:()=>{throw Error('must not request camera permission');}};
 const manipulator={ImageManipulator:{manipulate:uri=>{calls.push(uri);return {resize:target=>calls.push(target),renderAsync:async()=>({saveAsync:async options=>{calls.push(options);return {uri:'file:///encoded-library.jpg',width:2048,height:1536};},release:()=>released.push('image')}),release:()=>released.push('context')};}},SaveFormat:{JPEG:'jpeg',PNG:'png'}};
 const device=load('src/lib/create/photo-device.native.ts',{'./photo-model':model,'expo-image-picker':picker,'expo-file-system':{File},'expo-image-manipulator':manipulator});
 const picked=await device.photoDevice.pick('gallery');assert.deepEqual(picked,selected);const photo=await device.photoDevice.prepare(picked,'gallery');const bytes=await device.readPreparedPhoto(photo);
 assert.deepEqual(calls,[selected.uri,{width:2048,height:1536},{format:'jpeg',compress:0.83,base64:false}]);assert.equal(photo.mime,'image/jpeg');assert.equal(model.photoHeader(new Uint8Array(bytes)).mime,'image/jpeg');assert.equal(bytes,encoded.buffer);assert.ok(released.includes('image')&&released.includes('context'));
});
test('large JPEG metadata remains readable for camera AND gallery source/output validation and exact upload buffer',async()=>{
 const raw=jpegWithLargeMetadata(),out=jpegWithLargeMetadata(1536,2048,1),rawCopy=raw.data.slice();
 for(const source of ['camera','gallery']){
  const selected={...asset,width:0,height:0};const outputs=[];
  class File{constructor(uri){this.uri=uri;this.exists=true;this.data=uri===asset.uri?raw.data:out.data;this.size=this.data.length;}open(){return {...byteHandle(this.data),close(){}};}async arrayBuffer(){assert.notEqual(this.uri,asset.uri);return this.data.buffer;}delete(){}}
  const manipulator={ImageManipulator:{manipulate:uri=>({resize:target=>outputs.push(target),renderAsync:async()=>({saveAsync:async options=>{assert.equal(options.format,'jpeg');return {uri:'file:///large-output.jpg',width:1536,height:2048};},release(){}}),release(){}})},SaveFormat:{JPEG:'jpeg',PNG:'png'}};
  const device=load('src/lib/create/photo-device.native.ts',{'./photo-model':model,'expo-file-system':{File},'expo-image-manipulator':manipulator});
  const photo=await device.photoDevice.prepare(selected,source);assert.deepEqual(outputs,[{width:1536,height:2048}]);const bytes=await device.readPreparedPhoto(photo);assert.equal(bytes,out.data.buffer);assert.deepEqual(raw.data,rawCopy);
 }
});
