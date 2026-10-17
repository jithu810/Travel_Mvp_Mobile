import type { LocationStatus, Position } from './foreground-location';
import { coordinates, destinationKey, navigationFix, type Destination } from './navigation';
import { geographicDistance } from './turn-guidance';
import type { TripStatus } from './trip-session';

export const ARRIVAL_MAX_ACCURACY_METERS = 25;
export const ARRIVAL_MAX_AGE_MS = 15000;
export type ArrivalPolicy = {
  radiusMeters: number; minReadings: number; dwellMs: number; minReadingIntervalMs: number;
  maxReadingGapMs: number; movingAwayToleranceMeters: number; rearmRadiusMeters: number;
  maxEvidenceSpeedMps: number; maxJumpSpeedMps: number; jumpAllowanceMeters: number;
};
// Local product defaults, not Mapbox thresholds. Override via createArrival for deliberate tuning.
export const ARRIVAL_POLICY: Readonly<ArrivalPolicy> = Object.freeze({
  radiusMeters: 50, minReadings: 3, dwellMs: 6000, minReadingIntervalMs: 2000,
  maxReadingGapMs: 5000, movingAwayToleranceMeters: 3, rearmRadiusMeters: 75,
  maxEvidenceSpeedMps: 8, maxJumpSpeedMps: 55, jumpAllowanceMeters: 5,
});
export type ArrivalInput = {
  status: TripStatus; focused: boolean; foreground: boolean; destination: Destination | undefined;
  locationStatus: LocationStatus; position: Position | null;
};
export type ArrivalPrompt = Readonly<{ key: string; stopId: string; name: string }>;
export type ArrivalState = Readonly<{
  status: 'idle' | 'waiting' | 'collecting' | 'likely' | 'dismissed'; message: string; prompt: ArrivalPrompt | null;
}>;
export function arrivalBlock(input: ArrivalInput, now = Date.now()) {
  if (!input.focused || !input.foreground) return 'Arrival checks stopped while away';
  if (input.status !== 'active') return input.status === 'ready' ? 'Begin Trip for arrival checks'
    : input.status === 'paused' ? 'Arrival checks paused' : 'Arrival checks stopped';
  if (!coordinates(input.destination)) return 'Arrival unavailable: current stop has no valid coordinates. Complete it manually.';
  if (input.locationStatus === 'denied') return 'Arrival unavailable: location permission denied. Manual completion is available.';
  if (input.locationStatus !== 'tracking' || !navigationFix(input.position, now) || input.position.accuracy > ARRIVAL_MAX_ACCURACY_METERS
    || now - input.position.timestamp > ARRIVAL_MAX_AGE_MS) return 'Arrival needs fresh GPS (≤15 seconds) with accuracy ≤25 m. Manual completion is available.';
  return '';
}

