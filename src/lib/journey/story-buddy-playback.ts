import type { JourneyStop } from '@/types/journey';
import { hasCoordinates, type Coordinate } from './map-data';
import { travelLegs, travelPosition, type TravelLeg } from '../discovery/travel';

type Clock = { now: () => number; set: (fn: () => void, delay: number) => unknown; clear: (handle: unknown) => void };
type Snapshot = { coordinate: Coordinate | null; moving: boolean; facing: 'left' | 'right'; revision: number };
const defaultClock: Clock = { now: Date.now, set: setTimeout, clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) };
const normalized = ([longitude, latitude]: Coordinate): Coordinate => [((longitude + 180) % 360 + 360) % 360 - 180, latitude];

// One controller belongs to the Story, not either map instance. Changing cards
// retargets the current position; expansion never restarts a journey preview.
export function createStoryBuddyPlayback(stops: JourneyStop[], clock: Clock = defaultClock) {
  const ordered = [...stops].sort((a, b) => a.sequence - b.sequence), listeners = new Set<() => void>();
  let snapshot: Snapshot = { coordinate: null, moving: false, facing: 'left', revision: 0 };
  let selected: string | null = null, cursor = -1, direction = 0, ready = false, reduced = true;
  let timer: unknown = null, generation = 0, started = 0;
  let route: { leg: TravelLeg; index: number }[] = [];
  const coordinate = (index: number): Coordinate | null => {
    const stop = ordered[index]; return stop && hasCoordinates(stop) ? [stop.longitude, stop.latitude] : null;
  };
  const publish = (patch: Partial<Snapshot>) => { snapshot = { ...snapshot, ...patch, revision: snapshot.revision + 1 }; listeners.forEach(fn => fn()); };
  const cancel = () => { generation++; if (timer !== null) clock.clear(timer); timer = null; };
  function tick(version: number) {
    if (version !== generation || !ready || reduced || !route.length) return;
    const step = route[0], progress = Math.min(1, Math.max(0, (clock.now() - started) / step.leg.duration));
    publish({ coordinate: normalized(travelPosition(step.leg, progress)), moving: progress < 1, facing: step.leg.bearing >= 0 ? 'right' : 'left' });
    if (progress >= 1) {
      cursor = step.index; route.shift();
      if (route.length) timer = clock.set(() => { if (version === generation) { started = clock.now(); tick(version); } }, 250);
      return;
    }
    timer = clock.set(() => tick(version), 32);
  }
  function resume() {
    if (!ready || reduced || !route.length || !snapshot.coordinate) return;
    // Resume from the exact displayed coordinate rather than replaying a leg.
    const first = route[0], leg = travelLegs([[snapshot.coordinate, normalized(first.leg.target)]])[0];
    if (leg) route[0] = { ...first, leg: { ...leg, duration: 1800 } };
    started = clock.now(); tick(generation);
  }
  function select(id: string | null) {
    if (selected === id) return;
    const previous = ordered.findIndex(stop => stop.id === selected), target = ordered.findIndex(stop => stop.id === id);
    selected = id; cancel();
    const destination = coordinate(target);
    const oldRoute = route; route = [];
    if (!destination) { cursor = target; direction = 0; publish({ coordinate: null, moving: false }); return; }
    const low = Math.min(previous, target), high = Math.max(previous, target);
    if (!snapshot.coordinate || cursor < 0 || reduced || previous < 0 || ordered.slice(low, high + 1).some(stop => !hasCoordinates(stop))) {
      cursor = target; direction = 0; publish({ coordinate: destination, moving: false }); return;
    }
    const nextDirection = Math.sign(target - cursor);
    const indices: number[] = [];
    // A reversal while between stops first returns to the last reached stop.
    if (oldRoute.length && direction && nextDirection !== direction) indices.push(cursor);
    for (let index = cursor + nextDirection; nextDirection && (nextDirection > 0 ? index <= target : index >= target); index += nextDirection) indices.push(index);
    let start = snapshot.coordinate;
    for (const index of indices) {
      const end = coordinate(index);
      if (!end) { route = []; cursor = target; direction = 0; publish({ coordinate: destination, moving: false }); return; }
      const leg = travelLegs([[start, end]])[0];
      if (leg) route.push({ leg: { ...leg, duration: 1800 }, index });
      else if (route.length) route[route.length - 1].index = index;
      else cursor = index;
      start = end;
    }
    direction = nextDirection;
    if (!route.length) { cursor = target; publish({ coordinate: destination, moving: false }); return; }
    publish({ moving: false }); resume();
  }
  return {
    get: () => snapshot,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    select,
    configure(active: boolean, reduceMotion: boolean) {
      if (ready === active && reduced === reduceMotion) return;
      ready = active; reduced = reduceMotion; cancel();
      if (reduced) {
        const index = ordered.findIndex(stop => stop.id === selected); cursor = index; route = []; direction = 0;
        publish({ coordinate: coordinate(index), moving: false });
      } else { publish({ moving: false }); resume(); }
    },
    pause() { ready = false; cancel(); publish({ moving: false }); },
    dispose() { ready = false; cancel(); route = []; listeners.clear(); },
  };
}
export type StoryBuddyPlayback = ReturnType<typeof createStoryBuddyPlayback>;
