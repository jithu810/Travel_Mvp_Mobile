import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
function load(path, modules) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'exports', source)(name => { if (!(name in modules)) throw Error(name); return modules[name]; }, exports);
  return exports;
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object' || (tree.type === 'StorySheet' && !tree.props.visible)) return [];
  if (typeof tree.type === 'function') return nodes(tree.type(tree.props));
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
const viewer = '11111111-1111-4111-8111-111111111111', peer = '22222222-2222-4222-8222-222222222222', requestId = '33333333-3333-4333-8333-333333333333';
const summary = (patch = {}) => ({ targetId: peer, friendStatus: 'none', requestId: null, requestRevision: null, following: false, followRevision: 0, friendsCount: 2, followingCount: 4, unreadCount: 1, ...patch });
const inboxItem = (patch = {}) => ({ id: requestId, person: { id: peer, username: 'traveler', displayName: 'Traveler', avatar: 'profile-avatars/private/raw.jpg' }, requestId, revision: 3, status: 'pending', kind: 'friend_request', readAt: null, createdAt: '2026-11-02T00:00:00Z', ...patch });

function uiHarness(patch = {}) {
  let cursor = 0;const slots = [], calls = [], routes = [];
  const controller = { requestFriend: () => calls.push(['request']), act: (id, command) => calls.push([id, command]), load: () => calls.push(['read']),
    select: collection => { state = { ...state, collection };calls.push(['select', collection]); }, close: () => { state = { ...state, collection: null }; }, retryList: () => calls.push(['retry-list']), more: () => calls.push(['more']) };
  let state = { summary: summary(), owner: false, auth: { loading: false, session: { user: { id: viewer } } }, loading: false, busy: null, uncertain: false, error: null, message: null, collection: null, items: [], nextCursor: null, listLoading: false, listError: null, ...patch, controller };
  const native = Object.fromEntries(['View', 'Text', 'Pressable', 'ActivityIndicator', 'FlatList'].map(name => [name, name]));native.StyleSheet = { create: value => value };
  const { ProfileConnections } = load('src/components/profile/profile-connections.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx }, react: { useState: initial => { const index = cursor++;slots[index] ??= initial;return [slots[index], value => { slots[index] = value; }]; } },
    'react-native': native, 'expo-router': { useRouter: () => ({ push: route => routes.push(route) }) },
    '@/hooks/use-profile-connections': { useProfileConnections: () => state }, '@/components/journey/story-sheet': { StorySheet: 'StorySheet' },
    '@/theme/dark-pilot': { darkPilotStyles: value => value }, '@/theme/mobile-theme': { theme: { text: '#fff', muted: '#ccc' } },
  });
  const render = (compact = false) => { cursor = 0;return ProfileConnections({ targetId: state.owner ? viewer : peer, name: 'Traveler', compact }); };
  return { render, calls, routes, state: () => state, set: patch => { state = { ...state, ...patch }; } };
}
const button = (tree, label) => nodes(tree).find(node => node.type === 'Pressable' && node.props.accessibilityLabel === label);

test('compact owner counts retain collection access and block unavailable or uncertain reads', () => {
  const h = uiHarness({ owner: true });
  for (const [label, collection] of [['Friends, 2', 'friends'], ['Following, 4', 'following'], ['Inbox, 1 unread', 'inbox']]) {
    const control = button(h.render(true), label);
    assert.ok(control);assert.equal(control.props.disabled, false);control.props.onPress();
    assert.deepEqual(h.calls.at(-1), ['select', collection]);
  }
  h.set({ summary: null, collection: null });
  assert.equal(button(h.render(true), 'Friends, count unavailable').props.disabled, true);
  h.set({ summary: summary({ friendsCount: 0 }), uncertain: true });
  assert.equal(button(h.render(true), 'Friends, 0').props.disabled, true);
});

