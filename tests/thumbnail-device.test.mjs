import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function load(file,modules={}){const exports={};new Function('require','exports',ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>{assert.ok(id in modules,id);return modules[id];},exports);return exports;}
const photoModel=load('src/lib/create/photo-model.ts');
const model=load('src/lib/create/thumbnail-model.ts',{'./photo-model':photoModel});
const source={uri:'file:///original.jpg',width:1600,height:900,size:10000,mime:'image/jpeg'};
function jpeg(width,height){const bytes=new Uint8Array(30);bytes.set([255,216,255,192,0,17,8,height>>8,height&255,width>>8,width&255]);bytes.set([255,217],28);return bytes;}
function port(){const rendered=[],removed=[];let dimensions;return {rendered,removed,io:{render:async(uri,size)=>{rendered.push({uri,size});dimensions=size;return 'file:///thumbnail.jpg';},inspect:async()=>{const bytes=jpeg(dimensions.width,dimensions.height);return {size:bytes.length,bytes};},remove:uri=>removed.push(uri)}};}
test('thumbnail is separate JPEG512 at70 quality, preserves aspect and never upscales source',async()=>{
 const t=port();const result=await model.prepareThumbnailWithIO(source,new AbortController().signal,t.io);assert.deepEqual(result,{uri:'file:///thumbnail.jpg',width:512,height:288,size:30,mime:'image/jpeg'});assert.equal(model.THUMBNAIL_QUALITY,0.7);assert.deepEqual(source,{uri:'file:///original.jpg',width:1600,height:900,size:10000,mime:'image/jpeg'});assert.deepEqual(t.removed,[]);
 for(const [width,height,expected] of [[900,1600,{width:288,height:512}],[200,100,{width:200,height:100}],[1,1600,{width:1,height:512}]]){const t=port();await model.prepareThumbnailWithIO({...source,width,height},new AbortController().signal,t.io);assert.deepEqual(t.rendered[0].size,expected);}
});
test('thumbnail failures validate real file bytes, JPEG dimensions and bounded size then clean only generated output',async()=>{
 for(const inspect of [async()=>({size:1024*1024+1,bytes:new Uint8Array(1)}),async()=>({size:31,bytes:jpeg(512,288)}),async()=>({size:30,bytes:jpeg(500,288)}),async()=>({size:30,bytes:new Uint8Array(30)}),async()=>{throw Error('read failed');}]){const t=port();t.io.inspect=inspect;await assert.rejects(model.prepareThumbnailWithIO(source,new AbortController().signal,t.io));assert.deepEqual(t.removed,['file:///thumbnail.jpg']);}
 const t=port();t.io.render=async()=>source.uri;await assert.rejects(model.prepareThumbnailWithIO(source,new AbortController().signal,t.io),/separate/);assert.deepEqual(t.removed,[]);
});
test('thumbnail cancellation before rendering and after async stages rejects late output with safe cleanup',async()=>{
 let t=port(),controller=new AbortController();controller.abort();await assert.rejects(model.prepareThumbnailWithIO(source,controller.signal,t.io),/cancelled/);assert.equal(t.rendered.length,0);
 t=port();controller=new AbortController();const render=t.io.render;t.io.render=async(...args)=>{const uri=await render(...args);controller.abort();return uri;};await assert.rejects(model.prepareThumbnailWithIO(source,controller.signal,t.io),/cancelled/);assert.deepEqual(t.removed,['file:///thumbnail.jpg']);
 t=port();controller=new AbortController();const inspect=t.io.inspect;t.io.inspect=async()=>{const result=await inspect();controller.abort();return result;};await assert.rejects(model.prepareThumbnailWithIO(source,controller.signal,t.io),/cancelled/);assert.deepEqual(t.removed,['file:///thumbnail.jpg']);
});
function nativeHarness({failRender=false,failSave=false,failRenderedRelease=false}={}){const removed=[],events=[];const bytes=jpeg(512,288);const rendered={saveAsync:async options=>{events.push(options);if(failSave)throw Error('save failed');return {uri:'file:///generated.jpg'};},release(){events.push('release-image');if(failRenderedRelease)throw Error('release failed');}};const context={resize:dimensions=>events.push(dimensions),renderAsync:async()=>{if(failRender)throw Error('render failed');return rendered;},release:()=>events.push('release-context')};class File{constructor(uri){this.uri=uri;this.exists=true;this.size=bytes.length;}async arrayBuffer(){return bytes.buffer;}delete(){removed.push(this.uri);}}
 const device=load('src/lib/create/thumbnail-device.native.ts',{'./photo-model':photoModel,'./photo-device':{readPreparedPhoto:async photo=>{events.push(['verify',photo.uri]);}},'./thumbnail-model':model,'expo-file-system':{File},'expo-image-manipulator':{ImageManipulator:{manipulate:uri=>{events.push(['manipulate',uri]);return context;}},SaveFormat:{JPEG:'jpeg'}}});return {device,events,removed};}
test('native thumbnail adapter uses existing lazy JPEG encoder, releases both resources and removes only its generated files',async()=>{
 const t=nativeHarness({failRenderedRelease:true});const result=await t.device.prepareThumbnail(source,new AbortController().signal);assert.ok(t.events.includes('release-image'));assert.ok(t.events.includes('release-context'));assert.ok(t.events.some(x=>x?.compress===0.7&&x?.format==='jpeg'&&x?.base64===false));t.device.removeThumbnail(source);await new Promise(setImmediate);assert.deepEqual(t.removed,[]);t.device.removeThumbnail(result);await new Promise(setImmediate);assert.deepEqual(t.removed,['file:///generated.jpg']);t.device.removeThumbnail(result);await new Promise(setImmediate);assert.equal(t.removed.length,1);
});
test('native encoder failure still releases context/image and never deletes original',async()=>{
 for(const config of [{failRender:true},{failSave:true}]){const t=nativeHarness(config);await assert.rejects(t.device.prepareThumbnail(source,new AbortController().signal));assert.ok(t.events.includes('release-context'));if(config.failSave)assert.ok(t.events.includes('release-image'));assert.deepEqual(t.removed,[]);}
});
test('web fallback fails honestly without native imports or file deletion',async()=>{const device=load('src/lib/create/thumbnail-device.ts');await assert.rejects(device.prepareThumbnail(source,new AbortController().signal),/development client/);device.removeThumbnail(source);});
