import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
function load(path, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(name => { assert.ok(name in deps, name); return deps[name]; }, m, m.exports); return m.exports; }
const gps = load('src/lib/journey/foreground-location.ts');
const guidance = load('src/lib/journey/turn-guidance.ts');
const off = load('src/lib/journey/off-route.ts', { './turn-guidance': guidance });
const nav = load('src/lib/journey/navigation.ts', { './turn-guidance': guidance, './off-route': off });
const arrival = load('src/lib/journey/arrival.ts', { './navigation': nav, './turn-guidance': guidance });
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const meters = n => n / 6371008.8 * 180 / Math.PI;
const xy = (x, y) => [meters(x), meters(y)];
function locationFixture() {
 let time = 100000, id = 0, active = 0, maximum = 0, watches = 0, granted = true, services = true;
 const timers = new Map(), callbacks = [], permissions = [];
 const port = { permission: async request => { permissions.push(request); return { granted, canAskAgain: true }; }, services: async () => services,
   watch: async (update, error) => { watches++; active++; maximum = Math.max(maximum, active); callbacks.push({ update, error }); let removed = false; return { remove() { if (!removed) active--; removed = true; } }; } };
 const c = gps.createForegroundLocation(port, () => time, { set(fn, ms) { timers.set(++id, { fn, ms }); return id; }, clear(i) { timers.delete(i); } });
 c.sync('active', true, true);
 return { c, port, callbacks, timers, permissions, counts: () => ({ active, maximum, watches }), setGranted(v) { granted = v; }, setServices(v) { services = v; },
   fix() { callbacks.at(-1).update({ latitude: 0, longitude: 0, accuracy: 20, timestamp: ++time }); },
   async tick() { const [i, timer] = timers.entries().next().value; timers.delete(i); time += timer.ms; timer.fn(); await flush(); return timer.ms; } };
}
test('watchdog and provider errors recover automatically with one watcher and silent permission checks', async () => {
 for (const kind of ['timeout', 'error']) {
   const f = locationFixture(); await flush(); f.fix(); const old = f.callbacks[0];
   if (kind === 'timeout') await f.tick(); else old.error();
   assert.equal(f.c.get().reason, 'temporary'); assert.equal(f.counts().active, 0);
   assert.equal(await f.tick(), 2000); f.fix(); assert.equal(f.c.get().status, 'tracking');
   old.error(); old.update({ latitude: 10, longitude: 10, accuracy: 1, timestamp: 200000 });
   assert.equal(f.c.get().position.latitude, 0); assert.equal(f.counts().maximum, 1);
   assert.ok(f.permissions.every(request => request === false)); f.c.stop();
 }
});
test('disabled services use capped backoff, then recover; denied permission stops retries', async () => {
 const f = locationFixture(); await flush(); f.setServices(false); f.callbacks[0].error();
 const delays = []; for (let i = 0; i < 7; i++) delays.push(await f.tick());
 assert.deepEqual(delays, [2000, 4000, 8000, 16000, 30000, 30000, 30000]); assert.equal(f.c.get().reason, 'services-disabled');
 f.setServices(true); await f.tick(); f.fix(); assert.equal(f.c.get().status, 'tracking');
 f.setGranted(false); f.callbacks.at(-1).error(); await f.tick();
 assert.equal(f.c.get().status, 'denied'); assert.equal(f.timers.size, 0); assert.equal(f.counts().maximum, 1);
});
test('pending recovery and obsolete callbacks cancel on lifecycle exit and session replacement', async () => {
 for (const args of [['paused', true, true], ['finished', true, true], ['completed', true, true], ['active', false, true], ['active', true, false], ['ready', true, true]]) {
   const f = locationFixture(); await flush(); f.callbacks[0].error(); const retry = [...f.timers.values()][0].fn;
   f.c.sync(...args); retry(); await flush(); assert.equal(f.timers.size, 0); assert.equal(f.counts().watches, 1); f.c.stop();
 }
 const f = locationFixture(); await flush(); f.callbacks[0].error(); const retry = [...f.timers.values()][0].fn;
 f.c.sync('active', true, true, 'active', {}); retry(); await flush();
 assert.equal(f.counts().watches, 2); assert.equal(f.counts().maximum, 1); f.c.stop();
});
test('unresolved watcher startup cannot overlap reconnect, and late subscription is removed', async () => {
 const f = locationFixture(); await flush(); f.callbacks[0].error(); let resolve, calls = 0, removed = 0;
 f.port.watch = () => { calls++; return new Promise(done => { resolve = done; }); };
 await f.tick(); await f.tick(); await f.tick(); assert.equal(calls, 1);
 resolve({ remove() { removed++; } }); await flush(); assert.equal(removed, 1);
 f.c.stop(); assert.equal(f.timers.size, 0);
});
function routeFixture() {
 const points = [xy(0,0), xy(100,0), xy(100,100), xy(200,100)];
 const steps = points.map((p,i) => ({ instruction: String(i), type: i === 0 ? 'depart' : i === 3 ? 'arrive' : 'turn', modifier: null, location: p, geometry: [p, points[Math.min(3,i+1)]], distance: i === 3 ? 0 : 100, duration: 10 }));
 return { geometry: { type: 'LineString', coordinates: points }, distance: 300, duration: 30, steps };
}
function navigationFixture(replace = () => Promise.reject(new Error('offline'))) {
 let time = 100000, id = 0; const route = routeFixture(), calls = [], timers = new Map(), session = {};
 const destination = { id: 'stop', longitude: meters(200), latitude: meters(100) };
 const c = nav.createNavigation((origin, stop, signal) => { calls.push({ origin, stop, signal }); return calls.length === 1 ? Promise.resolve(route) : replace(origin, stop, signal); }, () => time,
   { set(fn) { timers.set(++id, fn); return id; }, clear(i) { timers.delete(i); } });
 const at = (x,y,dt = 3000, accuracy = 5, patch = {}) => { time += dt; const input = { session, status: 'active', focused: true, foreground: true, destination, position: { longitude: meters(x), latitude: meters(y), timestamp: time, accuracy }, ...patch }; c.update(input); return c.get(); };
 return { c, route, calls, destination, at, async begin() { at(0,0); await flush(); }, async missed() { await this.begin(); at(55,0); at(100,20,6000); at(100,35); at(100,45); at(100,55); at(100,65); await flush(); } };
}
test('exact 55 m accepted / 100 m corner / delayed 20 m beyond scenario requests replacement without advancing old turns', async () => {
 let resolve; const f = navigationFixture(() => new Promise(done => { resolve = done; }));
 await f.missed(); assert.equal(f.calls.length, 2); assert.equal(f.c.get().status, 'loading');
 assert.equal(f.calls[1].stop, f.destination); assert.equal(f.calls[1].origin.latitude, meters(65));
 f.at(100,70); assert.equal(f.calls[1].signal.aborted, false, 'Being on the whole route must not cancel progress recovery');
 const replacement = { geometry: { type: 'LineString', coordinates: [xy(100,70),xy(200,100)] }, distance: 105, duration: 10, steps: null };
 resolve(replacement); await flush(); assert.equal(f.c.get().route, replacement); assert.equal(f.c.get().status, 'ready'); f.c.stop();
});
test('failed progress replacement needs explicit retry even after cooldown, poor GPS and fresh on-route readings', async () => {
 const f = navigationFixture(); await f.missed(); assert.equal(f.c.get().status, 'error');
 f.at(100,65,3000,60); f.at(100,65,3000,20);
 for (let i=0; i<15; i++) f.at(100,65);
 await flush(); assert.equal(f.calls.length, 2); assert.equal(f.c.get().status, 'error'); f.c.stop();
});
test('20→60→20 and 20→30→20 accuracy preserve accepted route/progress and clear unsafe instructions', async () => {
 for (const accuracy of [60,30]) {
   const f = navigationFixture(); await f.begin(); const before = f.at(40,0,3000,20).guidance.distanceToManeuver;
   const held = f.at(40,0,3000,accuracy); assert.equal(held.guidance.holdReason,'gps'); assert.equal(held.guidance.maneuver,null);
   const recovered = f.at(45,0,3000,20); assert.equal(recovered.route,f.route); assert.equal(recovered.guidance.status,'ready');
   assert.ok(recovered.guidance.distanceToManeuver < before); assert.equal(f.calls.length,1); f.c.stop();
 }
});
test('multi-turn gaps, backward travel and parallel geometry never snap to later maneuvers', () => {
 for (const point of [[150,100],[-20,0],[50,25]]) {
   let time=100000; const c=guidance.createGuidance(nav.navigationFix,()=>time), route=routeFixture();
   const at=(x,y,dt=3000,accuracy=5)=>{time+=dt;return c.update(route,{longitude:meters(x),latitude:meters(y),timestamp:time,accuracy});};
   at(0,0); at(55,0); assert.equal(at(...point,6000).status,'waiting');
   for(let i=0;i<5;i++) { const held=at(...point); assert.equal(held.maneuverIndex,null); }
   assert.equal(at(...point,3000,30).recoveryRequested,undefined);
 }
});
test('progress replacement cancels on pause, blur, background, stop change and session replacement', async () => {
 for (const patch of [{status:'paused'},{status:'finished'},{foreground:false},{focused:false},{destination:{id:'other',longitude:0,latitude:0}},{session:{}}]) {
   let resolve; const f=navigationFixture(()=>new Promise(done=>{resolve=done;})); await f.missed();
   f.at(100,65,3000,5,patch); assert.equal(f.calls[1].signal.aborted,true); resolve(f.route); await flush();
   assert.notEqual(f.c.get().route,f.route); f.c.stop();
 }
});
test('arrival sum boundary remains 50 m; measured 50/75/100 m with positive uncertainty never prompt', () => {
 for (const [distance,accuracy,likely] of [[44.99,5,true],[45,5,true],[45.01,5,false],[25,25,true],[50,0,true],[50,5,false],[75,5,false],[100,5,false]]) {
   let time=100000; const c=arrival.createArrival({},()=>time);
   for(let i=0;i<3;i++){time+=3000;c.update({status:'active',foreground:true,focused:true,locationStatus:'tracking',destination:{id:'a',name:'A',latitude:0,longitude:0},position:{latitude:0,longitude:meters(distance),accuracy,timestamp:time}});}
   assert.equal(c.get().status==='likely',likely,String([distance,accuracy]));
 }
});
test('co-located next stop requires fresh readings and old prompt cannot confirm', () => {
 let time=100000; const c=arrival.createArrival({},()=>time); let stop='a';
 const input=()=>({status:'active',foreground:true,focused:true,locationStatus:'tracking',destination:{id:stop,name:stop,latitude:0,longitude:0},position:{latitude:0,longitude:0,accuracy:5,timestamp:time}});
 for(let i=0;i<3;i++){time+=3000;c.update(input());} const old=c.get().prompt; stop='b';
 c.update(input()); assert.equal(c.get().prompt,null); assert.equal(c.canConfirm(old,input()),false);
 for(let i=0;i<2;i++){time+=3000;c.update(input());assert.equal(c.get().prompt,null);} time+=3000;c.update(input()); assert.equal(c.get().prompt.stopId,'b');
});
test('direction requires sustained provider movement, handles wraparound and falls back on poor/missing data', () => {
 let time=100000; const c=gps.createTravelDirection(); const at=(heading=359,speed=2,accuracy=5,dt=3000)=>{time+=dt;return c.update({latitude:0,longitude:0,accuracy,timestamp:time,heading,speed},time);};
 assert.equal(at(),null); assert.equal(at(),359); assert.equal(at(1),0); assert.equal(at(3),1.5);
 for(const [h,s,a] of [[null,2,5],[-1,2,5],[NaN,2,5],[360,2,5],[10,null,5],[10,0,5],[10,1,5],[10,2,30],[10,2,null]]) {
   assert.equal(at(h,s,a),null); assert.equal(at(10),null); assert.equal(at(10),10);
 }
 assert.equal(at(120),null); assert.equal(at(120),120); assert.equal(at(120,2,5,6000),null);
 assert.equal(c.update({latitude:0,longitude:0,accuracy:5,timestamp:time-15001,heading:120,speed:2},time),null);
 c.reset(); assert.equal(at(120),null);
});
test('location layers sit above both preserved routes; arrow uses map-relative rotation and compact fallback', () => {
 const source=readFileSync('src/components/journey/map/native-map.tsx','utf8');
 assert.ok(source.indexOf('id="travel-current-position"')>source.indexOf('id="travel-road-line"'));
 assert.ok(source.includes('id="planned-line-layer"')); assert.match(source,/textRotationAlignment: 'map'/);
 assert.match(source,/textRotate: currentPosition.direction/); assert.match(source,/circleRadius: 5/); assert.match(source,/circleRadius: 9/);
 assert.match(readFileSync('src/lib/journey/travel-camera.ts','utf8'),/NAVIGATION_ZOOM = 16/);
});

