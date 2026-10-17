import { coordinates } from './model';

export type CapturedPosition = { latitude: number; longitude: number; accuracy: number | null; timestamp: number };
export type MemoryLocationPort = {
  permission: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
  services: () => Promise<boolean>;
  position: () => Promise<CapturedPosition>;
};
export type LocationCaptureState = { busy: boolean; error: string | null };
export function locationPatch(position: CapturedPosition, now = Date.now()) {
  if (!coordinates(position.latitude, position.longitude) || typeof position.accuracy !== 'number'
    || !Number.isFinite(position.accuracy) || position.accuracy < 0 || position.accuracy > 50
    || !Number.isFinite(position.timestamp) || Math.abs(now - position.timestamp) > 15000) {
    throw new Error('A fresh, accurate location is unavailable. Try again outdoors or search for a place.');
  }
  return { latitude: position.latitude, longitude: position.longitude, mapboxId: null };
}

// One-shot capture only. Cancellation invalidates results; Expo's one-shot API
// cannot abort an already submitted native acquisition or permission dialog.
export function createMemoryLocationCapture(port: MemoryLocationPort, notify: (state: LocationCaptureState) => void,
  accept: (patch: ReturnType<typeof locationPatch>) => void,
  timers = { set: (fn: () => void, ms: number) => setTimeout(fn, ms), clear: (id: ReturnType<typeof setTimeout>) => clearTimeout(id) }, now = Date.now) {
  let generation = 0, busy = false, timer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => { if (timer !== undefined) timers.clear(timer); timer = undefined; };
  const cancel = () => { generation++; clear(); busy = false; notify({ busy: false, error: null }); };
  return {
    cancel,
    isBusy: () => busy,
    start() {
      if (busy) return false;
      const token = ++generation;
      const startedAt = now();
      busy = true; notify({ busy: true, error: null });
      const current = () => busy && token === generation;
      const fail = (message: string) => { if (!current()) return; clear(); busy = false; generation++; notify({ busy: false, error: message }); };
      const timeoutMessage = 'Location timed out. Try again outdoors or search for a place.';
      const proceed = () => {
        if (!current()) return false;
        if (now() - startedAt >= 15000) { fail(timeoutMessage); return false; }
        return true;
      };
      timer = timers.set(() => fail(timeoutMessage), 15000);
      void (async () => {
        try {
          const permission = await port.permission();
          if (!proceed()) return;
          if (!permission.granted) {
            fail(permission.canAskAgain ? 'Location permission denied. Tap Use current location to retry, or search for a place.'
              : 'Location permission is blocked. Allow location in Android Settings, then retry, or search for a place.'); return;
          }
          const enabled = await port.services();
          if (!proceed()) return;
          if (!enabled) { fail('Location services are off. Turn them on and retry, or search for a place.'); return; }
          const position = await port.position();
          if (!proceed()) return;
          const patch = locationPatch(position, now());
          clear(); busy = false; generation++;
          notify({ busy: false, error: null }); accept(patch);
        } catch (error) { fail(error instanceof Error ? error.message + ' Retry or search for a place.' : 'Could not get your location. Retry or search for a place.'); }
      })();
      return true;
    },
  };
}
