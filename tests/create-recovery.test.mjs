import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(file, modules = {}, clock = globalThis) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', code)(name => { assert.ok(name in modules, name); return modules[name]; }, exports, clock.setTimeout, clock.clearTimeout);
  return exports;
}
const tick = async () => { for (let i = 0; i < 10; i++) await new Promise(setImmediate); };
const model = load('src/lib/create/model.ts', { '../discovery/model': { isJourneyId: value => /^[0-9a-f-]{36}$/i.test(value) } });
const memory = load('src/lib/create/memory.ts', { './model': model });
const recovery = load('src/lib/create/recovery.ts');
const uid = '22222222-2222-4222-8222-222222222222', other = '44444444-4444-4444-8444-444444444444';
const draftId = '11111111-1111-4111-8111-111111111111', stopId = '33333333-3333-4333-8333-333333333333', newId = '55555555-5555-4555-8555-555555555555';
const place = { name: 'Varkala', label: 'Varkala, Kerala', latitude: 8.7, longitude: 76.7, mapboxId: 'place' };
const savedAt = '2026-10-14T10:00:00.123456Z';
const stop = { id: stopId, name: 'Beach', description: 'old', latitude: 8.7, longitude: 76.7, mapboxId: 'p1', photoPath: 'journey-media/raw/stop.png', day: '1', rating: '' };
const draft = { ...model.newForm(draftId), title: 'Saved', destination: place, traveler: 'solo', updatedAt: savedAt, coverPath: 'journey-media/raw/cover.png', stops: [stop] };

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed)), calls = [];
  return { data, calls,
    getItem: async key => { calls.push(['get', key]); return data.has(key) ? data.get(key) : null; },
    setItem: async (key, value) => { calls.push(['set', key]); data.set(key, value); },
    removeItem: async key => { calls.push(['remove', key]); data.delete(key); },
    getAllKeys: async () => [...data.keys()] };
}
const failingStorage = () => ({ getItem: async () => { throw Error('disk'); }, setItem: () => { throw Error('disk'); }, removeItem: async () => { throw Error('disk'); }, getAllKeys: async () => { throw Error('disk'); } });
const NOW = Date.parse('2026-10-30T00:00:00Z'), DAY = 24 * 60 * 60 * 1000;
const snapshotJson = (user, form, extra = {}) => JSON.stringify({ ...recovery.buildSnapshot(user, form, null, false, NOW - 1000), ...extra });
const ids = () => { let n = 0; return () => '77777777-7777-4777-8777-' + String(++n).padStart(12, '0'); };
const newStore = (storage, now = NOW) => recovery.createCreationRecovery(storage, () => now);
function fakeTimers() {
  let serial = 0; const pending = new Map();
  return { pending, setTimeout: (fn, ms) => { pending.set(++serial, { fn, ms }); return serial; }, clearTimeout: key => pending.delete(key),
    run() { const due = [...pending.values()]; pending.clear(); due.forEach(timer => timer.fn()); } };
}

test('recovery keys are private to one signed-in user and one journey', () => {
  assert.equal(recovery.recoveryKey(uid, draftId), 'journey-recovery:v1:' + uid + ':' + draftId);
  assert.notEqual(recovery.recoveryKey(uid, draftId), recovery.recoveryKey(other, draftId));
  assert.notEqual(recovery.recoveryKey(uid, draftId), recovery.recoveryKey(uid, newId));
  assert.ok(recovery.recoveryKey(uid, draftId).startsWith(recovery.recoveryPrefix(uid)));
  assert.ok(!recovery.recoveryKey(other, draftId).startsWith(recovery.recoveryPrefix(uid)));
});

