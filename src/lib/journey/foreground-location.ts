export type Position = Readonly<{ latitude: number; longitude: number; accuracy: number | null; timestamp: number; heading?: number | null; speed?: number | null; direction?: number | null }>;
export type LocationStatus = 'ready' | 'permitted' | 'requesting' | 'tracking' | 'weak' | 'unavailable' | 'denied' | 'paused' | 'finished' | 'stopped';
export type LocationSnapshot = Readonly<{ status: LocationStatus; position: Position | null; canAskAgain: boolean; reason?: 'acquiring' | 'services-disabled' | 'temporary' }>;
export type LocationPort = {
  permission: (request: boolean, onlyIfUndetermined?: boolean) => Promise<{ granted: boolean; canAskAgain: boolean }>;
  services: () => Promise<boolean>;
  watch: (update: (position: Position) => void, error: () => void) => Promise<{ remove: () => void }>;
};
type SessionStatus = 'ready' | 'active' | 'paused' | 'finished' | 'completed';
type Timers = { set: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>; clear: (id: ReturnType<typeof setTimeout>) => void };
export function validPosition(position: Position, now: number) {
  return Number.isFinite(position.latitude) && Math.abs(position.latitude) <= 90
    && Number.isFinite(position.longitude) && Math.abs(position.longitude) <= 180
    && Number.isFinite(position.timestamp) && position.timestamp <= now && now - position.timestamp <= 30000;
}

// One current fix in memory. No history, storage, logging, or backend access.
export function createForegroundLocation(port: LocationPort, now = Date.now, timers: Timers = {
  set: (callback, delay) => setTimeout(callback, delay), clear: id => clearTimeout(id),
}) {
  let snapshot: LocationSnapshot = { status: 'ready', position: null, canAskAgain: true };
  const listeners = new Set<() => void>();
  let status: SessionStatus = 'ready', foreground = false, focused = false, generation = 0, busy = false;
  let subscription: { remove: () => void } | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let permissionDialogInactive = false;
  let foregroundReady: (() => void) | undefined;
  let prepared = false, failures = 0, pendingWatch = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let sessionIdentity: unknown;
  const direction = createTravelDirection();
  const publish = (next: LocationSnapshot) => { snapshot = next; listeners.forEach(listener => listener()); };
  const clearTimer = () => { if (timeout !== undefined) timers.clear(timeout); timeout = undefined; };
  const stop = () => {
    generation++; busy = false; permissionDialogInactive = false;
    direction.reset();
    if (retryTimer !== undefined) timers.clear(retryTimer);
    retryTimer = undefined;
    foregroundReady?.(); foregroundReady = undefined;
    subscription?.remove(); subscription = undefined; clearTimer();
  };
  const usable = () => focused && foreground;
  const idle = (): LocationStatus => status === 'ready' ? 'ready' : status === 'paused' ? 'paused' : status === 'finished' || status === 'completed' ? 'finished' : 'stopped';
  const scheduleRecovery = () => {
    if (status !== 'active' || !usable() || retryTimer !== undefined) return;
    const token = generation;
    const delay = Math.min(30000, 2000 * 2 ** Math.min(failures++, 4));
    retryTimer = timers.set(() => {
      if (token !== generation || status !== 'active' || !usable()) return;
      retryTimer = undefined;
      if (pendingWatch || busy) { scheduleRecovery(); return; }
      void connect(false);
    }, delay);
  };
  const fail = (reason: 'temporary' | 'services-disabled' = 'temporary') => {
    stop();
    publish({ status: 'unavailable', position: null, canAskAgain: snapshot.canAskAgain, reason });
    scheduleRecovery();
  };
  const connect = async (request: boolean, begin?: () => boolean, prepare = false, onlyIfUndetermined = false) => {
    if (!usable() || busy || pendingWatch || (begin || prepare ? status !== 'ready' : status !== 'active')) return;
    stop(); busy = true;
    const token = generation;
    const current = () => token === generation && usable();
    publish({ status: 'requesting', position: null, canAskAgain: snapshot.canAskAgain, reason: 'acquiring' });
    timeout = timers.set(() => {
      if (token === generation && focused) fail();
    }, 30000);
    try {
      const permission = await port.permission(request, onlyIfUndetermined);
      // iOS permission dialogs can temporarily make the app inactive. Preserve
      // the explicit Begin intent, but wait for foreground before starting anything.
      if (token === generation && permissionDialogInactive) await new Promise<void>(resolve => { foregroundReady = resolve; });
      if (!current()) return;
      if (!permission.granted) {
        clearTimer();
        publish({ status: 'denied', position: null, canAskAgain: permission.canAskAgain });
        return;
      }
      if (prepare) {
        // Permission preparation never commits a session or creates a GPS watcher.
        const services = await port.services();
        if (current()) {
          clearTimer();
          publish({ status: services ? 'permitted' : 'unavailable', position: null, canAskAgain: permission.canAskAgain, reason: services ? undefined : 'services-disabled' });
        }
        return;
      }
      if (begin) {
        if (!begin()) { stop(); publish({ ...snapshot, status: idle(), position: null }); return; }
        status = 'active';
        if (!current()) return;
      }
      // A local session can run without a fix; the separate GPS status stays truthful.
      if (!await port.services()) {
        if (current()) fail('services-disabled');
        return;
      }
      if (!current()) return;
      let lastTimestamp = -Infinity;
      const unavailable = () => {
        if (!current()) return;
        fail();
      };
      const expire = () => { clearTimer(); timeout = timers.set(unavailable, 30000); };
      expire();
      pendingWatch = true;
      const next = await Promise.resolve().then(() => current() ? port.watch(position => {
        if (!current() || status !== 'active' || !validPosition(position, now()) || position.timestamp <= lastTimestamp) return;
        lastTimestamp = position.timestamp;
        // Negative/unknown accuracy must never be presented as an accurate fix.
        const accuracy = position.accuracy !== null && Number.isFinite(position.accuracy) && position.accuracy >= 0 ? position.accuracy : null;
        failures = 0;
        const normalized = { ...position, accuracy };
        publish({ status: accuracy === null || accuracy > 100 ? 'weak' : 'tracking', position: { ...normalized, direction: direction.update(normalized, now()) }, canAskAgain: true });
        if (!current() || status !== 'active') return;
        clearTimer(); timeout = timers.set(unavailable, Math.max(1, 30000 - (now() - position.timestamp)));
      }, unavailable) : { remove() {} }).finally(() => { pendingWatch = false; });
      if (!current()) next.remove(); else subscription = next;
    } catch {
      if (current()) fail();
    } finally {
      if (token === generation) busy = false;
    }
  };
  return {
    get: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    prepare() {
      if (!usable() || busy || status !== 'ready') return;
      const request = !prepared;
      prepared = true;
      return connect(request, undefined, true, true);
    },
    begin: (commit: () => boolean) => connect(!prepared, commit),
    retry: () => connect(true, undefined, status === 'ready'),
    sync(nextStatus: SessionStatus, appActive: boolean, screenFocused: boolean, appState = appActive ? 'active' : 'background', identity?: unknown) {
      if (status === 'ready' && nextStatus === 'ready' && focused && screenFocused && busy && snapshot.status === 'requesting') {
        if (appState === 'inactive') { foreground = false; permissionDialogInactive = true; return; }
        if (appActive && permissionDialogInactive) {
          foreground = true; permissionDialogInactive = false; foregroundReady?.(); foregroundReady = undefined; return;
        }
      }
      const changed = sessionIdentity !== identity || permissionDialogInactive || status !== nextStatus || foreground !== appActive || focused !== screenFocused;
      sessionIdentity = identity;
      status = nextStatus; foreground = appActive; focused = screenFocused;
      if (!changed) return;
      failures = 0;
      stop(); publish({ ...snapshot, status: idle(), position: null });
      if (status === 'active' && usable()) { if (pendingWatch) scheduleRecovery(); else void connect(false); }
    },
    stop,
  };
}

