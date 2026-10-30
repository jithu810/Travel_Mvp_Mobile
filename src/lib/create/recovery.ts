import type { CreateForm, Place, StopInput } from './model';
import type { MemoryEdit } from './memory';
// Private, device-only copies of unsaved Create edits. Nothing here talks to the server:
// a snapshot is only offered back to the same signed-in user for the same journey, and
// restoring it only refills the editor so the normal explicit save flow is still used.
export const RECOVERY_VERSION = 1;
export const RECOVERY_DELAY = 800;
export const RECOVERY_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const PREFIX = 'journey-recovery:v1:';
export type RecoveryStorage = {
  getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>; getAllKeys(): Promise<readonly string[]>;
};
export type RecoverySnapshot = { version: 1; userId: string; formId: string; baseUpdatedAt: string | null; savedAt: number; form: CreateForm; memoryEdit: MemoryEdit | null; droppedPhotos: boolean };
// snapshotId names the stored copy, which differs from form.id after a new-journey restore.
export type Recovery = { snapshotId: string; form: CreateForm; memoryEdit: MemoryEdit | null; droppedPhotos: boolean };

export const recoveryPrefix = (userId: string) => PREFIX + userId + ':';
export const recoveryKey = (userId: string, formId: string) => recoveryPrefix(userId) + formId;
// Photos picked but not yet uploaded live in the device cache, which may be gone by now.
export function isLocalPhoto(path: string | null | undefined) { return !!path && (/^(file|content|ph|assets-library|data|blob):/i.test(path) || path.startsWith('/')); }
function stripStop(stop: StopInput, dropped: { value: boolean }): StopInput {
  if (!isLocalPhoto(stop.photoPath)) return stop;
  dropped.value = true; return { ...stop, photoPath: null };
}
export function buildSnapshot(userId: string, form: CreateForm, memoryEdit: MemoryEdit | null, hasLocalPhotos: boolean, savedAt: number): RecoverySnapshot {
  const dropped = { value: hasLocalPhotos };
  const coverPath = isLocalPhoto(form.coverPath) ? (dropped.value = true, null) : form.coverPath;
  const cleanForm = { ...form, coverPath, stops: form.stops.map(stop => stripStop(stop, dropped)) };
  const cleanEdit = memoryEdit && { ...memoryEdit, value: stripStop(memoryEdit.value, dropped), baseline: stripStop(memoryEdit.baseline, dropped) };
  return { version: RECOVERY_VERSION, userId, formId: form.id, baseUpdatedAt: form.updatedAt, savedAt, form: cleanForm, memoryEdit: cleanEdit, droppedPhotos: dropped.value };
}

