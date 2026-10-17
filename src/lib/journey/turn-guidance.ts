import type { Position } from './foreground-location';
import type { RoadRoute } from './navigation';

type Coordinate = [number, number];
export type RouteStep = {
  instruction: string; type: string; modifier: string | null; location: Coordinate;
  distance: number; duration: number; geometry: Coordinate[];
};
export type Guidance = {
  status: 'ready' | 'waiting' | 'unavailable'; message: string;
  maneuver: RouteStep | null; maneuverIndex: number | null;
  distanceToManeuver: number | null; remainingDistance: number | null;
};
export const GUIDANCE_ACCURACY_METERS = 25;
export const MATCH_DISTANCE_METERS = 20;
export const MAX_PROGRESS_SPEED_MPS = 55;
export const MAX_PROGRESS_GAP_MS = 5000;
export const TURN_CONFIRMATION_MS = 1000;
export const TURN_PASS_METERS = 12;
const EARTH = 6371008.8, radians = Math.PI / 180;
const longitudeDelta = (value: number) => ((value + 540) % 360 + 360) % 360 - 180;
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const point = (value: unknown): value is Coordinate => Array.isArray(value) && value.length === 2
  && typeof value[0] === 'number' && Number.isFinite(value[0]) && Math.abs(value[0]) <= 180
  && typeof value[1] === 'number' && Number.isFinite(value[1]) && Math.abs(value[1]) <= 90;
const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const text = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value.length <= 500;
export function geographicDistance(a: Coordinate, b: Coordinate) {
  const lat = (b[1] - a[1]) * radians, lon = longitudeDelta(b[0] - a[0]) * radians;
  const h = Math.sin(lat / 2) ** 2 + Math.cos(a[1] * radians) * Math.cos(b[1] * radians) * Math.sin(lon / 2) ** 2;
  return 2 * EARTH * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}

// Mapbox Directions v5: a maneuver starts its step; step geometry leads to the next maneuver.
// https://docs.mapbox.com/api/navigation/directions/#route-step-object
// Never filter malformed middle steps: that would silently remove a turn.
export function parseRouteSteps(value: unknown, overview: Coordinate[]): RouteStep[] | null {
  if (!Array.isArray(value) || value.length !== 1) return null; // This request has exactly two waypoints / one leg.
  const raw = object(value[0]).steps;
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 2000) return null;
  const steps: RouteStep[] = []; let points = 0;
  for (const item of raw) {
    const step = object(item), maneuver = object(step.maneuver), geometry = object(step.geometry);
    if (!text(maneuver.instruction) || !text(maneuver.type) || !point(maneuver.location)
      || (maneuver.modifier != null && !text(maneuver.modifier)) || !nonnegative(step.distance) || !nonnegative(step.duration)
      || geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2
      || (points += geometry.coordinates.length) > 100000 || !geometry.coordinates.every(point)) return null;
    const coordinates = geometry.coordinates as Coordinate[];
    if (geographicDistance(maneuver.location, coordinates[0]) > 5
      || (steps.length > 0 && geographicDistance(steps[steps.length - 1].geometry.at(-1)!, coordinates[0]) > 5)) return null;
    steps.push({ instruction: maneuver.instruction.trim(), type: maneuver.type.trim(), modifier: typeof maneuver.modifier === 'string' ? maneuver.modifier.trim() : null,
      location: maneuver.location, distance: step.distance, duration: step.duration, geometry: coordinates });
  }
  if (steps[0].type !== 'depart' || steps.at(-1)!.type !== 'arrive'
    || steps.slice(1, -1).some(step => step.type === 'depart' || step.type === 'arrive')
    || geographicDistance(steps[0].location, overview[0]) > 5
    || geographicDistance(steps.at(-1)!.location, overview.at(-1)!) > 5) return null;
  return steps;
}

type Measured = { step: RouteStep; lengths: number[]; length: number; offset: number };
export function lineDistances(geometry: Coordinate[]) {
  const lengths = [0];
  for (let i = 1; i < geometry.length; i++) lengths.push(lengths[i - 1] + geographicDistance(geometry[i - 1], geometry[i]));
  return lengths;
}
function measure(steps: readonly RouteStep[]) {
  let offset = 0;
  return steps.map(step => {
    const lengths = lineDistances(step.geometry);
    const length = lengths.at(-1)!;
    const result = { step, lengths, length, offset }; offset += length; return result;
  });
}
function project(position: Coordinate, measured: Measured, reference: number) {
  return projectLine(position, measured.step.geometry, measured.lengths, reference);
}
export function projectLine(position: Coordinate, geometry: Coordinate[], lengths: number[], reference?: number) {
  let best = { distance: Infinity, along: 0 };
  const scale = Math.max(0.001, Math.cos(position[1] * radians));
  for (let i = 1; i < geometry.length; i++) {
    const a = geometry[i - 1], b = geometry[i];
    const ax = longitudeDelta(a[0] - position[0]) * radians * EARTH * scale, ay = (a[1] - position[1]) * radians * EARTH;
    const dx = longitudeDelta(b[0] - a[0]) * radians * EARTH * scale, dy = (b[1] - a[1]) * radians * EARTH;
    const square = dx * dx + dy * dy;
    const fraction = square === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / square));
    const distance = Math.hypot(ax + fraction * dx, ay + fraction * dy);
    const along = lengths[i - 1] + fraction * (lengths[i] - lengths[i - 1]);
    if (reference === undefined ? distance < best.distance : distance < best.distance - 1 || (Math.abs(distance - best.distance) <= 1 && Math.abs(along - reference) < Math.abs(best.along - reference))) best = { distance, along };
  }
  return best;
}
const unavailable = (message: string, status: Guidance['status'] = 'waiting'): Guidance => ({ status, message, maneuver: null, maneuverIndex: null, distanceToManeuver: null, remainingDistance: null });

