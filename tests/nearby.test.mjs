import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const module={exports:{}};
new Function('exports',ts.transpileModule(readFileSync('src/lib/journey/nearby.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(module.exports);
const {nearbyFocus}=module.exports;
const p=(id,x,y=0)=>({id,name:id,coordinate:[x,y]});
test('nearby selection zooms only when screen separation requires it and leaves input locations unchanged',()=>{
 const points=[p('a',76,9),p('b',76.0005,9)];const before=JSON.stringify(points);
 const focused=nearbyFocus(points,'a',10);assert.ok(focused.zoomLevel>10);assert.ok(focused.zoomLevel<=16);assert.equal(JSON.stringify(points),before);
 assert.equal(nearbyFocus([p('a',0),p('b',70)],'a',5).zoomLevel,5);
 assert.equal(nearbyFocus([p('a',0)],'a',6).zoomLevel,6);
 assert.equal(nearbyFocus(points,'missing',10),null);
 assert.equal(nearbyFocus([p('a',NaN)],'a',10),null);
});
test('coincident and sub-marker-distance locations get a chooser without invented offsets',()=>{
 const points=[p('a',0),p('b',0),p('c',0.00001),p('far',30)];const result=nearbyFocus(points,'a',12);
 assert.deepEqual(result.choices.map(p=>p.id),['a','b','c']);assert.deepEqual(result.centerCoordinate,[0,0]);assert.ok(result.zoomLevel<=16);
 const dateline=nearbyFocus([p('a',179.9999),p('b',-179.9999)],'a',10);assert.ok(dateline.zoomLevel>10);
 const polar=nearbyFocus([p('a',0,90),p('b',0,89.9999)],'a',10);assert.ok(Number.isFinite(polar.zoomLevel));assert.ok(polar.centerCoordinate[1]<90);
});
