import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
function load(path, modules) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require','module','exports',code)(name => { assert.ok(name in modules, name); return modules[name]; },module,module.exports);
  return module.exports;
}
const id = '11111111-1111-4111-8111-111111111111', uid = '22222222-2222-4222-8222-222222222222';
const { deleteOwnedDraft } = load('src/lib/remix/delete-draft.ts', { '../discovery/model': { isJourneyId: x => /^[0-9a-f-]{36}$/.test(x) } });
function client({ user = uid, error = null, rows = [{ id }], authError = null } = {}) {
  const calls = [];
  const query = { delete() { calls.push(['delete']); return this; }, eq(...args) { calls.push(args); return this; }, async select(value) { calls.push(['select',value]); return { data: rows, error }; } };
  return { calls, auth: { getUser: async () => ({ data: { user: user ? { id: user } : null }, error: authError }) }, from(table) { calls.push(['from',table]); return query; } };
}
test('successful deletion scopes one owned non-demo draft and confirms returned id', async () => {
  const c = client(); await deleteOwnedDraft(c,id,uid);
  assert.deepEqual(c.calls,[['from','journeys'],['delete'],['id',id],['user_id',uid],['status','draft'],['is_demo',false],['select','id']]);
});
test('different account, missing authentication and unverifiable session never submit delete', async () => {
  for (const opts of [{ user: id }, { user: null }, { authError: {} }]) {
    const c = client(opts); await assert.rejects(deleteOwnedDraft(c,id,uid)); assert.deepEqual(c.calls,[]);
  }
});
test('RLS rejection, another owner, published/removed draft and unconfirmed response fail', async () => {
  for (const opts of [{ error: {} }, { rows: [] }, { rows: null }, { rows: [{ id: uid }] }]) await assert.rejects(deleteOwnedDraft(client(opts),id,uid));
});
const jsx = (type,props) => ({ type,props });
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)];
function harness(failure = false) {
  let index = 0, deleted = 0, calls = 0; const slots = [];
  const Component = load('src/components/delete-draft-action.tsx', {
    react: { useState(initial) { const i = index++; if (!(i in slots)) slots[i] = initial; return [slots[i],value => { slots[i] = value; }]; }, useRef(initial) { const i = index++; return slots[i] ??= { current: initial }; } },
    'react/jsx-runtime': { jsx,jsxs: jsx }, 'react-native': { ...Object.fromEntries(['Modal','Pressable','ScrollView','Text','View'].map(x => [x,x])), StyleSheet: { create: value => value } },
    '@/components/discovery/ui': { colors: { paper: '#F5F3EC', ink: '#153E35', white: '#FFFFFF' }, ui: {} }, '@/hooks/session-context': { useSessionState: () => ({ session: { user: { id: uid } } }) },
    '@/lib/supabase/client': { supabase: {} }, '@/lib/remix/delete-draft': { deleteOwnedDraft: async () => { calls++; if (failure) throw new Error('Deletion failed'); } },
  }).DeleteDraftAction;
  const render = () => { index = 0; return Component({ draft: { id,title: 'Trip' }, onDeleted: () => deleted++ }); };
  return { render, get calls() { return calls; }, get deleted() { return deleted; }, press(label) { const n = nodes(render()).find(n => n.props?.label === label || n.props?.accessibilityLabel === label); n.props.onPress(); } };
}
test('cancellation closes confirmation without deletion or refresh', () => {
  const h = harness(); h.press('Delete draft: Trip'); h.press('Cancel');
  assert.equal(nodes(h.render()).find(n => n.type === 'Modal').props.visible,false); assert.equal(h.calls,0); assert.equal(h.deleted,0);
});
test('confirmation succeeds once and refreshes only after success', async () => {
  const h = harness(); h.press('Delete draft: Trip'); h.press('Delete draft permanently'); h.press('Deleting…');
  await new Promise(setImmediate); assert.equal(h.calls,1); assert.equal(h.deleted,1); assert.equal(nodes(h.render()).find(n => n.type === 'Modal').props.visible,false);
});
test('failure keeps confirmation and card state; never invokes success refresh', async () => {
  const h = harness(true); h.press('Delete draft: Trip'); h.press('Delete draft permanently'); await new Promise(setImmediate);
  assert.equal(h.deleted,0); assert.equal(nodes(h.render()).find(n => n.type === 'Modal').props.visible,true);
  assert.ok(nodes(h.render()).some(n => n.props?.accessibilityRole === 'alert' && n.props.children === 'Deletion failed'));
});
