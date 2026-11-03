import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(path, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'exports', code)(name => { if (!(name in modules)) throw Error(name); return modules[name]; }, exports);
  return exports;
}
const { createConnectionsController } = load('src/lib/connections/model.ts');
const viewer = '11111111-1111-4111-8111-111111111111', peer = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const otherRequest = '44444444-4444-4444-8444-444444444444';
const summary = (targetId = peer, patch = {}) => ({ targetId, friendStatus: 'none', requestId: null, requestRevision: null, following: false, followRevision: 0, friendsCount: 0, followingCount: 0, unreadCount: 0, ...patch });
const item = (patch = {}) => ({ id: requestId, person: { id: peer, username: 'traveler', displayName: 'Traveler', avatar: null }, requestId, revision: 1, status: 'pending', kind: null, readAt: null, createdAt: '2026-11-02T00:00:00Z', ...patch });
const tick = () => new Promise(setImmediate);
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('anonymous/self controllers never create friendships or follows and unavailable reads disable every write', async () => {
  const anonymous = createConnectionsController(null, peer, null, () => { throw Error('No request intent expected'); });
  anonymous.resume();await anonymous.requestFriend();assert.equal(anonymous.getSnapshot().summary, null);anonymous.dispose();
  let writes = 0;
  const own = createConnectionsController({ read: async () => summary(viewer), list: async () => ({ items: [], nextCursor: null }), write: async () => { writes++; } }, viewer, viewer, () => requestId);
  own.resume();await tick();await own.requestFriend();await own.act(viewer, { action: 'follow', enabled: true, expectedRevision: 0 });assert.equal(writes, 0);own.dispose();
  const missing = createConnectionsController({ read: async () => { throw Error('Connections are not available in this build yet.'); }, write: async () => { writes++; } }, peer, viewer, () => requestId);
  missing.resume();await tick();assert.equal(missing.getSnapshot().error, 'Connections are not available in this build yet.');await missing.requestFriend();assert.equal(writes, 0);missing.dispose();
});

test('friend requests keep one UUID for duplicate presses and friendship/following remain independent', async () => {
  let state = summary(), ids = 0; const writes = [], pending = deferred();
  const controller = createConnectionsController({ read: async () => state, write: async (id, command) => { writes.push([id, command]);await pending.promise;return state = summary(peer, { friendStatus: 'outgoing', requestId: command.requestId, requestRevision: 1 }); } }, peer, viewer, () => { ids++;return requestId; });
  controller.resume();await tick();const first = controller.requestFriend();void controller.requestFriend();
  assert.equal(writes.length, 1);assert.equal(ids, 1);assert.equal(controller.getSnapshot().busy, 'request');
  assert.equal(controller.getSnapshot().summary.friendStatus, 'none', 'No optimistic requested state');
  pending.resolve();await first;assert.equal(controller.getSnapshot().summary.friendStatus, 'outgoing');assert.equal(controller.getSnapshot().summary.following, false);
  await controller.requestFriend();assert.equal(writes.length, 1);controller.dispose();
});

test('incoming acceptance and follow desired state use current revisions and reject stale actions before writes', async () => {
  let state = summary(peer, { friendStatus: 'incoming', requestId, requestRevision: 3 });const writes = [];
  const controller = createConnectionsController({ read: async () => state, write: async (_id, command) => {
    writes.push(command);
    return state = command.action === 'accept' ? { ...state, friendStatus: 'friends', friendsCount: 1 } : { ...state, following: command.enabled, followRevision: state.followRevision + 1, followingCount: command.enabled ? 1 : 0 };
  } }, peer, viewer, () => requestId);
  controller.resume();await tick();
  await controller.act(peer, { action: 'accept', requestId, expectedRevision: 2 });await controller.act(peer, { action: 'cancel', requestId, expectedRevision: 3 });assert.equal(writes.length, 0);
  await controller.act(peer, { action: 'accept', requestId, expectedRevision: 3 });assert.equal(controller.getSnapshot().summary.friendStatus, 'friends');assert.equal(controller.getSnapshot().summary.following, false);
  await controller.act(peer, { action: 'follow', enabled: true, expectedRevision: 0 });assert.equal(controller.getSnapshot().summary.following, true);assert.equal(controller.getSnapshot().summary.friendStatus, 'friends');
  await controller.act(peer, { action: 'follow', enabled: false, expectedRevision: 0 });assert.equal(writes.length, 2);
  await controller.act(peer, { action: 'follow', enabled: false, expectedRevision: 1 });assert.equal(controller.getSnapshot().summary.friendStatus, 'friends');assert.equal(controller.getSnapshot().summary.following, false);controller.dispose();
});

