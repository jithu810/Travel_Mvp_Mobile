import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

test('launch route directly exports the existing public Discovery screen', () => {
  const source = ts.createSourceFile('index.tsx', readFileSync('src/app/index.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(source.statements.length, 1, 'No welcome screen, redirect, auth gate or loading intermediary');
  const statement = source.statements[0];
  assert.ok(ts.isExportDeclaration(statement));
  assert.equal(statement.moduleSpecifier.text, './discover');
  assert.ok(ts.isNamedExports(statement.exportClause));
  assert.equal(statement.exportClause.elements.length, 1);
  assert.equal(statement.exportClause.elements[0].name.text, 'default');
});

test('root stack retains public Home and every existing feature route', () => {
  const layout = readFileSync('src/app/_layout.tsx', 'utf8');
  assert.match(layout, /initialRouteName:\s*'index'/);
  assert.match(layout, /<SessionProvider><ActionIntentProvider>/);
  for (const route of ['index', 'discover', 'create', 'search', 'auth', 'account', 'draft/[id]', 'journey/[id]', 'profile/[username]']) {
    assert.ok(layout.includes('name="' + route + '"'), route + ' remains registered');
  }
  const discovery = readFileSync('src/app/discover.tsx', 'utf8');
  assert.ok(discovery.includes('loadPublicJourneys'));
  assert.ok(!discovery.includes('useSessionState'), 'Public Home does not wait for authentication');
});