export function locationLabel(value: LocationSnapshot) {
  if (value.status === 'requesting' && value.reason === 'acquiring') return 'Checking location permission / acquiring GPS…';
  if (value.status === 'unavailable') return value.reason === 'services-disabled'
    ? 'Device location is off · Enable location; recovery retries automatically during an active trip'
    : 'GPS temporarily unavailable · Retrying automatically during an active trip';
  return ({ ready: 'Ready to request location', permitted: 'Location allowed · Tap Begin Trip when ready', requesting: 'Requesting permission / location…', tracking: 'Location updating in foreground',
    weak: 'Location signal weak', unavailable: 'Location unavailable · Check device location services', denied: 'Location permission denied',
    paused: 'Trip paused · Location updates stopped', finished: 'Trip finished · Location updates stopped', stopped: 'Location updates stopped' })[value.status]
    + (value.status === 'weak' && value.position?.accuracy !== null && value.position?.accuracy !== undefined ? ' · Accuracy ±' + Math.round(value.position.accuracy) + ' m' : '');
}

// GPS course only: stationary readings retain the last confirmed travel direction.
// With no reliable movement course yet, render a neutral dot rather than inventing north.
export function createTravelDirection() {
  let previous: Position | null = null, heading: number | null = null;
  const reset = () => { previous = null; heading = null; };
  return { reset, update(position: Position, now: number): number | null {
    if (!validPosition(position, now) || now - position.timestamp > 15000 || position.accuracy === null || !Number.isFinite(position.accuracy) || position.accuracy > 25 || position.accuracy < 0) { reset(); return null; }
    if (previous && position.timestamp <= previous.timestamp) return heading;
    if (previous && position.timestamp - previous.timestamp > 15000) reset();
    const course = position.heading, speed = position.speed;
    if (typeof course !== 'number' || !Number.isFinite(course) || course < 0 || course >= 360
      || typeof speed !== 'number' || !Number.isFinite(speed) || speed < 1.5 || speed > 55) return heading;
    if (!previous) { previous = position; return heading; }
    const gap = position.timestamp - previous.timestamp;
    if (gap < 1000) return heading;
    const lat = (position.latitude - previous.latitude) * 111195;
    const lon = (position.longitude - previous.longitude) * 111195 * Math.cos(position.latitude * Math.PI / 180);
    if (Math.hypot(lat, lon) > 55 * gap / 1000 + 20) { reset(); previous = position; return null; }
    heading = heading === null ? course : (heading + (((course - heading + 540) % 360) - 180) * 0.65 + 360) % 360;
    previous = position;
    return heading;
  } };
}
