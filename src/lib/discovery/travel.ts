import type { PublicJourney } from '../../types/journey';
import { buildMapData, type Coordinate } from '../journey/map-data';

export function discoveryRoute(journey: PublicJourney | null): Coordinate[][] {
  return journey ? buildMapData(journey.stops).line.geometry.coordinates : [];
}
const radians = Math.PI / 180;
const wrap = (longitude: number) => ((longitude + 180) % 360 + 360) % 360 - 180;
function valid(point: Coordinate) {
  return Array.isArray(point) && point.length === 2 && point.every(value => typeof value === 'number' && Number.isFinite(value))
    && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
}
type Vector = [number, number, number];
const dot = (a: Vector, b: Vector) => a.reduce((sum, value, index) => sum + value * b[index], 0);
function vector([longitude, latitude]: Coordinate): Vector {
  return [Math.cos(latitude * radians) * Math.cos(longitude * radians),
    Math.cos(latitude * radians) * Math.sin(longitude * radians), Math.sin(latitude * radians)];
}
export type TravelLeg = { start: Coordinate; target: Coordinate; coordinates: Coordinate[]; bearing: number; duration: number };
export function travelLegs(segments: Coordinate[][]): TravelLeg[] {
  return segments.flatMap(segment => segment.slice(1).flatMap((end, index) => {
    const start = segment[index];
    if (!valid(start) || !valid(end)) return [];
    const a = vector(start), b = vector(end), cosine = Math.max(-1, Math.min(1, dot(a, b)));
    let tangent = b.map((value, i) => value - cosine * a[i]) as Vector;
    let length = Math.hypot(...tangent);
    const angle = Math.atan2(length, cosine);
    if (angle < 1e-10) return []; // Coincident positions, including +/-180 and the poles.
    if (length < 1e-10) {
      // An exactly antipodal pair has no unique shortest arc. Choose a stable
      // orthogonal direction instead of dividing by zero or inventing a stop.
      const axis = a.map(Math.abs).indexOf(Math.min(...a.map(Math.abs)));
      tangent = a.map((value, i) => (i === axis ? 1 : 0) - a[axis] * value) as Vector;
      length = Math.hypot(...tangent);
    }
    tangent = tangent.map(value => value / length) as Vector;
    // Uniform angular steps, at most 2 degrees, bounded to 96 intervals per leg.
    const count = Math.min(96, Math.max(8, Math.ceil(angle / radians / 2)));
    const coordinates: Coordinate[] = [[...start]];
    for (let step = 1; step <= count; step++) {
      const t = step / count;
      const v = a.map((value, i) => value * Math.cos(angle * t) + tangent[i] * Math.sin(angle * t));
      const longitude = step === count ? end[0] : Math.atan2(v[1], v[0]) / radians;
      const latitude = step === count ? end[1] : Math.atan2(v[2], Math.hypot(v[0], v[1])) / radians;
      const previous = coordinates.at(-1)!;
      coordinates.push([previous[0] + wrap(longitude - previous[0]), latitude]);
    }
    const next = coordinates[1];
    const delta = (next[0] - start[0]) * radians;
    const bearing = Math.atan2(Math.sin(delta) * Math.cos(next[1] * radians),
      Math.cos(start[1] * radians) * Math.sin(next[1] * radians)
      - Math.sin(start[1] * radians) * Math.cos(next[1] * radians) * Math.cos(delta)) / radians;
    return [{ start: coordinates[0], target: coordinates.at(-1)!, coordinates, bearing, duration: 2800 }];
  }));
}
// Plane uses this same sampled path; only an O(1) lookup/lerp runs per animation
// update. Spherical calculations happen once when the selected route changes.
export function travelPosition(leg: TravelLeg, progress: number): Coordinate {
  const position = Math.max(0, Math.min(1, progress)) * (leg.coordinates.length - 1);
  const index = Math.min(Math.floor(position), leg.coordinates.length - 2), fraction = position - index;
  const start = leg.coordinates[index], end = leg.coordinates[index + 1];
  return [start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction];
}
export function travelLine(segments: Coordinate[][], legs = travelLegs(segments)) {
  const coordinates: Coordinate[][] = [];
  for (const leg of legs) {
    let part: Coordinate[] = [[wrap(leg.start[0]), leg.start[1]]];
    for (const point of leg.coordinates.slice(1)) {
      const next: Coordinate = [wrap(point[0]), point[1]], previous = part.at(-1)!;
      if (Math.abs(next[0] - previous[0]) > 180) {
        const longitude = previous[0] + wrap(next[0] - previous[0]);
        const edge = longitude > previous[0] ? 180 : -180;
        const latitude = previous[1] + (next[1] - previous[1]) * (edge - previous[0]) / (longitude - previous[0]);
        part.push([edge, latitude]);
        if (part.some(p => p[0] !== part[0][0] || p[1] !== part[0][1])) coordinates.push(part);
        part = [[-edge, latitude]];
      }
      part.push(next);
    }
    if (part.some(p => p[0] !== part[0][0] || p[1] !== part[0][1])) coordinates.push(part);
  }
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'MultiLineString' as const, coordinates } };
}

type Leg = TravelLeg;
type Clock = { set: (callback: () => void, delay: number) => unknown; clear: (handle: unknown) => void };
export function createTravelPlayback(legs: Leg[], move: (leg: Leg, done: (finished: boolean) => void) => void, stop: () => void, clock: Clock = {
  set: (callback, delay) => setTimeout(callback, delay), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}) {
  let active = false, generation = 0, timer: unknown = null;
  function cancel() { active = false; generation++; if (timer !== null) clock.clear(timer); timer = null; stop(); }
  function advance(index: number, version: number) {
    if (!active || version !== generation || index >= legs.length) return;
    move(legs[index], finished => {
      if (!finished || !active || version !== generation || index + 1 >= legs.length) return;
      timer = clock.set(() => { timer = null; advance(index + 1, version); }, 650);
    });
  }
  return { cancel, start() { cancel(); active = true; advance(0, generation); } };
}