export function createArrival(options: Partial<ArrivalPolicy> = {}, now = Date.now) {
  const policy = { ...ARRIVAL_POLICY, ...options };
  if (Object.values(policy).some(value => !Number.isFinite(value) || value <= 0)
    || !Number.isInteger(policy.minReadings) || policy.minReadings < 2 || policy.rearmRadiusMeters <= policy.radiusMeters
    || policy.maxReadingGapMs < policy.minReadingIntervalMs || policy.maxJumpSpeedMps < policy.maxEvidenceSpeedMps)
    throw new RangeError('Invalid arrival policy');
  let state: ArrivalState = { status: 'idle', message: 'Begin Trip for arrival checks', prompt: null };
  const listeners = new Set<() => void>();
  let key = '', previous: Position | null = null, previousDistance = Infinity, dismissed = false;
  // A cached fix must not seed new evidence after Resume/reentry or a stop change.
  let lastEvaluatedTimestamp = -Infinity;
  let count = 0, since = 0, lastEvidenceAt = 0, closest = Infinity;
  const publish = (status: ArrivalState['status'], message: string, prompt: ArrivalPrompt | null = null) => {
    if (state.status === status && state.message === message && state.prompt === prompt) return;
    state = Object.freeze({ status, message, prompt }); listeners.forEach(listener => listener());
  };
  const clearEvidence = () => { count = 0; since = 0; lastEvidenceAt = 0; closest = Infinity; };
  const reset = () => { key = ''; previous = null; previousDistance = Infinity; dismissed = false; clearEvidence(); };
  const update = (input: ArrivalInput) => {
    const block = arrivalBlock(input, now());
    if (block) { reset(); publish(input.status === 'active' ? 'waiting' : 'idle', block); return; }
    const nextKey = destinationKey(input.destination);
    if (key !== nextKey) { reset(); key = nextKey; }
    const position = input.position!, destination = input.destination!;
    // Validation above proves these are finite numbers. Accuracy is used as a conservative margin, not proof of location.
    const accuracy = position.accuracy!;
    const distance = geographicDistance([position.longitude, position.latitude], [destination.longitude!, destination.latitude!]);
    if (!previous && position.timestamp <= lastEvaluatedTimestamp) {
      publish('waiting', 'Waiting for a new GPS reading to start fresh arrival evidence'); return;
    }
    if (count > 0 && previous && now() - previous.timestamp > policy.maxReadingGapMs) {
      clearEvidence(); publish('waiting', 'Arrival evidence reset: GPS updates interrupted');
    }
    if (previous && position.timestamp <= previous.timestamp) {
      if (position.timestamp < previous.timestamp || position.longitude !== previous.longitude || position.latitude !== previous.latitude || accuracy !== previous.accuracy) {
        clearEvidence(); publish('waiting', 'Arrival evidence reset: GPS timestamps are inconsistent');
      }
      return;
    }
    lastEvaluatedTimestamp = position.timestamp;
    const gap = previous ? position.timestamp - previous.timestamp : 0;
    const movement = previous ? geographicDistance([previous.longitude, previous.latitude], [position.longitude, position.latitude]) : 0;
    const jump = previous && movement > policy.maxJumpSpeedMps * gap / 1000 + policy.jumpAllowanceMeters;
    const tooFast = previous && movement > policy.maxEvidenceSpeedMps * gap / 1000 + policy.jumpAllowanceMeters;
    const movingAway = distance > previousDistance + policy.movingAwayToleranceMeters || (count > 0 && distance > closest + policy.movingAwayToleranceMeters);
    previous = position; previousDistance = distance;
    if (dismissed) {
      if (!jump && distance - accuracy > policy.rearmRadiusMeters + 0.000001) { dismissed = false; clearEvidence(); }
      else { publish('dismissed', 'Arrival suggestion dismissed · Continue navigating or complete this stop manually'); return; }
    }
    if (jump || tooFast || (gap > policy.maxReadingGapMs) || movingAway) {
      clearEvidence(); publish('waiting', 'Arrival evidence reset: movement or GPS continuity is uncertain'); return;
    }
    if (distance + accuracy > policy.radiusMeters + 0.000001) {
      clearEvidence(); publish('waiting', 'Not yet confidently within the arrival area · Manual completion remains available'); return;
    }
    if (!count) { count = 1; since = position.timestamp; lastEvidenceAt = position.timestamp; closest = distance; }
    else if (position.timestamp - lastEvidenceAt >= policy.minReadingIntervalMs) {
      count++; lastEvidenceAt = position.timestamp; closest = Math.min(closest, distance);
    }
    if (count >= policy.minReadings && position.timestamp - since >= policy.dwellMs) {
      const prompt = state.prompt?.key === key ? state.prompt : Object.freeze({ key, stopId: destination.id, name: destination.name });
      publish('likely', 'You may have reached ' + destination.name + '. Confirm to complete this stop.', prompt);
    } else publish('collecting', 'Checking arrival · ' + Math.min(count, policy.minReadings) + '/' + policy.minReadings + ' reliable readings');
  };
  return {
    get: () => state, update,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    stop() { reset(); publish('idle', 'Arrival checks stopped while away'); },
    canConfirm(expected: ArrivalPrompt, input: ArrivalInput) { update(input); return state.status === 'likely' && state.prompt === expected; },
    dismiss(expected: ArrivalPrompt, input: ArrivalInput) {
      update(input);
      if (state.prompt !== expected || state.status !== 'likely') return false;
      dismissed = true; clearEvidence(); publish('dismissed', 'Arrival suggestion dismissed · Continue navigating or complete this stop manually'); return true;
    },
  };
}

export function observeArrival(controller: ReturnType<typeof createArrival>, read: () => ArrivalInput,
  sources: { subscribe: (listener: () => void) => () => void }[],
  app: { addEventListener: (event: 'change', listener: () => void) => { remove: () => void } },
  timers = { set: (fn: () => void) => setInterval(fn, 1000), clear: (id: ReturnType<typeof setInterval>) => clearInterval(id) }) {
  let disposed = false;
  const update = () => { if (!disposed) controller.update(read()); };
  const cleanups = sources.map(source => source.subscribe(update));
  const subscription = app.addEventListener('change', update), tick = timers.set(update);
  update();
  return () => { disposed = true; cleanups.forEach(cleanup => cleanup()); subscription.remove(); timers.clear(tick); controller.stop(); };
}