test('snapshots strip unsaved local photos, keep saved paths and say photos were dropped', () => {
  const local = { ...draft, coverPath: 'file:///cache/cover.jpg', stops: [stop, { ...stop, id: newId, photoPath: 'content://media/1' }] };
  const edit = { value: { ...stop, description: 'typing', photoPath: 'file:///cache/m.jpg' }, baseline: { ...stop }, isNew: false };
  const snapshot = recovery.buildSnapshot(uid, local, edit, false, 5);
  assert.equal(snapshot.form.coverPath, null); assert.equal(snapshot.form.stops[0].photoPath, 'journey-media/raw/stop.png');
  assert.equal(snapshot.form.stops[1].photoPath, null); assert.equal(snapshot.memoryEdit.value.photoPath, null); assert.equal(snapshot.memoryEdit.value.description, 'typing');
  assert.equal(snapshot.droppedPhotos, true);
  assert.equal(recovery.buildSnapshot(uid, draft, null, false, 5).droppedPhotos, false, 'Saved remote paths are not local photos');
  assert.equal(recovery.buildSnapshot(uid, draft, null, true, 5).droppedPhotos, true, 'Picked-but-unsaved candidates are dropped and noted');
  assert.match(recovery.recoveryPrompt({ droppedPhotos: true }).body, /New photos that weren’t saved can’t be restored\./);
  assert.doesNotMatch(recovery.recoveryPrompt({ droppedPhotos: false }).body, /photos/);
  assert.equal(recovery.recoveryPrompt({ droppedPhotos: false }).title, 'Restore unsaved changes?');
});

test('parse rejects corrupt, other-user, other-journey and wrong-version snapshots', () => {
  const good = snapshotJson(uid, { ...draft, title: 'Edited' });
  assert.equal(recovery.parseSnapshot(good, uid, draftId).form.title, 'Edited');
  assert.equal(recovery.parseSnapshot('{not json', uid, draftId), null);
  assert.equal(recovery.parseSnapshot(good, other, draftId), null);
  assert.equal(recovery.parseSnapshot(good, uid, newId), null);
  assert.equal(recovery.parseSnapshot(snapshotJson(uid, draft, { version: 2 }), uid, draftId), null);
  assert.equal(recovery.parseSnapshot(snapshotJson(uid, draft, { form: { ...draft, stops: [{ ...stop, latitude: 'x' }] } }), uid, draftId), null);
  assert.equal(recovery.parseSnapshot(snapshotJson(uid, draft, { form: { ...draft, traveler: 'robot' } }), uid, draftId), null);
  const injected = recovery.parseSnapshot(snapshotJson(uid, draft, { form: { ...draft, status: 'published', extra: 1 } }), uid, draftId);
  assert.equal('extra' in injected.form, false, 'Only known editor fields are kept');
});

test('restore is offered only for edits made on the same saved base version', () => {
  const snapshot = recovery.parseSnapshot(snapshotJson(uid, draft), uid, draftId);
  assert.equal(recovery.hasSameBaseVersion(snapshot, draft), true);
  assert.equal(recovery.hasSameBaseVersion(snapshot, { ...draft, updatedAt: '2026-10-14T10:00:00.123456+00:00' }), true, 'Same instant in another format');
  assert.equal(recovery.hasSameBaseVersion(snapshot, { ...draft, updatedAt: '2026-10-15T10:00:00Z' }), false, 'Saved since: stale');
  const fresh = recovery.parseSnapshot(snapshotJson(uid, model.newForm(newId)), uid, newId);
  assert.equal(recovery.hasSameBaseVersion(fresh, model.newForm(draftId)), true);
  assert.equal(recovery.hasSameBaseVersion(fresh, draft), false);
  const restored = recovery.restoredState(recovery.parseSnapshot(snapshotJson(uid, { ...draft, title: 'Mine', sourceId: other }), uid, draftId), { ...draft, sourceId: undefined }, ids());
  assert.equal(restored.form.title, 'Mine'); assert.equal(restored.form.updatedAt, savedAt); assert.equal(restored.form.id, draftId); assert.equal('sourceId' in restored.form, false, 'Remix credit comes from the loaded draft only');
  assert.equal(restored.form.stops[0].id, stopId, 'Saved drafts keep their stop ids'); assert.equal(restored.snapshotId, draftId);
});

test('finding 1: a new-journey restore moves content into a fresh journey id with new stop ids and drops the memory edit', () => {
  const edit = { value: { ...stop, description: 'half' }, baseline: { ...stop }, isNew: false };
  const snapshot = recovery.parseSnapshot(JSON.stringify(recovery.buildSnapshot(uid, { ...model.newForm(newId), title: 'Maybe on server', destination: place, stops: [stop] }, edit, false, NOW)), uid, newId);
  const fresh = model.newForm('66666666-6666-4666-8666-666666666666');
  const restored = recovery.restoredState(snapshot, fresh, ids());
  assert.equal(restored.form.id, fresh.id, 'Never reuses an id that may exist or have been deleted');
  assert.equal(restored.snapshotId, newId); assert.equal(restored.form.updatedAt, null); assert.equal(restored.form.title, 'Maybe on server');
  assert.notEqual(restored.form.stops[0].id, stopId); assert.equal(restored.form.stops[0].name, 'Beach');
  assert.equal(restored.memoryEdit, null);
});