test('synchronous watcher failure also recovers without leaving the startup lock held', async () => {
 const f=locationFixture(); await flush(); f.callbacks[0].error(); const original=f.port.watch;
 f.port.watch=()=>{throw new Error('native failure');}; await f.tick(); assert.equal(f.c.get().status,'unavailable');
 f.port.watch=original; await f.tick(); f.fix(); assert.equal(f.c.get().status,'tracking'); assert.equal(f.counts().maximum,1); f.c.stop();
});
test('GPS expiry retains no active instructions, and restoration can recover without a Directions request', async () => {
 const f=navigationFixture(); await f.begin(); f.at(40,0);
 const held=f.at(40,0,16000,5,{position:null}); assert.equal(held.gpsHeld,true); assert.equal(held.guidance.maneuver,null);
 const restored=f.at(45,0); assert.equal(restored.guidance.status,'ready'); assert.equal(f.calls.length,1); f.c.stop();
});

test('a synchronous Pause listener cannot leave a watchdog behind after a fresh fix', async () => {
 const f=locationFixture(); await flush();
 const unsubscribe=f.c.subscribe(()=>{if(f.c.get().status==='tracking')f.c.sync('paused',true,true);});
 f.fix(); assert.equal(f.counts().active,0); assert.equal(f.timers.size,0); unsubscribe(); f.c.stop();
});
test('an obsolete queued retry cannot erase the cancellation handle for a newer retry', async () => {
 const f=locationFixture(); await flush(); f.callbacks[0].error(); const old=[...f.timers.values()][0].fn;
 f.c.sync('active',true,true,'active',{}); await flush(); f.callbacks.at(-1).error();
 old(); f.c.sync('paused',true,true); assert.equal(f.timers.size,0);
});
