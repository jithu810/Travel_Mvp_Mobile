import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../package.json', import.meta.url));
const { BoxGeometry } = require('three');
const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw Error('Usage: node prepare-companion.mjs source.glb output.glb');
const input = await readFile(source);
const expected = 'e825437cd4d2ee9c1960b517a74a69101e33eb409ae7fa8cedc7134a998fbb7d';
if (createHash('sha256').update(input).digest('hex') !== expected) throw Error('Unexpected upstream asset');
const doc = JSON.parse(input.subarray(20, 20 + input.readUInt32LE(12)));
const binOffset = 20 + input.readUInt32LE(12) + 8;
const binary = input.subarray(binOffset);
const blocks = [binary];
let byteLength = binary.length;
function accessor(array, type, componentType, target) {
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  const bufferView = doc.bufferViews.length;
  doc.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length, target });
  blocks.push(bytes); byteLength += bytes.length;
  const padding = (4 - byteLength % 4) % 4;
  if (padding) { blocks.push(Buffer.alloc(padding)); byteLength += padding; }
  const result = { bufferView, componentType, count: array.length / (type === 'VEC3' ? 3 : 1), type };
  if (type === 'VEC3') {
    result.min = [0,1,2].map(axis => Math.min(...Array.from(array).filter((_,i)=>i%3===axis)));
    result.max = [0,1,2].map(axis => Math.max(...Array.from(array).filter((_,i)=>i%3===axis)));
  }
  doc.accessors.push(result); return doc.accessors.length - 1;
}
for (const node of doc.nodes) {
  if (node.mesh !== undefined && !/^Rogue_(Arm|Body|Head|Leg)/.test(node.name)) delete node.mesh;
}
doc.animations = doc.animations.filter(clip => clip.name === 'Idle');
if (doc.animations.length !== 1) throw Error('Missing idle clip');
const material = doc.materials.length;
doc.materials.push({ name:'Journey backpack canvas', pbrMetallicRoughness:{ baseColorFactor:[0.18,0.35,0.25,1],metallicFactor:0,roughnessFactor:1 } });
const trim = doc.materials.length;
doc.materials.push({ name:'Journey backpack straps', pbrMetallicRoughness:{baseColorFactor:[0.58,0.33,0.14,1],metallicFactor:0,roughnessFactor:1} });
const chest = doc.nodes.find(node=>node.name==='chest');
function box(name, dimensions, translation, mat) {
  const geometry = new BoxGeometry(...dimensions);
  const mesh = doc.meshes.length;
  doc.meshes.push({name,primitives:[{attributes:{POSITION:accessor(geometry.attributes.position.array,'VEC3',5126,34962),NORMAL:accessor(geometry.attributes.normal.array,'VEC3',5126,34962)},indices:accessor(geometry.index.array,'SCALAR',5123,34963),material:mat}]});
  chest.children.push(doc.nodes.length);
  doc.nodes.push({name,mesh,translation}); geometry.dispose();
}
box('Explorer backpack',[0.58,0.58,0.28],[0,0.08,-0.40],material);
box('Backpack pocket',[0.40,0.26,0.08],[0,-0.03,-0.58],trim);
box('Backpack bedroll',[0.69,0.15,0.23],[0,0.42,-0.40],trim);
for(const x of [-0.20,0.20]) box('Backpack shoulder strap',[0.065,0.54,0.065],[x,0.09,0.25],trim);
// Keep skeleton/node indices stable; compact only used meshes/accessors/buffer views.
const allBinary = Buffer.concat(blocks);
function compact(items, used) { const indexes=[...used].sort((a,b)=>a-b); return {items:indexes.map(i=>items[i]),map:new Map(indexes.map((old,index)=>[old,index]))}; }
const meshes = compact(doc.meshes,new Set(doc.nodes.filter(n=>n.mesh!==undefined).map(n=>n.mesh)));
for(const n of doc.nodes) if(n.mesh!==undefined)n.mesh=meshes.map.get(n.mesh);
doc.meshes=meshes.items;
const usedAccessors = new Set();
for(const m of doc.meshes)for(const p of m.primitives){Object.values(p.attributes).forEach(i=>usedAccessors.add(i));if(p.indices!==undefined)usedAccessors.add(p.indices);}
for(const s of doc.skins)if(s.inverseBindMatrices!==undefined)usedAccessors.add(s.inverseBindMatrices);
for(const a of doc.animations)for(const s of a.samplers){usedAccessors.add(s.input);usedAccessors.add(s.output);}
const accessors=compact(doc.accessors,usedAccessors);
for(const m of doc.meshes)for(const p of m.primitives){for(const k in p.attributes)p.attributes[k]=accessors.map.get(p.attributes[k]);if(p.indices!==undefined)p.indices=accessors.map.get(p.indices);}
for(const s of doc.skins)if(s.inverseBindMatrices!==undefined)s.inverseBindMatrices=accessors.map.get(s.inverseBindMatrices);
for(const a of doc.animations)for(const s of a.samplers){s.input=accessors.map.get(s.input);s.output=accessors.map.get(s.output);}
doc.accessors=accessors.items;
const views=compact(doc.bufferViews,new Set([...doc.accessors.map(a=>a.bufferView),...doc.images.map(i=>i.bufferView)]));
for(const a of doc.accessors)a.bufferView=views.map.get(a.bufferView);
for(const i of doc.images)i.bufferView=views.map.get(i.bufferView);
let offset=0;const outputBlocks=[];
for(const view of views.items){outputBlocks.push(allBinary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength));view.byteOffset=offset;offset+=view.byteLength;const pad=(4-offset%4)%4;if(pad){outputBlocks.push(Buffer.alloc(pad));offset+=pad;}}
doc.bufferViews=views.items;doc.buffers=[{byteLength:offset}];
doc.asset.extras={source:'KayKit Adventurers 1.0 / Rogue',license:'CC0-1.0',modifications:'Idle only; weapons/cape removed; original geometric backpack added'};
const jsonRaw=Buffer.from(JSON.stringify(doc));const json=Buffer.concat([jsonRaw,Buffer.alloc((4-jsonRaw.length%4)%4,32)]);const bin=Buffer.concat(outputBlocks);
const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(bin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
await mkdir(new URL('.', 'file:///'+destination.replaceAll('\\','/')), {recursive:true});
const output=Buffer.concat([header,json,binHeader,bin]);await writeFile(destination,output);
const imageView = doc.bufferViews[doc.images[0].bufferView];
await writeFile(new URL('explorer-texture.png', 'file:///'+destination.replaceAll('\\','/')), bin.subarray(imageView.byteOffset, imageView.byteOffset + imageView.byteLength));
console.log(JSON.stringify({bytes:output.length,sha256:createHash('sha256').update(output).digest('hex'),triangles:doc.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>n+doc.accessors[p.indices].count/3,0),0),joints:doc.skins[0].joints.length,animations:doc.animations.map(a=>a.name)}));