type Row = Record<string, unknown>;
const row = (value: unknown): Row | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : null;
const str = (value: unknown, limit = 10000): value is string => typeof value === 'string' && value.length <= limit;
const nullableStr = (value: unknown, limit = 10000): value is string | null => value === null || str(value, limit);
const nullableNum = (value: unknown): value is number | null => value === null || typeof value === 'number' && Number.isFinite(value);
const id = (value: unknown): value is string => str(value, 100) && value.length > 0;
function readStop(value: unknown): StopInput | null {
  const s = row(value);
  if (!s || !id(s.id) || !str(s.name) || !str(s.description) || !nullableNum(s.latitude) || !nullableNum(s.longitude) || !nullableStr(s.mapboxId)
    || !str(s.day, 20) || !str(s.rating, 20) || !(s.photoPath === undefined || nullableStr(s.photoPath)) || !(s.descriptionWasNull === undefined || typeof s.descriptionWasNull === 'boolean')) return null;
  return { id: s.id, name: s.name, description: s.description, latitude: s.latitude, longitude: s.longitude, mapboxId: s.mapboxId, day: s.day, rating: s.rating,
    ...(s.photoPath !== undefined ? { photoPath: s.photoPath } : {}), ...(s.descriptionWasNull !== undefined ? { descriptionWasNull: s.descriptionWasNull } : {}) };
}
function readPlace(value: unknown): Place | null | undefined {
  if (value === null) return null;
  const p = row(value);
  if (!p || !str(p.name) || !str(p.label) || typeof p.latitude !== 'number' || typeof p.longitude !== 'number' || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) || !nullableStr(p.mapboxId)) return undefined;
  return { name: p.name, label: p.label, latitude: p.latitude, longitude: p.longitude, mapboxId: p.mapboxId };
}
function readForm(value: unknown): CreateForm | null {
  const f = row(value);
  if (!f || !id(f.id) || !str(f.title) || !str(f.description) || !str(f.days, 20) || !nullableStr(f.updatedAt, 100)
    || !(['', 'solo', 'couple', 'friends', 'family'] as unknown[]).includes(f.traveler) || !Array.isArray(f.stops) || f.stops.length > 50
    || !(f.destinationSlug === undefined || str(f.destinationSlug)) || !(f.coverPath === undefined || nullableStr(f.coverPath))
    || !(f.descriptionWasNull === undefined || typeof f.descriptionWasNull === 'boolean')) return null;
  const destination = readPlace(f.destination), stops = f.stops.map(readStop);
  if (destination === undefined || stops.some(stop => !stop)) return null;
  return { id: f.id, title: f.title, description: f.description, destination, traveler: f.traveler as CreateForm['traveler'], days: f.days, updatedAt: f.updatedAt, stops: stops as StopInput[],
    ...(f.destinationSlug !== undefined ? { destinationSlug: f.destinationSlug } : {}), ...(f.coverPath !== undefined ? { coverPath: f.coverPath } : {}),
    ...(f.descriptionWasNull !== undefined ? { descriptionWasNull: f.descriptionWasNull } : {}) };
}
// Anything unexpected (other user, other journey, old version, damaged JSON) reads as null.
export function parseSnapshot(raw: string | null, userId: string, formId?: string): RecoverySnapshot | null {
  if (!raw) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  const s = row(value);
  if (!s || s.version !== RECOVERY_VERSION || s.userId !== userId || !id(s.formId) || (formId !== undefined && s.formId !== formId)
    || typeof s.savedAt !== 'number' || !Number.isFinite(s.savedAt) || !nullableStr(s.baseUpdatedAt, 100) || typeof s.droppedPhotos !== 'boolean') return null;
  const form = readForm(s.form);
  if (!form || form.id !== s.formId) return null;
  let memoryEdit: MemoryEdit | null = null;
  if (s.memoryEdit !== null) {
    const m = row(s.memoryEdit), value = readStop(m?.value), baseline = readStop(m?.baseline);
    if (!m || !value || !baseline || typeof m.isNew !== 'boolean') return null;
    memoryEdit = { value, baseline, isNew: m.isNew };
  }
  return { version: RECOVERY_VERSION, userId, formId: s.formId, baseUpdatedAt: s.baseUpdatedAt, savedAt: s.savedAt, form, memoryEdit, droppedPhotos: s.droppedPhotos };
}
// Only edits made on top of exactly the version just loaded are offered. A snapshot of an
// older saved version is stale (the journey was saved since) and restoring it would hide
// those newer saved changes, so it is never offered.
export function hasSameBaseVersion(snapshot: RecoverySnapshot, form: CreateForm) {
  if (form.updatedAt === null || snapshot.baseUpdatedAt === null) return form.updatedAt === null && snapshot.baseUpdatedAt === null;
  const base = Date.parse(snapshot.baseUpdatedAt), saved = Date.parse(form.updatedAt);
  return Number.isFinite(base) && base === saved;
}
// The loaded identity, version and remix credit always win; only the user's edits come back.
// A never-saved journey may still have reached the server (an unconfirmed first save), so its
// content moves into the fresh editor's journey id with new stop ids and an open memory edit
// is dropped: a restore can never reuse an id that exists or was deleted.
export function restoredState(snapshot: RecoverySnapshot, loaded: CreateForm, uuid: () => string): Recovery {
  const fresh = loaded.updatedAt === null;
  const form: CreateForm = { ...snapshot.form, id: loaded.id, updatedAt: loaded.updatedAt, stops: fresh ? snapshot.form.stops.map(stop => ({ ...stop, id: uuid() })) : snapshot.form.stops };
  delete form.sourceId;
  if (loaded.sourceId) form.sourceId = loaded.sourceId;
  const edit = fresh ? null : snapshot.memoryEdit, exists = !!edit && form.stops.some(stop => stop.id === edit.value.id);
  const memoryEdit = edit && edit.value.id === edit.baseline.id && (edit.isNew ? !exists : exists) ? edit : null;
  return { snapshotId: snapshot.formId, form, memoryEdit, droppedPhotos: snapshot.droppedPhotos };
}
export function recoveryPrompt(recovery: Recovery) {
  return { title: 'Restore unsaved changes?', body: 'This journey has changes on this device that weren’t saved.' + (recovery.droppedPhotos ? ' New photos that weren’t saved can’t be restored.' : '') };
}