test('public profile friends and Follow are independent and confirmed incoming/outgoing states choose exact commands', () => {
  const h = uiHarness();let tree = h.render();button(tree, 'Add friend Traveler').props.onPress();assert.deepEqual(h.calls, [['request']]);
  button(tree, 'Follow Traveler').props.onPress();assert.deepEqual(h.calls.at(-1), [peer, { action: 'follow', enabled: true, expectedRevision: 0 }]);
  h.set({ summary: summary({ friendStatus: 'outgoing', requestId, requestRevision: 2, following: true, followRevision: 4 }) });tree = h.render();
  button(tree, 'Cancel friend request to Traveler').props.onPress();assert.deepEqual(h.calls.at(-1), [peer, { action: 'cancel', requestId, expectedRevision: 2 }]);
  button(tree, 'Unfollow Traveler').props.onPress();assert.deepEqual(h.calls.at(-1), [peer, { action: 'follow', enabled: false, expectedRevision: 4 }]);
  h.set({ summary: summary({ friendStatus: 'incoming', requestId, requestRevision: 5 }) });tree = h.render();button(tree, 'Respond Traveler').props.onPress();tree = h.render();
  button(tree, 'Accept friend request').props.onPress();assert.deepEqual(h.calls.at(-1), [peer, { action: 'accept', requestId, expectedRevision: 5 }]);
  button(tree, 'Decline friend request').props.onPress();assert.deepEqual(h.calls.at(-1), [peer, { action: 'decline', requestId, expectedRevision: 5 }]);
});

test('anonymous sign-in explicitly requires a later tap; missing schema, loading and uncertainty never fabricate an enabled action', () => {
  const guest = uiHarness({ auth: { session: null, loading: false }, summary: null });let tree = guest.render();
  button(tree, 'Add friend').props.onPress();tree = guest.render();assert.ok(nodes(tree).some(node => node.type === 'Text' && String(node.props.children).includes('No request will be sent automatically')));
  button(tree, 'Sign in').props.onPress();assert.deepEqual(guest.routes, ['/auth']);assert.deepEqual(guest.calls, []);
  const h = uiHarness({ summary: null, error: 'Connections are not available in this build yet.' });tree = h.render();
  assert.equal(button(tree, 'Add friend Traveler').props.disabled, true);assert.equal(button(tree, 'Follow Traveler').props.disabled, true);
  button(tree, 'Retry connections').props.onPress();assert.deepEqual(h.calls, [['read']]);
  h.set({ summary: summary(), uncertain: true, error: 'Unconfirmed' });tree = h.render();assert.equal(button(tree, 'Follow Traveler').props.disabled, true);
  h.set({ uncertain: false, loading: true });assert.equal(button(h.render(), 'Add friend Traveler').props.disabled, true);
});

test('own counts use verified numbers, inbox stays unread until explicit acknowledgement and raw avatar paths are never displayed', () => {
  const h = uiHarness({ owner: true, summary: summary({ targetId: viewer }) });let tree = h.render();
  button(tree, 'Friends, 2').props.onPress();assert.deepEqual(h.calls.at(-1), ['select', 'friends']);tree = h.render();
  button(tree, 'Requests').props.onPress();assert.deepEqual(h.calls.at(-1), ['select', 'incoming']);
  h.set({ collection: 'inbox', items: [inboxItem()] });tree = h.render();
  const list = nodes(tree).find(node => node.type === 'FlatList');const row = list.props.renderItem({ item: h.state().items[0] });
  assert.equal(nodes(row).some(node => node.type === 'Image'), false, 'Initials do not interpret raw avatar paths');
  assert.equal(h.calls.some(call => call[1]?.action === 'read'), false);
  button(row, 'Accept').props.onPress();assert.deepEqual(h.calls.at(-1), [peer, { action: 'accept', requestId, expectedRevision: 3 }]);
  button(row, 'Mark as read').props.onPress();assert.deepEqual(h.calls.at(-1), [viewer, { action: 'read', notificationIds: [requestId] }]);
  button(row, 'View profile').props.onPress();assert.deepEqual(h.routes.at(-1), { pathname: '/profile/[username]', params: { username: 'traveler' } });
  h.set({ collection: 'inbox', items: [inboxItem({ status: 'cancelled' })] });const stale = nodes(h.render()).find(node => node.type === 'FlatList').props.renderItem({ item: h.state().items[0] });
  assert.equal(button(stale, 'Accept'), undefined);assert.equal(button(stale, 'Decline'), undefined);
});

