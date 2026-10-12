import type { PublicJourney } from '../../types/journey';
import { canOpenTravelMode } from './travel-preview';

export type TripStatus = 'ready' | 'active' | 'paused' | 'finished';
export type TripAction = 'begin' | 'pause' | 'resume' | 'finish' | 'new';
export type TripSession = Readonly<{
  status: TripStatus;
  elapsedMs: number;
  activeSince: number | null;
  title: string;
  plannedStops: number;
  journey: PublicJourney | null;
}>;
const ready: TripSession = Object.freeze({ status: 'ready', elapsedMs: 0, activeSince: null, title: '', plannedStops: 0, journey: null });

export function monotonicClock(source: () => number = () => typeof globalThis.performance?.now === 'function' ? globalThis.performance.now() : Date.now()) {
  let last = 0;
  return () => {
    const value = source();
    if (Number.isFinite(value)) last = Math.max(last, value);
    return last;
  };
}
export function elapsedTime(session: TripSession, now: number) {
  return session.elapsedMs + (session.status === 'active' && session.activeSince !== null ? Math.max(0, now - session.activeSince) : 0);
}
export function formatTripTime(milliseconds: number) {
  const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
  const part = (value: number) => String(value).padStart(2, '0');
  return seconds >= 3600 ? Math.floor(seconds / 3600) + ':' + part(Math.floor(seconds / 60) % 60) + ':' + part(seconds % 60)
    : part(Math.floor(seconds / 60)) + ':' + part(seconds % 60);
}

export function createTripStore(source?: () => number) {
  const now = monotonicClock(source);
  const sessions = new Map<string, TripSession>();
  const listeners = new Set<() => void>();
  const get = (id: string) => sessions.get(id) ?? ready;
  return {
    get, now,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    // Snapshot identity rejects stale callbacks, double taps, and old confirmation dialogs.
    transition(journey: PublicJourney, action: TripAction, expected: TripSession) {
      if (!canOpenTravelMode(journey) || get(journey.id) !== expected) return false;
      const current = get(journey.id);
      const allowed = action === 'begin' ? current.status === 'ready'
        : action === 'pause' ? current.status === 'active'
        : action === 'resume' ? current.status === 'paused'
        : action === 'finish' ? current.status === 'active' || current.status === 'paused'
        : action === 'new' && current.status === 'finished';
      if (!allowed) return false;
      const timestamp = now();
      const next: TripSession = action === 'new' ? { ...ready }
        : action === 'begin' ? { status: 'active', elapsedMs: 0, activeSince: timestamp, title: journey.title, plannedStops: journey.stops.length,
          journey: { ...journey, stops: journey.stops.map(stop => ({ ...stop })) } }
        : { ...current, status: action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'finished',
          elapsedMs: elapsedTime(current, timestamp), activeSince: action === 'resume' ? timestamp : null };
      sessions.set(journey.id, Object.freeze(next));
      listeners.forEach(listener => listener());
      return true;
    },
  };
}
// Process memory only. Never writes to AsyncStorage or a backend.
export const tripStore = createTripStore();

type AppStatePort = { currentState: string | null; addEventListener: (event: 'change', listener: (state: string) => void) => { remove: () => void } };
type TimerPort = { setInterval: (callback: () => void, delay: number) => ReturnType<typeof setInterval>; clearInterval: (id: ReturnType<typeof setInterval>) => void };
export function observeTripTimer(app: AppStatePort, update: () => void, timers: TimerPort = {
  setInterval: (callback, delay) => setInterval(callback, delay), clearInterval: id => clearInterval(id),
}) {
  let disposed = false, active = app.currentState === 'active';
  let interval: ReturnType<typeof setInterval> | undefined;
  const stop = () => { if (interval !== undefined) timers.clearInterval(interval); interval = undefined; };
  const start = () => {
    stop();
    if (active && !disposed) interval = timers.setInterval(() => { if (active && !disposed) update(); }, 1000);
  };
  const subscription = app.addEventListener('change', state => {
    active = state === 'active';
    if (active && !disposed) { start(); update(); } else stop();
  });
  start();
  return () => { disposed = true; stop(); subscription.remove(); };
}