// Storage problems never block editing or saving: every call fails quietly and in order.
export function createCreationRecovery(storage: RecoveryStorage, now: () => number = Date.now) {
  let queue: Promise<unknown> = Promise.resolve();
  // Journeys open in a mounted editor are never offered to another editor, and a signed-out
  // user's late pending writes are dropped until an editor for that user opens again.
  const owned = new Map<string, number>(), signedOut = new Set<string>();
  function run<T>(task: () => Promise<T>, fallback: T): Promise<T> {
    const next = queue.then(task).catch(() => fallback);
    queue = next; return next;
  }
  const remove = (key: string) => Promise.resolve().then(() => storage.removeItem(key)).catch(() => undefined);
  const expired = (snapshot: RecoverySnapshot) => snapshot.savedAt < now() - RECOVERY_MAX_AGE;
  return {
    claim(userId: string, formId: string) {
      signedOut.delete(userId); owned.set(formId, (owned.get(formId) || 0) + 1);
      let released = false;
      return () => { if (released) return; released = true; const count = (owned.get(formId) || 1) - 1; if (count) owned.set(formId, count); else owned.delete(formId); };
    },
    save: (userId: string, form: CreateForm, memoryEdit: MemoryEdit | null, hasLocalPhotos: boolean) => run(async () => {
      if (signedOut.has(userId)) return;
      await storage.setItem(recoveryKey(userId, form.id), JSON.stringify(buildSnapshot(userId, form, memoryEdit, hasLocalPhotos, now())));
    }, undefined),
    // A saved draft looks up its own key. A new journey gets a fresh id each time, so the
    // newest unsaved new-journey snapshot for this user is used and older ones are dropped.
    // Listing also prunes damaged snapshots and any older than 30 days.
    find: (userId: string, loaded: CreateForm, uuid: () => string) => run(async (): Promise<Recovery | null> => {
      if (loaded.updatedAt) {
        const key = recoveryKey(userId, loaded.id), raw = await storage.getItem(key), snapshot = parseSnapshot(raw, userId, loaded.id);
        if (snapshot && !expired(snapshot) && hasSameBaseVersion(snapshot, loaded)) return restoredState(snapshot, loaded, uuid);
        if (raw !== null) await remove(key);
        return null;
      }
      const keys = (await storage.getAllKeys()).filter(key => key.startsWith(recoveryPrefix(userId)));
      let newest: { key: string; snapshot: RecoverySnapshot } | null = null;
      for (const key of keys) {
        const formId = key.slice(recoveryPrefix(userId).length);
        if (owned.has(formId)) continue;
        const snapshot = parseSnapshot(await storage.getItem(key), userId, formId);
        if (!snapshot || expired(snapshot)) { await remove(key); continue; }
        if (!hasSameBaseVersion(snapshot, loaded)) continue;
        if (newest && newest.snapshot.savedAt >= snapshot.savedAt) { await remove(key); continue; }
        if (newest) await remove(newest.key);
        newest = { key, snapshot };
      }
      return newest ? restoredState(newest.snapshot, loaded, uuid) : null;
    }, null),
    clear: (userId: string, formId: string) => run(() => remove(recoveryKey(userId, formId)), undefined),
    clearUser: (userId: string) => {
      signedOut.add(userId);
      return run(async () => {
        const keys = (await storage.getAllKeys()).filter(key => key.startsWith(recoveryPrefix(userId)));
        for (const key of keys) await remove(key);
      }, undefined);
    },
  };
}
export type CreationRecovery = ReturnType<typeof createCreationRecovery>;

// Rapid edits collapse into one write after a quiet moment; flush writes it right away.
export function createRecoveryDebounce(delay = RECOVERY_DELAY, timers: { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout } = { setTimeout, clearTimeout }) {
  let handle: ReturnType<typeof setTimeout> | null = null, pending: (() => unknown) | null = null;
  const cancel = () => { if (handle !== null) timers.clearTimeout(handle); handle = null; pending = null; };
  const flush = () => { const task = pending; cancel(); if (task) void Promise.resolve().then(task).catch(() => undefined); };
  return {
    schedule(task: () => unknown) { cancel(); pending = task; handle = timers.setTimeout(flush, delay); },
    cancel, flush,
  };
}
