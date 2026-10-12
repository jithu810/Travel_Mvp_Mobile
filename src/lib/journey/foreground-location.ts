export type Position = Readonly<{ latitude: number; longitude: number; accuracy: number | null; timestamp: number }>;
export type LocationStatus = 'ready' | 'requesting' | 'tracking' | 'weak' | 'unavailable' | 'denied' | 'paused' | 'finished' | 'stopped';
export type LocationSnapshot = Readonly<{ status: LocationStatus; position: Position | null; canAskAgain: boolean }>;
export type LocationPort = {
  permission: (request: boolean) => Promise<{ granted: boolean; canAskAgain: boolean }>;
  services: () => Promise<boolean>;
  watch: (update: (position: Position) => void, error: () => void) => Promise<{ remove: () => void }>;
};
type SessionStatus = 'ready' | 'active' | 'paused' | 'finished';
type Timers = { set: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>; clear: (id: ReturnType<typeof setTimeout>) => void };
export function validPosition(position: Position, now: number) {
  return Number.isFinite(position.latitude) && Math.abs(position.latitude) <= 90
    && Number.isFinite(position.longitude) && Math.abs(position.longitude) <= 180
    && Number.isFinite(position.timestamp) && position.timestamp <= now + 5000 && now - position.timestamp <= 30000;
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
  const publish = (next: LocationSnapshot) => { snapshot = next; listeners.forEach(listener => listener()); };
  const clearTimer = () => { if (timeout !== undefined) timers.clear(timeout); timeout = undefined; };
  const stop = () => {
    generation++; busy = false; permissionDialogInactive = false;
    foregroundReady?.(); foregroundReady = undefined;
    subscription?.remove(); subscription = undefined; clearTimer();
  };
  const usable = () => focused && foreground;
  const idle = (): LocationStatus => status === 'ready' ? 'ready' : status === 'paused' ? 'paused' : status === 'finished' ? 'finished' : 'stopped';
  const connect = async (request: boolean, begin?: () => boolean) => {
    if (!usable() || busy || (begin ? status !== 'ready' : status !== 'active')) return;
    stop(); busy = true;
    const token = generation;
    const current = () => token === generation && usable();
    publish({ status: 'requesting', position: null, canAskAgain: snapshot.canAskAgain });
    timeout = timers.set(() => {
      if (token === generation && focused) { stop(); publish({ status: 'unavailable', position: null, canAskAgain: snapshot.canAskAgain }); }
    }, 30000);
    try {
      const permission = await port.permission(request);
      // iOS permission dialogs can temporarily make the app inactive. Preserve
      // the explicit Begin intent, but wait for foreground before starting anything.
      if (token === generation && permissionDialogInactive) await new Promise<void>(resolve => { foregroundReady = resolve; });
      if (!current()) return;
      if (!permission.granted) {
        clearTimer();
        publish({ status: 'denied', position: null, canAskAgain: permission.canAskAgain });
        return;
      }
      if (begin) {
        if (!begin()) { stop(); publish({ ...snapshot, status: idle(), position: null }); return; }
        status = 'active';
        if (!current()) return;
      }
      // A local session can run without a fix; the separate GPS status stays truthful.
      if (!await port.services()) {
        if (current()) { clearTimer(); publish({ status: 'unavailable', position: null, canAskAgain: true }); }
        return;
      }
      if (!current()) return;
      let lastTimestamp = -Infinity;
      const unavailable = () => {
        if (!current()) return;
        stop(); publish({ status: 'unavailable', position: null, canAskAgain: true });
      };
      const expire = () => { clearTimer(); timeout = timers.set(unavailable, 30000); };
      expire();
      const next = await port.watch(position => {
        if (!current() || status !== 'active' || !validPosition(position, now()) || position.timestamp <= lastTimestamp) return;
        lastTimestamp = position.timestamp;
        // Negative/unknown accuracy must never be presented as an accurate fix.
        const accuracy = position.accuracy !== null && Number.isFinite(position.accuracy) && position.accuracy >= 0 ? position.accuracy : null;
        publish({ status: accuracy === null || accuracy > 100 ? 'weak' : 'tracking', position: { ...position, accuracy }, canAskAgain: true });
        clearTimer(); timeout = timers.set(unavailable, Math.max(1, 30000 - (now() - position.timestamp)));
      }, unavailable);
      if (!current()) next.remove(); else subscription = next;
    } catch {
      if (current()) { clearTimer(); publish({ status: 'unavailable', position: null, canAskAgain: true }); }
    } finally {
      if (token === generation) busy = false;
    }
  };
  return {
    get: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    begin: (commit: () => boolean) => connect(true, commit),
    retry: () => connect(true),
    sync(nextStatus: SessionStatus, appActive: boolean, screenFocused: boolean, appState = appActive ? 'active' : 'background') {
      if (status === 'ready' && nextStatus === 'ready' && focused && screenFocused && busy && snapshot.status === 'requesting') {
        if (appState === 'inactive') { foreground = false; permissionDialogInactive = true; return; }
        if (appActive && permissionDialogInactive) {
          foreground = true; permissionDialogInactive = false; foregroundReady?.(); foregroundReady = undefined; return;
        }
      }
      const changed = permissionDialogInactive || status !== nextStatus || foreground !== appActive || focused !== screenFocused;
      status = nextStatus; foreground = appActive; focused = screenFocused;
      if (!changed) return;
      stop(); publish({ ...snapshot, status: idle(), position: null });
      if (status === 'active' && usable()) void connect(false);
    },
    stop,
  };
}

export function locationLabel(value: LocationSnapshot) {
  return ({ ready: 'Ready to request location', requesting: 'Requesting permission / location…', tracking: 'Location updating in foreground',
    weak: 'Location signal weak', unavailable: 'Location unavailable · Check device location services', denied: 'Location permission denied',
    paused: 'Trip paused · Location updates stopped', finished: 'Trip finished · Location updates stopped', stopped: 'Location updates stopped' })[value.status]
    + (value.status === 'weak' && value.position?.accuracy !== null && value.position?.accuracy !== undefined ? ' · Accuracy ±' + Math.round(value.position.accuracy) + ' m' : '');
}