function hookHarness() {
  let cursor = 0, effects = [];const slots = [];
  const memo = (fn, deps) => { const index = cursor++;if (!slots[index] || deps.some((value, i) => value !== slots[index].deps[i])) slots[index] = { value: fn(), deps };return slots[index].value; };
  const hooks = { useMemo: memo, useCallback: (fn, deps) => memo(() => fn, deps), useSyncExternalStore: (_subscribe, get) => get(),
    useEffect: (fn, deps) => { const index = cursor++;if (!slots[index] || deps.some((value, i) => value !== slots[index].deps[i])) { slots[index]?.cleanup?.();const slot = { deps };slots[index] = slot;effects.push(() => { slot.cleanup = fn(); }); } } };
  return { hooks, render(fn) { cursor = 0;effects = [];const result = fn();effects.forEach(fn => fn());return result; }, dispose() { slots.forEach(slot => slot?.cleanup?.()); } };
}

test('actual connection hook isolates account/token/target and cleans focus/background listeners without auto writes', async () => {
  const h = hookHarness(), listeners = new Set(), requests = [];let writes = 0;
  let auth = { loading: false, error: null, session: { user: { id: viewer }, access_token: 'token-a' } }, target = peer;
  const { createConnectionsController } = load('src/lib/connections/model.ts', {});
  const { useProfileConnections } = load('src/hooks/use-profile-connections.ts', {
    react: h.hooks, 'expo-crypto': { randomUUID: () => requestId },
    'expo-router': { useFocusEffect: fn => h.hooks.useEffect(fn, [fn]) },
    'react-native': { AppState: { currentState: 'active', addEventListener: (_name, fn) => { listeners.add(fn);return { remove: () => listeners.delete(fn) }; } } },
    '@/lib/connections/model': { createConnectionsController }, './session-context': { useSessionState: () => auth },
    '@/lib/connections/queries': { connectionPort: (targetId, userId, token) => ({ read: signal => new Promise(resolve => requests.push({ targetId, userId, token, signal, resolve })), write: async () => { writes++; } }) },
  });
  const render = () => h.render(() => useProfileConnections(target)), tick = () => new Promise(setImmediate);
  try {
    render();assert.equal(requests.length, 1);const staleListener = [...listeners][0];
    auth = { ...auth, session: { ...auth.session, access_token: 'token-b' } };let value = render();assert.equal(requests[0].signal.aborted, true);assert.equal(value.summary, null);assert.equal(requests[1].token, 'token-b');
    requests[0].resolve(summary({ following: true }));await tick();assert.equal(render().summary, null);
    requests[1].resolve(summary());await tick();assert.equal(render().summary.targetId, peer);
    const before = requests.length;staleListener('active');assert.equal(requests.length, before);
    [...listeners].forEach(listener => listener('background'));assert.equal(render().summary, null);
    [...listeners].forEach(listener => listener('active'));assert.equal(requests.length, before + 1);
    target = viewer;value = render();assert.equal(value.summary, null);assert.equal(requests.at(-1).targetId, viewer);
    auth = { loading: true, session: auth.session };render();assert.equal(requests.at(-1).signal.aborted, true);
    auth = { loading: false, session: null };render();assert.equal(writes, 0);
  } finally { h.dispose();assert.equal(listeners.size, 0); }
});