export function createGuidance(validFix: (position: Position | null, now: number) => boolean, now = Date.now) {
  let route: RoadRoute | null = null, measured: Measured[] = [], index = 0, progress = 0;
  let previous: Position | null = null, candidate: { since: number; along: number; startAlong: number; timestamp: number } | null = null;
  let acceptedAt: number | null = null, lastResult: Guidance | null = null;
  const reset = () => { route = null; measured = []; index = 0; progress = 0; previous = null; candidate = null; acceptedAt = null; lastResult = null; };
  const calculate = (next: RoadRoute, position: Position | null): Guidance => {
    if (next !== route) { reset(); route = next; measured = next.steps ? measure(next.steps) : []; }
    if (!measured.length) return unavailable('Turn instructions unavailable for this route. Stop completion remains manual.', 'unavailable');
    if (!validFix(position, now()) || !position || position.accuracy === null || position.accuracy > GUIDANCE_ACCURACY_METERS) {
      candidate = null; previous = null; return unavailable('Waiting for precise GPS: accuracy ≤25 m and age ≤15 seconds required');
    }
    const coordinate: Coordinate = [position.longitude, position.latitude], current = measured[index];
    const match = project(coordinate, current, progress - current.offset);
    const targetIndex = Math.min(index + 1, measured.length - 1);
    const following = measured[targetIndex], nextMatch = project(coordinate, following, 0);
    const timestamp = previous?.timestamp;
    if (timestamp !== undefined && position.timestamp === timestamp && lastResult) return lastResult;
    if (timestamp !== undefined && position.timestamp < timestamp) return unavailable('Waiting for a new GPS reading');
    const delta = timestamp === undefined ? 0 : position.timestamp - timestamp;
    const budget = timestamp === undefined ? 60 : MAX_PROGRESS_SPEED_MPS * Math.min(delta, MAX_PROGRESS_GAP_MS) / 1000 + 10;
    const forwardBudget = acceptedAt === null ? 60 : MAX_PROGRESS_SPEED_MPS * Math.min(position.timestamp - acceptedAt, MAX_PROGRESS_GAP_MS) / 1000 + 10;
    const gap = delta > MAX_PROGRESS_GAP_MS;
    const jump = previous && geographicDistance([previous.longitude, previous.latitude], coordinate) > budget;
    // Inspect only the current and immediate outgoing step, never the whole route's nearest point.
    const crossing = index + 1 < measured.length - 1 && current.offset + current.length - progress <= 40
      && nextMatch.along >= TURN_PASS_METERS && nextMatch.distance <= MATCH_DISTANCE_METERS && nextMatch.distance + 3 < match.distance;
    const proposed = crossing ? following.offset + nextMatch.along : current.offset + match.along;
    const bad = gap || jump || proposed > progress + forwardBudget || proposed < progress - 8 || (!crossing && match.distance > MATCH_DISTANCE_METERS);
    if (bad) { candidate = null; previous = position; return unavailable('Cannot confirm route progress. Guidance is held; stop completion remains manual.'); }
    if (crossing) {
      if (!candidate || nextMatch.along < candidate.along - 3) candidate = { since: position.timestamp, along: nextMatch.along, startAlong: nextMatch.along, timestamp: position.timestamp };
      else if (position.timestamp > candidate.timestamp && position.timestamp - candidate.since >= TURN_CONFIRMATION_MS && nextMatch.along >= candidate.startAlong + 3) {
        index++; progress = Math.max(progress, proposed); acceptedAt = position.timestamp; candidate = null;
      } else candidate = { ...candidate, along: nextMatch.along, timestamp: position.timestamp };
    } else { candidate = null; progress = Math.max(progress, proposed); acceptedAt = position.timestamp; }
    previous = position;
    const target = measured[Math.min(index + 1, measured.length - 1)];
    const total = measured.at(-1)!.offset + measured.at(-1)!.length;
    if (!(total > 0)) return unavailable('Turn instructions have no usable route geometry', 'unavailable');
    return { status: 'ready', message: 'GPS estimate along the calculated route', maneuver: target.step,
      maneuverIndex: Math.min(index + 1, measured.length - 1), distanceToManeuver: Math.max(0, target.offset - progress),
      remainingDistance: Math.max(0, (total - progress) / total * next.distance) };
  };
  return { update(next: RoadRoute, position: Position | null) { lastResult = calculate(next, position); return lastResult; }, reset };
}

export function maneuverIcon(step: RouteStep) {
  if (step.type === 'arrive') return '⚑';
  if (step.type.includes('roundabout') || step.type.includes('rotary')) return '↻';
  if (step.modifier === 'uturn') return '↶';
  if (step.modifier?.includes('left')) return '↰';
  if (step.modifier?.includes('right')) return '↱';
  return step.modifier === 'straight' || step.type === 'depart' ? '↑' : '◇';
}
export function guidanceDistance(meters: number) {
  return meters < 1000 ? '~' + Math.round(meters / 10) * 10 + ' m' : '~' + (meters / 1000).toFixed(1) + ' km';
}
