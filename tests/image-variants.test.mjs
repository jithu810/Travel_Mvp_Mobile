import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const exports={};new Function('exports',ts.transpileModule(readFileSync('src/lib/media/image-variants.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exports);
const uid='11111111-1111-4111-8111-111111111111',jid='22222222-2222-4222-8222-222222222222',pid='33333333-3333-4333-8333-333333333333';
test('thumbnail paths derive only exact version markers and preserve owner/journey/slot',()=>{
 for(const slot of ['cover','stops/'+pid])for(const ext of ['jpg','png','webp']){
  const base=`${uid}/${jid}/${slot}/${pid}`;
  assert.equal(exports.thumbnailObjectName(base+'.full-v1.'+ext),base+'.thumb-512-v1.jpg');
  assert.equal(exports.thumbnailStoragePath('journey-media/'+base+'.full-v1.'+ext),'journey-media/'+base+'.thumb-512-v1.jpg');
  assert.equal(exports.isThumbnailObjectName(base+'.thumb-512-v1.jpg'),true);
 }
 for(const bad of [`${uid}/${jid}/cover/${pid}.jpg`,`${uid}/${jid}/../${pid}.full-v1.jpg`,`${uid}/${jid}/cover/${pid}.full-v1.jpg?token=x`,'https://example.test/a.full-v1.jpg'])assert.equal(exports.thumbnailObjectName(bad),null);
 assert.equal(exports.thumbnailStoragePath(`profile-avatars/${uid}/${pid}.full-v1.jpg`),null);
});
test('stored thumbnail capability is strictly opt-in and defaults off',()=>{
 const previous=process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED;
 try{for(const value of [undefined,'false','TRUE','1','true']){if(value===undefined)delete process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED;else process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED=value;assert.equal(exports.storedThumbnailsEnabled(),value==='true');}}
 finally{if(previous===undefined)delete process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED;else process.env.EXPO_PUBLIC_STORED_THUMBNAILS_ENABLED=previous;}
});