test('uncertain writes require a fresh authoritative read, never automatically resend, and reject mismatched results', async () => {
  let state = summary(), mode = 'timeout', writes = 0;const delayed = deferred();
  const controller = createConnectionsController({ read: async () => state, write: async () => { writes++;return mode === 'timeout' ? delayed.promise : summary(); } }, peer, viewer, () => requestId, 8);
  controller.resume();await tick();await controller.requestFriend();assert.equal(controller.getSnapshot().uncertain, true);assert.equal(controller.getSnapshot().summary, null);
  await controller.requestFriend();assert.equal(writes, 1);state = summary(peer, { friendStatus: 'outgoing', requestId, requestRevision: 1 });
  await controller.load();assert.equal(controller.getSnapshot().uncertain, false);assert.equal(writes, 1);assert.equal(controller.getSnapshot().summary.friendStatus, 'outgoing');
  delayed.resolve(summary());await tick();assert.equal(controller.getSnapshot().summary.friendStatus, 'outgoing', 'Late timed-out completion cannot replace reconciled state');
  state = summary();await controller.load();mode = 'bad';await controller.requestFriend();assert.equal(controller.getSnapshot().uncertain, true);assert.equal(controller.getSnapshot().message, null);controller.dispose();
});

test('blur/background abort late reads and writes; new controller cannot receive an old account completion', async () => {
  const read = deferred(), write = deferred();let signal;
  const controller = createConnectionsController({ read: async current => { signal = current;return read.promise; }, write: async current => write.promise }, peer, viewer, () => requestId);
  controller.resume();controller.suspend();assert.equal(signal.aborted, true);read.resolve(summary(peer, { following: true }));await tick();assert.equal(controller.getSnapshot().summary, null);
  controller.dispose();
  let mutationSignal;
  const old = createConnectionsController({ read: async () => summary(), write: async (_id, _command, current) => { mutationSignal = current;return write.promise; } }, peer, viewer, () => requestId);
  old.resume();await tick();const pending = old.requestFriend();old.suspend();assert.equal(mutationSignal.aborted, true);write.resolve(summary(peer, { friendStatus: 'outgoing', requestId, requestRevision: 1 }));await pending;
  assert.equal(old.getSnapshot().summary, null);assert.equal(old.getSnapshot().message, null);old.dispose();
});

test('own collections fence switched pages, deduplicate keyset pages, and reconcile peer mutations to own counts', async () => {
  const oldPage = deferred();let oldSignal, friends = 1;const writes = [];
  const controller = createConnectionsController({ read: async () => summary(viewer, { friendsCount: friends }), list: async (collection, cursor, signal) => {
    if (collection === 'incoming') { oldSignal = signal;return oldPage.promise; }
    return { items: [item({ id: cursor ? otherRequest : requestId, status: 'accepted' })], nextCursor: cursor ? null : 'page2' };
  }, write: async (targetId, command) => { writes.push([targetId, command]);friends = 0;return summary(targetId); } }, viewer, viewer, () => requestId);
  controller.resume();await tick();controller.select('incoming');controller.select('friends');assert.equal(oldSignal.aborted, true);await tick();
  oldPage.resolve({ items: [item({ id: 'stale' })], nextCursor: null });await tick();assert.equal(controller.getSnapshot().items[0].id, requestId);
  controller.more();await tick();assert.equal(controller.getSnapshot().items.length, 2);assert.equal(controller.getSnapshot().nextCursor, null);
  await controller.act(peer, { action: 'remove', requestId });assert.equal(writes.length, 1);assert.equal(controller.getSnapshot().summary.targetId, viewer);assert.equal(controller.getSnapshot().summary.friendsCount, 0);controller.dispose();
});

test('inbox is never marked read automatically and pending notification actions require the current revision', async () => {
  const writes = [];let unread = 2;
  const controller = createConnectionsController({ read: async () => summary(viewer, { unreadCount: unread }), list: async () => ({ items: [item({ kind: 'friend_request', revision: 4 })], nextCursor: null }), write: async (targetId, command) => {
    writes.push(command);if (command.action === 'read') unread--;
    return summary(targetId, command.action === 'accept' ? { friendStatus: 'friends', requestId, requestRevision: 4 } : { unreadCount: unread });
  } }, viewer, viewer, () => requestId);
  controller.resume();await tick();controller.select('inbox');await tick();assert.equal(writes.length, 0);
  await controller.act(peer, { action: 'accept', requestId, expectedRevision: 3 });assert.equal(writes.length, 0);
  await controller.act(peer, { action: 'accept', requestId, expectedRevision: 4 });await tick();assert.equal(writes.length, 1);
  await controller.act(viewer, { action: 'read', notificationIds: ['not-visible'] });assert.equal(writes.length, 1);
  await controller.act(viewer, { action: 'read', notificationIds: [requestId] });assert.equal(writes.length, 2);assert.equal(controller.getSnapshot().summary.unreadCount, 1);controller.dispose();
});