test('store: same-base draft snapshot is returned; stale, corrupt and other-user data are never offered', async () => {
  const storage = memoryStorage(), store = newStore(storage);
  await store.save(uid, { ...draft, title: 'Unsaved title', stops: [{ ...stop, description: 'new text' }] }, null, false);
  const found = await store.find(uid, draft, ids());
  assert.equal(found.form.title, 'Unsaved title'); assert.equal(found.form.stops[0].description, 'new text'); assert.equal(found.droppedPhotos, false);
  assert.equal(await store.find(other, draft, ids()), null, 'Another user never sees it');
  assert.ok(storage.data.has(recovery.recoveryKey(uid, draftId)));
  assert.equal(await store.find(uid, { ...draft, updatedAt: '2026-10-20T00:00:00Z' }, ids()), null);
  assert.equal(storage.data.has(recovery.recoveryKey(uid, draftId)), false, 'Stale snapshot removed');
  storage.data.set(recovery.recoveryKey(uid, draftId), '{"version":1,"broken"');
  assert.equal(await store.find(uid, draft, ids()), null); assert.equal(storage.data.has(recovery.recoveryKey(uid, draftId)), false, 'Corrupt snapshot removed');
  storage.data.set(recovery.recoveryKey(uid, draftId), snapshotJson(other, draft));
  assert.equal(await store.find(uid, draft, ids()), null, 'A payload naming another user is ignored'); assert.equal(storage.data.size, 0);
});

test('store: new journeys recover the newest unsaved new-journey snapshot for this user only', async () => {
  const storage = memoryStorage({
    [recovery.recoveryKey(uid, newId)]: JSON.stringify(recovery.buildSnapshot(uid, { ...model.newForm(newId), title: 'Newest' }, null, false, NOW - 20)),
    [recovery.recoveryKey(uid, stopId)]: JSON.stringify(recovery.buildSnapshot(uid, { ...model.newForm(stopId), title: 'Older' }, null, false, NOW - 30)),
    [recovery.recoveryKey(uid, draftId)]: snapshotJson(uid, draft),
    [recovery.recoveryKey(other, draftId)]: JSON.stringify(recovery.buildSnapshot(other, { ...model.newForm(draftId), title: 'Theirs' }, null, false, NOW - 10)),
  });
  const store = newStore(storage), fresh = model.newForm('66666666-6666-4666-8666-666666666666');
  const found = await store.find(uid, fresh, ids());
  assert.equal(found.form.title, 'Newest'); assert.equal(found.snapshotId, newId); assert.equal(found.form.id, fresh.id);
  assert.equal(storage.data.has(recovery.recoveryKey(uid, stopId)), false, 'Older unreachable new-journey copy removed');
  assert.ok(storage.data.has(recovery.recoveryKey(uid, draftId)), 'Saved-draft snapshots are left for their own draft');
  assert.ok(storage.data.has(recovery.recoveryKey(other, draftId)), 'Other user data untouched');
});

test('finding 2: a journey open in another mounted editor is never offered to a second new editor', async () => {
  const storage = memoryStorage({ [recovery.recoveryKey(uid, newId)]: JSON.stringify(recovery.buildSnapshot(uid, { ...model.newForm(newId), title: 'Open elsewhere' }, null, false, NOW)) });
  const store = newStore(storage), fresh = model.newForm('66666666-6666-4666-8666-666666666666');
  const release = store.claim(uid, newId), second = store.claim(uid, newId);
  assert.equal(await store.find(uid, fresh, ids()), null); assert.ok(storage.data.has(recovery.recoveryKey(uid, newId)), 'Owned copy left alone');
  release(); release();
  assert.equal(await store.find(uid, fresh, ids()), null, 'Still owned by the second editor');
  second();
  assert.equal((await store.find(uid, fresh, ids())).form.title, 'Open elsewhere');
});

