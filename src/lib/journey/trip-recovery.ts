import type { JourneyStop, PublicJourney } from '../../types/journey';
import type { TripSession } from './trip-session';
// A private, device-only copy of one unfinished (active or paused) trip per signed-in user,
// so it can be resumed after the app closes. It holds progress and stop identities only:
// never a GPS fix, heading, speed, accuracy or any route/track history. The only
// coordinates kept are those of places the user added from search to a temporary route,
// because that route cannot be rebuilt without them.
export const TRIP_RECOVERY_VERSION = 1;
export const TRIP_RECOVERY_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
// A copy dated later than this beyond now (clock change or tampering) is not trusted.
export const TRIP_RECOVERY_CLOCK_SLACK = 5 * 60 * 1000;
export type TripRecoveryStorage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown>; removeItem(key: string): Promise<unknown> };
export type AddedStop = { id: string; name: string; latitude: number; longitude: number };
export type TripRecovery = {
  version: 1; userId: string; journeyId: string; customized: boolean; sourceId: string | null; status: 'active' | 'paused';
  elapsedMs: number; completedStopIds: string[]; destinationId: string; title: string; plannedStops: number;
  stopIds: string[]; addedStops: AddedStop[]; savedAt: number;
};
export type TripMeta = { sourceId: string | null; isAddedStop: (stopId: string) => boolean };
// Limitation by design: one key per user holds a single recoverable trip. If several trips are
// live at once, the most recently changed one replaces the others' copy.
export const tripRecoveryKey = (userId: string) => 'journey-trip:v1:' + userId;
const ordered = (stops: readonly JourneyStop[]) => [...stops].sort((a, b) => a.sequence - b.sequence);

// elapsedMs is the trip time at this moment; time while the app is closed is never added.
export function buildTripRecovery(userId: string, session: TripSession, elapsedMs: number, meta: TripMeta, savedAt: number): TripRecovery | null {
  if ((session.status !== 'active' && session.status !== 'paused') || !session.journey || !session.destinationId) return null;
  const stops = ordered(session.journey.stops), customized = meta.sourceId !== null;
  return { version: TRIP_RECOVERY_VERSION, userId, journeyId: session.journey.id, customized, sourceId: meta.sourceId, status: session.status,
    elapsedMs: Math.max(0, Math.round(elapsedMs)), completedStopIds: [...session.completedStopIds], destinationId: session.destinationId,
    title: session.title, plannedStops: session.plannedStops, stopIds: stops.map(stop => stop.id),
    addedStops: customized ? stops.filter(stop => meta.isAddedStop(stop.id) && typeof stop.latitude === 'number' && typeof stop.longitude === 'number')
      .map(stop => ({ id: stop.id, name: stop.name, latitude: stop.latitude as number, longitude: stop.longitude as number })) : [],
    savedAt };
}

type Row = Record<string, unknown>;
const row = (value: unknown): Row | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : null;
const id = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 100;
const ids = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 50 && value.every(id) && new Set(value).size === value.length;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
// Anything unexpected (other user, old version, damaged JSON, impossible progress) reads as null.
export function parseTripRecovery(raw: string | null, userId: string, now: number): TripRecovery | null {
  if (!raw) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  const r = row(value);
  if (!r || r.version !== TRIP_RECOVERY_VERSION || r.userId !== userId || !id(r.journeyId) || typeof r.customized !== 'boolean'
    || !(r.sourceId === null || id(r.sourceId)) || r.customized !== (r.sourceId !== null) || r.sourceId === r.journeyId || (r.status !== 'active' && r.status !== 'paused')
    || !finite(r.elapsedMs) || r.elapsedMs < 0 || !ids(r.completedStopIds) || !id(r.destinationId) || typeof r.title !== 'string' || r.title.length > 500
    || !finite(r.plannedStops) || !ids(r.stopIds) || !r.stopIds.length || r.plannedStops !== r.stopIds.length
    || !finite(r.savedAt) || now - r.savedAt > TRIP_RECOVERY_MAX_AGE || r.savedAt - now > TRIP_RECOVERY_CLOCK_SLACK || !Array.isArray(r.addedStops) || r.addedStops.length > 50) return null;
  const addedStops: AddedStop[] = [], stopIds = r.stopIds;
  for (const item of r.addedStops) {
    const s = row(item);
    if (!s || !id(s.id) || typeof s.name !== 'string' || !s.name.trim() || s.name.length > 200 || !finite(s.latitude) || Math.abs(s.latitude) > 90
      || !finite(s.longitude) || Math.abs(s.longitude) > 180 || !stopIds.includes(s.id)) return null;
    addedStops.push({ id: s.id, name: s.name, latitude: s.latitude, longitude: s.longitude });
  }
  if (!r.customized && addedStops.length) return null;
  // Stops are completed strictly in order, so progress must be a prefix and the destination next.
  const done = r.completedStopIds;
  if (done.length >= stopIds.length || done.some((stop, index) => stopIds[index] !== stop) || r.destinationId !== stopIds[done.length]) return null;
  return { version: TRIP_RECOVERY_VERSION, userId, journeyId: r.journeyId, customized: r.customized, sourceId: r.sourceId, status: r.status,
    elapsedMs: r.elapsedMs, completedStopIds: [...done], destinationId: r.destinationId, title: r.title, plannedStops: r.plannedStops,
    stopIds: [...stopIds], addedStops, savedAt: r.savedAt };
}

