import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const script = resolve('scripts/prepare-thumbnail-backfill.py');
const object = 'journey-media/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/cover/33333333-3333-4333-8333-333333333333.png';
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
function fixture(run) {
  const parent = resolve(tmpdir());
  const root = mkdtempSync(join(parent, 'journey-thumbnail-review-'));
  try {
    const image = spawnSync('python', ['-c', 'from PIL import Image; import sys; Image.new("RGB",(1200,600),(80,120,200)).save(sys.argv[1])', join(root, 'source.png')], { encoding: 'utf8' });
    assert.equal(image.status, 0, image.stderr);
    const manifest = { projectRef: 'gwybjhqgnrpouwcdvusi', items: [{ storagePath: object, source: 'source.png' }] };
    const execute = (value = manifest, name = 'output') => {
      writeFileSync(join(root, 'manifest.json'), JSON.stringify(value));
      // Deny networking even if a future edit accidentally introduces a client.
      return spawnSync('python', ['-c', 'import socket,runpy,sys; socket.socket=lambda *a,**k: (_ for _ in ()).throw(RuntimeError("Network forbidden")); p=sys.argv.pop(1); runpy.run_path(p,run_name="__main__")', script, '--input', join(root, 'manifest.json'), '--output', join(root, name)], { encoding: 'utf8' });
    };
    run({ root, manifest, execute });
  } finally {
    assert.equal(resolve(root, '..'), parent);
    assert.ok(root.startsWith(join(parent, 'journey-thumbnail-review-')));
    rmSync(root, { recursive: true, force: true });
  }
}

test('offline backfill makes bounded JPEG and byte-identical original copy without network or activation', () => fixture(({ root, execute }) => {
  const before = sha(join(root, 'source.png'));
  const result = execute(); assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(readFileSync(join(root, 'output/review-plan.json'), 'utf8'));
  assert.equal(plan.executionAuthorized, false);
  const item = plan.items[0];
  assert.deepEqual(item.thumbnailDimensions, [512, 256]);
  assert.equal(item.expectedSourceSha256, before);
  assert.equal(sha(join(root, 'source.png')), before);
  assert.equal(sha(join(root, 'output', item.localOriginal)), before);
  assert.equal(sha(join(root, 'output', item.localThumbnail)), item.thumbnailSha256);
  assert.ok(item.canonicalOriginal.endsWith('.full-v1.png'));
  assert.ok(item.thumbnail.endsWith('.thumb-512-v1.jpg'));
  assert.match(item.activation, /REVIEW REQUIRED/);
  assert.ok(item.thumbnailBytes <= 1024 * 1024);
}));

test('backfill refuses overwrites and preserves prior review outputs', () => fixture(({ root, execute }) => {
  assert.equal(execute().status, 0);
  const before = sha(join(root, 'output/review-plan.json'));
  const again = execute(); assert.notEqual(again.status, 0); assert.match(again.stderr, /already exists/);
  assert.equal(sha(join(root, 'output/review-plan.json')), before);
}));

test('backfill rejects traversal, URL sources, malformed paths, duplicate objects and encoding mismatches', () => fixture(({ root, manifest, execute }) => {
  const cases = [
    { ...manifest, items: [{ ...manifest.items[0], source: '../source.png' }] },
    { ...manifest, items: [{ ...manifest.items[0], source: 'https://example.invalid/photo.png' }] },
    { ...manifest, items: [{ ...manifest.items[0], storagePath: object.replace('/cover/', '/cover/../') }] },
    { ...manifest, items: [manifest.items[0], manifest.items[0]] },
    { ...manifest, items: [{ ...manifest.items[0], storagePath: object.replace('.png', '.jpg') }] },
  ];
  cases.forEach((value, i) => {
    const name = 'invalid-' + i;
    assert.notEqual(execute(value, name).status, 0);
    assert.equal(existsSync(join(root, name)), false);
  });
}));

test('backfill rejects two source formats mapping to the same immutable thumbnail before writing', () => fixture(({ root, manifest, execute }) => {
  const image = spawnSync('python', ['-c', 'from PIL import Image; import sys; Image.new("RGB",(1200,600)).save(sys.argv[1])', join(root, 'source.jpg')], { encoding: 'utf8' });
  assert.equal(image.status, 0, image.stderr);
  const result = execute({ ...manifest, items: [manifest.items[0], { storagePath: object.replace('.png', '.jpg'), source: 'source.jpg' }] });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /destinations collide/);
  assert.equal(existsSync(join(root, 'output')), false);
}));