test('finding 5: listing and lookups prune snapshots older than 30 days', async () => {
  const old = NOW - 31 * DAY;
  const storage = memoryStorage({
    [recovery.recoveryKey(uid, newId)]: JSON.stringify(recovery.buildSnapshot(uid, model.newForm(newId), null, false, old)),
    [recovery.recoveryKey(uid, stopId)]: JSON.stringify(recovery.buildSnapshot(uid, { ...draft, id: stopId }, null, false, old)),
    [recovery.recoveryKey(uid, draftId)]: JSON.stringify(recovery.buildSnapshot(uid, draft, null, false, old)),
  });
  const store = newStore(storage);
  assert.equal(await store.find(uid, model.newForm('66666666-6666-4666-8666-666666666666'), ids()), null);
  assert.equal(storage.data.size, 0, 'Listing pruned every copy older than 30 days');
  storage.data.set(recovery.recoveryKey(uid, draftId), JSON.stringify(recovery.buildSnapshot(uid, draft, null, false, old)));
  assert.equal(await store.find(uid, draft, ids()), null); assert.equal(storage.data.size, 0, 'Old copy of an open draft pruned too');
  storage.data.set(recovery.recoveryKey(uid, draftId), JSON.stringify(recovery.buildSnapshot(uid, draft, null, false, NOW - 29 * DAY)));
  assert.ok(await store.find(uid, draft, ids()), 'Within 30 days is still offered');
});

test('store: Discard/save clear one journey and sign-out clears only that user', async () => {
  const storage = memoryStorage(), store = newStore(storage);
  await store.save(uid, draft, null, false); await store.save(uid, model.newForm(newId), null, false); await store.save(other, draft, null, false);
  await store.clear(uid, draftId);
  assert.deepEqual([...storage.data.keys()].sort(), [recovery.recoveryKey(other, draftId), recovery.recoveryKey(uid, newId)].sort());
  await store.clearUser(uid);
  assert.deepEqual([...storage.data.keys()], [recovery.recoveryKey(other, draftId)]);
  await store.save(uid, draft, null, false); assert.equal(storage.data.size, 1, 'Late writes for a signed-out user are dropped');
  store.claim(uid, draftId); await store.save(uid, draft, null, false); assert.equal(storage.data.size, 2, 'An editor for that user re-enables writes');
});

test('store: operations stay ordered so a clear after a write wins', async () => {
  const storage = memoryStorage(), store = newStore(storage);
  const write = store.save(uid, draft, null, false), clear = store.clear(uid, draftId);
  await Promise.all([write, clear]);
  assert.equal(storage.data.size, 0);
});

test('store: storage failures never throw and offer nothing', async () => {
  const store = newStore(failingStorage());
  await assert.doesNotReject(store.save(uid, draft, null, false));
  assert.equal(await store.find(uid, draft, ids()), null);
  assert.equal(await store.find(uid, model.newForm(newId), ids()), null);
  await assert.doesNotReject(store.clear(uid, draftId)); await assert.doesNotReject(store.clearUser(uid));
  const working = memoryStorage(), recovered = newStore({ ...working, setItem: () => Promise.reject(Error('full')) });
  await recovered.save(uid, draft, null, false); await recovered.save(uid, draft, null, false);
  assert.equal(await recovered.find(uid, draft, ids()), null, 'Queue keeps working after a failed write');
});

test('debounce collapses rapid edits into one write; cancel and flush behave', async () => {
  const timers = fakeTimers(), debounce = recovery.createRecoveryDebounce(800, timers), runs = [];
  debounce.schedule(() => runs.push(1)); debounce.schedule(() => runs.push(2)); debounce.schedule(() => runs.push(3));
  assert.equal(timers.pending.size, 1); assert.equal([...timers.pending.values()][0].ms, 800);
  timers.run(); await tick(); assert.deepEqual(runs, [3]);
  debounce.schedule(() => runs.push(4)); debounce.cancel(); timers.run(); await tick(); assert.deepEqual(runs, [3]);
  debounce.schedule(() => runs.push(5)); debounce.flush(); assert.equal(timers.pending.size, 0); await tick(); assert.deepEqual(runs, [3, 5]);
  debounce.schedule(() => { throw Error('boom'); }); debounce.flush(); await tick();
});