// Rebuilds the trip's itinerary from the current public journey (or customized source).
// null means the journey changed or is gone, so the copy can no longer be resumed.
export function rebuildTripJourney(recovery: TripRecovery, source: PublicJourney | null): PublicJourney | null {
  if (!source || source.id !== (recovery.sourceId ?? recovery.journeyId)) return null;
  const stops = ordered(source.stops);
  if (!recovery.customized) return stops.length === recovery.stopIds.length && stops.every((stop, index) => stop.id === recovery.stopIds[index]) ? { ...source, stops: stops.map(stop => ({ ...stop })) } : null;
  const rebuilt: JourneyStop[] = [];
  for (const [index, stopId] of recovery.stopIds.entries()) {
    const kept = stops.find(stop => stop.id === stopId), added = recovery.addedStops.find(stop => stop.id === stopId);
    if (kept) rebuilt.push({ ...kept, sequence: index + 1 });
    else if (added) rebuilt.push({ id: added.id, name: added.name, latitude: added.latitude, longitude: added.longitude, sequence: index + 1, description: '', photo: null, rating: null, dayNumber: null });
    else return null;
  }
  return { ...source, id: recovery.journeyId, stops: rebuilt };
}
export function tripRecoveryPrompt(recovery: TripRecovery) {
  return { title: 'Resume your trip?', body: 'You’d completed ' + recovery.completedStopIds.length + ' of ' + recovery.plannedStops + ' stops.' };
}
export const tripUnavailableMessage = 'This journey is no longer available.';

// Storage problems never block travel: every call fails quietly and in order.
export function createTripRecovery(storage: TripRecoveryStorage, now: () => number = Date.now) {
  let queue: Promise<unknown> = Promise.resolve();
  const signedOut = new Set<string>();
  function run<T>(task: () => Promise<T>, fallback: T): Promise<T> {
    const next = queue.then(task).catch(() => fallback);
    queue = next; return next;
  }
  const remove = (key: string) => Promise.resolve().then(() => storage.removeItem(key)).catch(() => undefined);
  return {
    // An editor of trips for this user (Travel Mode) re-enables writes after a sign-out.
    allow(userId: string) { signedOut.delete(userId); },
    save: (recovery: TripRecovery) => run(async () => {
      if (signedOut.has(recovery.userId)) return;
      await storage.setItem(tripRecoveryKey(recovery.userId), JSON.stringify(recovery));
    }, undefined),
    // Damaged, foreign, old-version and week-old copies are removed when read.
    load: (userId: string) => run(async () => {
      const key = tripRecoveryKey(userId), raw = await storage.getItem(key), recovery = parseTripRecovery(raw, userId, now());
      if (!recovery && raw !== null) await remove(key);
      return recovery;
    }, null),
    // Only removes the copy when it belongs to this journey, so another trip's copy survives.
    clear: (userId: string, journeyId?: string) => run(async () => {
      const key = tripRecoveryKey(userId);
      if (journeyId !== undefined) {
        const raw = await storage.getItem(key);
        if (raw === null) return;
        const current = parseTripRecovery(raw, userId, now());
        if (current && current.journeyId !== journeyId) return;
      }
      await remove(key);
    }, undefined),
    clearUser: (userId: string) => { signedOut.add(userId); return run(() => remove(tripRecoveryKey(userId)), undefined); },
  };
}
export type TripRecoveryStore = ReturnType<typeof createTripRecovery>;

type StorePort = { get(id: string): TripSession; now(): number; subscribe(listener: () => void): () => void };
type AppPort = { addEventListener(event: 'change', listener: (state: string) => void): { remove(): void } };
// Watches the in-memory trip store for journeys opened in Travel Mode by a signed-in user.
// Active/paused trips are written on every change and when the app leaves the foreground;
// finished, completed or reset trips remove their copy.
// forget drops in-memory trips and temporary routes on sign-out, so one account's live trip can
// never be saved under (or shown to) the next account signed in on this phone.
export function createTripPersistence({ store, recovery, app, meta, forget = () => {}, wallNow = Date.now }: { store: StorePort; recovery: TripRecoveryStore; app: AppPort; meta: (journeyId: string) => TripMeta; forget?: () => void; wallNow?: () => number }) {
  const tracked = new Map<string, { userId: string; last: TripSession | null }>();
  let started = false;
  function persist(journeyId: string, force: boolean) {
    const entry = tracked.get(journeyId);
    if (!entry) return;
    const session = store.get(journeyId);
    if (!force && session === entry.last) return;
    entry.last = session;
    if (session.status === 'active' || session.status === 'paused') {
      const elapsed = session.elapsedMs + (session.status === 'active' && session.activeSince !== null ? Math.max(0, store.now() - session.activeSince) : 0);
      const copy = buildTripRecovery(entry.userId, session, elapsed, meta(journeyId), wallNow());
      if (copy) void recovery.save(copy);
    } else if (!force) void recovery.clear(entry.userId, journeyId);
  }
  function start() {
    if (started) return;
    started = true;
    store.subscribe(() => { for (const journeyId of tracked.keys()) persist(journeyId, false); });
    app.addEventListener('change', state => { if (state !== 'active') for (const journeyId of tracked.keys()) persist(journeyId, true); });
  }
  return {
    // Tracking lasts for the process so a trip left running is still saved on background.
    track(userId: string, journeyId: string) {
      start(); recovery.allow(userId);
      const existing = tracked.get(journeyId);
      if (existing?.userId === userId) return;
      tracked.set(journeyId, { userId, last: store.get(journeyId) });
      // A live trip is saved now; a ready one leaves any stored copy for the resume prompt.
      persist(journeyId, true);
    },
    clearUser(userId: string) {
      tracked.clear();
      const cleared = recovery.clearUser(userId);
      forget();
      return cleared;
    },
  };
}
