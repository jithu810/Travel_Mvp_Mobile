import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const module = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(readFileSync('src/hooks/use-buddy-sleep.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(() => ({}), module, module.exports);
const { createBuddySleepClock, BUDDY_SLEEP_DELAY } = module.exports;
function setup() {
  let now = 0, next = 0, allowed = true;
  const jobs = new Map();
  const clock = createBuddySleepClock(() => allowed, { setTimeout(fn, delay) { jobs.set(++next, { at: now + delay, fn }); return next; }, clearTimeout(id) { jobs.delete(id); } });
  return { clock, jobs, allow(value) { allowed = value; }, advance(ms) { now += ms; for (const [id, job] of [...jobs]) if (job.at <= now) { jobs.delete(id); job.fn(); } } };
}
test('sleeps at one minute, unchanged presentation updates preserve deadline, and first activation wakes only', () => {
  const h = setup(); h.clock.configure(true, false); h.advance(30000); h.clock.configure(true, false); h.advance(29999);
  assert.equal(h.clock.get(), false); h.advance(1); assert.equal(h.clock.get(), true); assert.equal(h.jobs.size, 0);
  assert.equal(h.clock.wake(), true); assert.equal(h.clock.get(), false); assert.equal(h.clock.wake(), false); assert.equal(h.jobs.size, 1);
  assert.equal(BUDDY_SLEEP_DELAY, 60000); h.clock.dispose(); assert.equal(h.jobs.size, 0);
});
test('screen interaction wakes and renews a whole idle interval after interaction ends', () => {
  const h = setup(); h.clock.configure(true, false); h.advance(50000); h.clock.configure(true, true); h.advance(60000); assert.equal(h.clock.get(), false);
  h.clock.configure(true, false); h.advance(59999); assert.equal(h.clock.get(), false); h.advance(1); assert.equal(h.clock.get(), true);
  h.clock.configure(true, true); assert.equal(h.clock.get(), false); assert.equal(h.clock.wake(), true, 'Event propagation cannot turn the wake touch into help');
  assert.equal(h.clock.wake(), false); h.clock.dispose();
});
test('help/travel/drag/background exclusion cancels sleeping and stale callbacks; resume starts fresh', () => {
  const h = setup(); h.clock.configure(true, false); const stale = [...h.jobs.values()][0].fn;
  h.clock.configure(false, false); stale(); assert.equal(h.clock.get(), false); assert.equal(h.jobs.size, 0);
  h.clock.configure(true, false); h.advance(60000); assert.equal(h.clock.get(), true); h.clock.configure(false, false); assert.equal(h.clock.get(), false);
  h.clock.configure(true, false); h.clock.dispose(); stale(); assert.equal(h.clock.get(), false); assert.equal(h.jobs.size, 0);
  h.clock.resume(); h.clock.configure(true, false); h.advance(60000); assert.equal(h.clock.get(), true); h.clock.dispose();
});
test('deadline rechecks live safety conditions and never emits sleep after disposal', () => {
  const h = setup(); let notifications = 0; h.clock.subscribe(() => notifications++);
  h.clock.configure(true, false); h.allow(false); h.advance(60000); assert.equal(h.clock.get(), false); assert.equal(notifications, 0);
  h.allow(true); h.clock.wake(); const stale = [...h.jobs.values()][0].fn; h.clock.dispose(); stale(); assert.equal(notifications, 0);
});
