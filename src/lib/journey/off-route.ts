import type { Position } from './foreground-location';
import type { RoadRoute } from './navigation';
import { geographicDistance, lineDistances, projectLine } from './turn-guidance';

export type OffRoutePolicy = {
  deviationMeters: number; minReadings: number; dwellMs: number; minReadingIntervalMs: number;
  maxReadingGapMs: number; maxSpeedMps: number; jumpAllowanceMeters: number;
  cooldownMs: number; referenceTtlMs: number;
};
export const OFF_ROUTE_POLICY: Readonly<OffRoutePolicy> = Object.freeze({
  deviationMeters: 40, minReadings: 3, dwellMs: 8000, minReadingIntervalMs: 2000,
  maxReadingGapMs: 6000, maxSpeedMps: 55, jumpAllowanceMeters: 10,
  cooldownMs: 30000, referenceTtlMs: 120000,
});
export type Deviation = { status: 'on-route' | 'waiting' | 'confirming' | 'confirmed'; message: string };
export function distanceFromRoad(position: Position, route: RoadRoute) {
  return projectLine([position.longitude, position.latitude], route.geometry.coordinates, lineDistances(route.geometry.coordinates)).distance;
}
// Whole accepted driving geometry is intentional: intersecting/nearby legs remain ambiguous,
// rather than being declared off-route because maneuver progress was uncertain.
export function createOffRoute(validFix: (position: Position | null, now: number) => boolean, now = Date.now, options: Partial<OffRoutePolicy> = {}) {
  const policy = Object.freeze({ ...OFF_ROUTE_POLICY, ...options });
  if (Object.values(policy).some(value => !Number.isFinite(value) || value <= 0) || !Number.isInteger(policy.minReadings)
    || policy.minReadings < 3 || policy.dwellMs < 8000 || policy.maxReadingGapMs < policy.minReadingIntervalMs)
    throw new RangeError('Invalid off-route policy');
  let route: RoadRoute | null = null, lengths: number[] = [], previous: Position | null = null;
  let count = 0, since = 0, countedAt = 0, lastTimestamp = -Infinity;
  let state: Deviation = { status: 'waiting', message: '' };
  const clear = () => { count = 0; since = 0; countedAt = 0; };
  const reset = () => { route = null; lengths = []; previous = null; clear(); state = { status: 'waiting', message: '' }; };
  const set = (status: Deviation['status'], message = '') => { state = { status, message }; return state; };
  const update = (next: RoadRoute, position: Position | null): Deviation => {
    if (next !== route) { reset(); route = next; lengths = lineDistances(next.geometry.coordinates); }
    if (!validFix(position, now()) || !position || position.accuracy === null) { previous = null; clear(); return set('waiting'); }
    if (count > 0 && previous && now() - previous.timestamp > policy.maxReadingGapMs) { clear(); set('waiting'); }
    if (!previous && position.timestamp <= lastTimestamp) return set('waiting');
    if (previous && position.timestamp <= previous.timestamp) {
      if (position.timestamp < previous.timestamp || position.longitude !== previous.longitude || position.latitude !== previous.latitude || position.accuracy !== previous.accuracy) { clear(); return set('waiting'); }
      return state;
    }
    const gap = previous ? position.timestamp - previous.timestamp : 0;
    const jump = previous && geographicDistance([previous.longitude, previous.latitude], [position.longitude, position.latitude])
      > policy.maxSpeedMps * gap / 1000 + policy.jumpAllowanceMeters;
    previous = position; lastTimestamp = position.timestamp;
    if (jump || gap > policy.maxReadingGapMs) { clear(); return set('waiting'); }
    const distance = projectLine([position.longitude, position.latitude], next.geometry.coordinates, lengths).distance;
    if (distance - position.accuracy <= policy.deviationMeters + 0.000001) { clear(); return set('on-route'); }
    if (!count) { count = 1; since = position.timestamp; countedAt = position.timestamp; }
    else if (position.timestamp - countedAt >= policy.minReadingIntervalMs) { count++; countedAt = position.timestamp; }
    if (count >= policy.minReadings && position.timestamp - since >= policy.dwellMs) return set('confirmed', 'Sustained route deviation confirmed');
    return set('confirming', 'Checking route deviation · ' + Math.min(count, policy.minReadings) + '/' + policy.minReadings + ' readings · at least 8 seconds');
  };
  return { policy, update, reset };
}