// Minimal hook harness: state/ref/effect slots like the other component tests.
function harness() {
  const slots = []; let cursor = 0, effects = [];
  const memo = (fn, deps) => { const i = cursor++; if (!slots[i] || deps.some((v, j) => slots[i].deps[j] !== v)) slots[i] = { value: fn(), deps }; return slots[i].value; };
  const hooks = { useMemo: memo, useCallback: (fn, deps) => memo(() => fn, deps),
    useState: value => { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; },
    useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },
    useEffect: (fn, deps) => { const i = cursor++; if (!deps || !slots[i] || deps.some((v, j) => slots[i].deps?.[j] !== v)) { slots[i]?.cleanup?.(); const slot = { deps }; slots[i] = slot; effects.push(() => { slot.cleanup = fn(); }); } },
  };
  return { hooks, unmount() { slots.forEach(slot => slot?.cleanup?.()); }, render(fn, props) { cursor = 0; effects = []; const result = fn(props); effects.forEach(run => run()); return result; } };
}
function hookHarness(seed = {}, shared = null) {
  const storage = shared?.storage || memoryStorage(seed), timers = fakeTimers(), h = harness(), alerts = [], restored = [], appListeners = [];
  const store = shared?.store || newStore(storage);
  let focusEffect = null, blur = null, accept = true;
  const rn = { Alert: { alert: (...args) => alerts.push(args) }, AppState: { addEventListener: (_type, fn) => { appListeners.push(fn); return { remove() {} }; } } };
  const recoveryModule = load('src/lib/create/recovery.ts', {}, timers);
  const { useCreationRecovery } = load('src/hooks/use-creation-recovery.ts', { react: h.hooks, 'react-native': rn, 'expo-router': { useFocusEffect: fn => { focusEffect = fn; } },
    '@/lib/create/recovery-store': { creationRecovery: store }, '@/lib/create/recovery': recoveryModule, '@/lib/create/memory': memory, '@/lib/create/id': { randomUUID: ids() } }, timers);
  let props = { userId: uid, form: draft, memoryEdit: null, dirty: false, hasLocalPhotos: false, onRestore: value => { if (!accept) return false; restored.push(value); return true; } };
  let clear;
  const render = (patch = {}) => { props = { ...props, ...patch }; clear = h.render(useCreationRecovery, props); return clear; };
  const api = { storage, store, timers, alerts, restored, appListeners, render, clear: id => clear(id), unmount: h.unmount,
    focus() { blur = focusEffect(); }, blur() { blur?.(); blur = null; }, refuse() { accept = false; },
    // Mount, become the focused screen, let the storage check finish and re-render.
    async open(patch = {}) { render(patch); api.focus(); await tick(); render(); return api; } };
  return api;
}
const key = recovery.recoveryKey(uid, draftId);
const writes = storage => storage.calls.filter(([kind]) => kind === 'set');

test('hook writes a snapshot only while there are unsaved edits, debounced', async () => {
  const h = await hookHarness().open();
  assert.equal(h.alerts.length, 0, 'Nothing to restore');
  h.render({ form: { ...draft, title: 'Typing' } }); await tick();
  assert.equal(h.timers.pending.size, 0, 'Not dirty: nothing scheduled');
  h.render({ form: { ...draft, title: 'T' }, dirty: true }); h.render({ form: { ...draft, title: 'Tr' } }); h.render({ form: { ...draft, title: 'Trip' } });
  assert.equal(writes(h.storage).length, 0, 'Debounced: no write yet');
  assert.equal(h.timers.pending.size, 1);
  h.timers.run(); await tick();
  assert.equal(writes(h.storage).length, 1);
  assert.equal(JSON.parse(h.storage.data.get(key)).form.title, 'Trip');
  const edit = { value: { ...stop, description: 'draft words' }, baseline: { ...stop }, isNew: false };
  h.render({ dirty: false, memoryEdit: edit }); h.timers.run(); await tick();
  assert.equal(JSON.parse(h.storage.data.get(key)).memoryEdit.value.description, 'draft words');
  h.render({ memoryEdit: null }); assert.equal(h.timers.pending.size, 0, 'Back to clean cancels pending writes');
});

