import { isBuddyRoute, type BuddyAction, type BuddyPose, type BuddyRect, type BuddyScreen } from './model';
type ScreenEntry = { path: string; state: BuddyScreen; act: (action: BuddyAction) => void };
type RegionEntry = { path: string; rect: BuddyRect };
type Protection = { path: string; rects: readonly BuddyRect[]; pending: boolean };
export function createBuddyStore() {
  const listeners = new Set<() => void>(), screens = new Map<object, ScreenEntry>(), regions = new Map<object, RegionEntry>();
  const blockers = new Map<object, string>();
  const protections = new Map<object, Protection>(), moving = new Map<object, string>(), measurements = new Set<() => void>();
  let pose: BuddyPose | null = null;
  let poseOwner: object | null = null;
  let tour: number | null = null, lastReaction = -Infinity;
  const reacted = new Set<string>();
  let snapshot = { revision: 0, path: '', foreground: false, interacting: false, measurement: 0 };
  const publish = () => { snapshot = { ...snapshot, revision: snapshot.revision + 1 }; listeners.forEach(fn => fn()); };
  let deferredMeasurement = false;
  const geometryMoving = () => [...screens.values()].some(entry => entry.path === snapshot.path && entry.state.geometryMoving) || [...moving.values()].includes(snapshot.path);
  const requestMeasurements = () => {
    if (geometryMoving()) {
      if (!deferredMeasurement) {
        deferredMeasurement = true; snapshot = { ...snapshot, measurement: snapshot.measurement + 1 };
        protections.forEach(entry => { if (entry.path === snapshot.path) entry.pending = true; }); publish();
      }
      return;
    }
    deferredMeasurement = false; snapshot = { ...snapshot, measurement: snapshot.measurement + 1 };
    protections.forEach(entry => { if (entry.path === snapshot.path) entry.pending = true; });
    publish(); measurements.forEach(fn => fn());
  };
  const flushDeferred = () => { if (deferredMeasurement && !geometryMoving()) requestMeasurements(); };
  return {
    get: () => snapshot,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    environment(path: string, foreground: boolean) {
      if (snapshot.path === path && snapshot.foreground === foreground) return;
      if (snapshot.path !== path) { pose = null; poseOwner = null; deferredMeasurement = false; reacted.clear(); }
      snapshot = { ...snapshot, path, foreground, interacting: false }; publish();
      if (foreground) measurements.forEach(fn => fn());
    },
    getPose(path: string) { return path === snapshot.path ? pose : null; },
    getTour() { return tour; },
    setTour(step: number | null) { const next = step !== null && step >= 0 && step < 3 ? step : null; if (tour !== next) { tour = next; publish(); } },
    // Retained across actor remounts, reset only on an actual route visit.
    reactOnce(key: string, now = Date.now()) {
      if (reacted.has(key) || now - lastReaction < 30000) return false;
      reacted.add(key); lastReaction = now; return true;
    },
    claimPose(path: string, owner: object) { if (path === snapshot.path) poseOwner = owner; },
    releasePose(path: string, owner: object) { if (path === snapshot.path && poseOwner === owner) poseOwner = null; },
    savePose(path: string, value: BuddyPose, owner?: object) { if (path === snapshot.path && (!owner || poseOwner === owner)) pose = { point: { ...value.point }, parked: value.parked }; },
    interaction(value: boolean) { if (snapshot.interacting !== value) { snapshot = { ...snapshot, interacting: value }; publish(); } },
    onMeasure(fn: () => void) { measurements.add(fn); return () => { measurements.delete(fn); }; },
    requestMeasurements,
    protect(token: object, path: string, rects: readonly BuddyRect[] | null, measurement = snapshot.measurement) {
      if (measurement !== snapshot.measurement) return;
      const old = protections.get(token), entry = { path, rects: rects ?? [], pending: rects === null };
      protections.set(token, entry);
      if (!old || old.path !== path || old.pending !== entry.pending || JSON.stringify(old.rects) !== JSON.stringify(entry.rects)) publish();
    },
    removeProtection(token: object) { if (protections.delete(token)) publish(); },
    geometryMotion(token: object, path: string, value: boolean) {
      if (value) { if (moving.get(token) !== path) { moving.set(token, path); publish(); } }
      else if (moving.get(token) === path && moving.delete(token)) { publish(); flushDeferred(); }
    },
    screen(token: object, entry: ScreenEntry) {
      const old = screens.get(token); screens.set(token, entry);
      if (!old || old.path !== entry.path || JSON.stringify(old.state) !== JSON.stringify(entry.state)) publish();
      flushDeferred();
    },
    removeScreen(token: object) { if (screens.delete(token)) { publish(); flushDeferred(); } },
    region(token: object, path: string, rect: BuddyRect) {
      const old = regions.get(token); regions.set(token, { path, rect });
      if (!old || old.path !== path || JSON.stringify(old.rect) !== JSON.stringify(rect)) publish();
    },
    removeRegion(token: object) { if (regions.delete(token)) publish(); },
    block(token: object, path: string, value: boolean) {
      if (value) { if (blockers.get(token) !== path) { blockers.set(token, path); publish(); } }
      else if (blockers.delete(token)) publish();
    },
    current() {
      const path = snapshot.path;
      const entries = [...screens.values()].filter(e => e.path === path);
      const state = entries.find(e => e.state.travel)?.state ?? entries.find(e => e.state.canAddMemory)?.state ?? entries.at(-1)?.state;
      return { path, state,
        suppressed: !snapshot.foreground || !isBuddyRoute(path) || entries.some(e => e.state.suppressed) || [...blockers.values()].includes(path),
        interacting: snapshot.interacting || entries.some(e => e.state.interacting),
        regions: [...regions.values()].filter(e => e.path === path).map(e => e.rect),
        floating: entries.some(e => e.state.floating),
        protectedRects: [...protections.values()].filter(e => e.path === path).flatMap(e => e.rects),
        geometryPending: entries.some(e => e.state.geometryMoving) || [...protections.values()].some(e => e.path === path && e.pending) || [...moving.values()].includes(path),
      };
    },
    // The sheet captures an owner token and route, never a stale form callback.
    actionOwner() { return [...screens.entries()].reverse().find(([, e]) => e.path === snapshot.path && e.state.canAddMemory)?.[0] ?? null; },
    act(token: object | null, path: string, action: BuddyAction) {
      if (!token || snapshot.path !== path || !snapshot.foreground) return false;
      const entry = screens.get(token);
      if (!entry || entry.path !== path || !entry.state.canAddMemory || [...screens.values()].some(e => e.path === path && e.state.suppressed) || [...blockers.values()].includes(path)) return false;
      entry.act(action); return true;
    },
  };
}
export type BuddyStore = ReturnType<typeof createBuddyStore>;