test('hook flushes pending edits when the app leaves the foreground and cancels on unmount', async () => {
  const h = await hookHarness().open();
  h.render({ form: { ...draft, title: 'Quick' }, dirty: true });
  h.appListeners.forEach(fn => fn('background')); await tick();
  assert.equal(JSON.parse(h.storage.data.get(key)).form.title, 'Quick');
  h.render({ form: { ...draft, title: 'Later' } }); h.unmount(); h.timers.run(); await tick();
  assert.equal(JSON.parse(h.storage.data.get(key)).form.title, 'Quick');
});

test('hook prompts only for a same-base snapshot; Restore refills local state and never saves', async () => {
  const edit = { value: { ...stop, description: 'half written', photoPath: 'file:///cache/new.jpg' }, baseline: { ...stop }, isNew: false };
  const seeded = JSON.stringify(recovery.buildSnapshot(uid, { ...draft, title: 'Recovered', stops: [{ ...stop, name: 'Renamed' }] }, edit, false, NOW));
  const h = await hookHarness({ [key]: seeded }).open();
  assert.equal(h.alerts.length, 1);
  const [title, body, buttons, options] = h.alerts[0];
  assert.equal(title, 'Restore unsaved changes?'); assert.match(body, /New photos that weren’t saved can’t be restored/);
  assert.deepEqual(buttons.map(b => b.text), ['Discard', 'Restore']); assert.equal(options.cancelable, false);
  assert.equal(h.restored.length, 0, 'Never restored automatically');
  const before = h.storage.calls.length;
  buttons.find(b => b.text === 'Restore').onPress(); await tick();
  assert.equal(h.restored.length, 1);
  assert.equal(h.restored[0].form.title, 'Recovered'); assert.equal(h.restored[0].form.stops[0].name, 'Renamed'); assert.equal(h.restored[0].form.updatedAt, savedAt);
  assert.equal(h.restored[0].memoryEdit.value.description, 'half written'); assert.equal(h.restored[0].memoryEdit.value.photoPath, null);
  assert.equal(h.storage.calls.length, before, 'Restore itself performs no storage or server writes');
  const stale = await hookHarness({ [key]: seeded }).open({ form: { ...draft, updatedAt: '2026-10-20T00:00:00Z' } });
  assert.equal(stale.alerts.length, 0); assert.equal(stale.storage.data.has(key), false);
});

test('hook never shows another user the same journey snapshot', async () => {
  const theirKey = recovery.recoveryKey(other, draftId), theirs = JSON.stringify(recovery.buildSnapshot(other, { ...draft, title: 'Their edits' }, null, false, NOW));
  const h = await hookHarness({ [theirKey]: theirs }).open();
  assert.equal(h.alerts.length, 0); assert.equal(h.storage.data.get(theirKey), theirs, 'The other user copy is untouched');
  // A payload naming the other user, even under this user's key, is ignored and removed.
  const spoof = await hookHarness({ [key]: theirs }).open();
  assert.equal(spoof.alerts.length, 0); assert.equal(spoof.storage.data.has(key), false);
});

test('finding 1 (hook): new-journey Restore uses the fresh editor id and drops the old copy', async () => {
  const oldKey = recovery.recoveryKey(uid, newId), fresh = model.newForm('66666666-6666-4666-8666-666666666666');
  const h = await hookHarness({ [oldKey]: JSON.stringify(recovery.buildSnapshot(uid, { ...model.newForm(newId), title: 'Mine', destination: place }, null, false, NOW)) }).open({ form: fresh });
  h.alerts[0][2].find(b => b.text === 'Restore').onPress(); await tick();
  assert.equal(h.restored[0].form.id, fresh.id); assert.equal(h.storage.data.has(oldKey), false, 'Old id copy removed');
  h.render({ form: h.restored[0].form, dirty: true }); h.timers.run(); await tick();
  assert.equal(JSON.parse(h.storage.data.get(recovery.recoveryKey(uid, fresh.id))).form.title, 'Mine', 'Later writes use the fresh id');
});

test('finding 2 (hook): a mounted editor claims its journey so a second new editor is not offered it', async () => {
  const shared = { storage: memoryStorage() }; shared.store = newStore(shared.storage);
  const first = await hookHarness({}, shared).open({ form: { ...model.newForm(newId), title: 'Open' }, dirty: true });
  first.timers.run(); await tick(); assert.ok(shared.storage.data.has(recovery.recoveryKey(uid, newId)));
  const second = await hookHarness({}, shared).open({ form: model.newForm('66666666-6666-4666-8666-666666666666') });
  assert.equal(second.alerts.length, 0);
  first.unmount();
  const third = await hookHarness({}, shared).open({ form: model.newForm('88888888-8888-4888-8888-888888888888') });
  assert.equal(third.alerts.length, 1, 'Released after the first editor closes');
});

test('finding 3: edits typed before the check still get the prompt and never overwrite the copy until the user chooses', async () => {
  const seeded = snapshotJson(uid, { ...draft, title: 'Recovered' });
  const h = await hookHarness({ [key]: seeded }).open({ form: { ...draft, title: 'Typed first' }, dirty: true });
  assert.equal(h.alerts.length, 1);
  h.render({ form: { ...draft, title: 'Typed more' } }); h.timers.run(); await tick();
  assert.equal(h.storage.data.get(key), seeded, 'Copy untouched while the prompt is open');
  h.alerts[0][2].find(b => b.text === 'Discard').onPress(); h.timers.run(); await tick();
  assert.equal(JSON.parse(h.storage.data.get(key)).form.title, 'Typed more', 'Discard keeps current edits, which replace the copy');
  const r = await hookHarness({ [key]: seeded }).open({ form: { ...draft, title: 'Typed first' }, dirty: true });
  r.alerts[0][2].find(b => b.text === 'Restore').onPress();
  assert.equal(r.restored[0].form.title, 'Recovered', 'Restore replaces edits typed meanwhile');
});

test('finding 4: the prompt waits for the editor to be focused and shows once per mount', async () => {
  const seeded = snapshotJson(uid, { ...draft, title: 'Recovered' });
  const h = hookHarness({ [key]: seeded }); h.render(); await tick(); h.render(); await tick(); h.render();
  assert.equal(h.alerts.length, 0, 'Not focused (e.g. under Sign in): no prompt yet');
  h.focus(); h.render(); assert.equal(h.alerts.length, 1);
  h.blur(); h.render(); h.focus(); h.render(); assert.equal(h.alerts.length, 1, 'Only once per mount');
});

test('hook Discard and explicit clear remove the snapshot', async () => {
  const seeded = snapshotJson(uid, { ...draft, title: 'Recovered' });
  const h = await hookHarness({ [key]: seeded }).open();
  h.alerts[0][2].find(b => b.text === 'Discard').onPress(); await tick();
  assert.equal(h.storage.data.has(key), false); assert.equal(h.restored.length, 0);
  const saved = await hookHarness().open();
  saved.render({ form: { ...draft, title: 'Edit' }, dirty: true }); saved.timers.run(); await tick();
  assert.ok(saved.storage.data.has(key));
  saved.render({ form: { ...draft, title: 'Edit 2' } }); saved.clear(); saved.timers.run(); await tick();
  assert.equal(saved.storage.data.has(key), false, 'Clear after save removes it and cancels the pending write');
});

test('Restore ignored while the editor is busy keeps the stored copy', async () => {
  const oldKey = recovery.recoveryKey(uid, newId), seeded = JSON.stringify(recovery.buildSnapshot(uid, { ...model.newForm(newId), title: 'Mine' }, null, false, NOW));
  const h = await hookHarness({ [oldKey]: seeded }).open({ form: model.newForm('66666666-6666-4666-8666-666666666666') });
  h.refuse(); h.alerts[0][2].find(b => b.text === 'Restore').onPress(); await tick();
  assert.equal(h.restored.length, 0); assert.equal(h.storage.data.get(oldKey), seeded);
});

test('sign-out with a mounted editor holding a pending write leaves nothing behind', async () => {
  const h = await hookHarness().open();
  h.render({ form: { ...draft, title: 'Pending' }, dirty: true });
  assert.equal(h.timers.pending.size, 1);
  await h.store.clearUser(uid);
  h.timers.run(); await tick(); h.appListeners.forEach(fn => fn('background')); await tick();
  assert.equal(h.storage.data.size, 0, 'The pending write cannot recreate a signed-out user copy');
});
