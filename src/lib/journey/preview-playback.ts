import { travelLegs, travelPosition } from '../discovery/travel';
import type { Coordinate } from './map-data';

type Clock = { now(): number; set(callback: () => void, delay: number): ReturnType<typeof setTimeout>; clear(handle: ReturnType<typeof setTimeout>): void };
export function createJourneyPreview(segments: Coordinate[][], clock: Clock = { now: Date.now, set: setTimeout, clear: clearTimeout }) {
  const legs = travelLegs(segments).map(leg => ({ ...leg, duration: leg.duration * 3 }));
  const total = legs.reduce((sum, leg, index) => sum + leg.duration + (index < legs.length - 1 ? 650 : 0), 0);
  const listeners = new Set<() => void>(), positions = new Set<() => void>();
  let elapsed = 0, started: number | null = null, timer: ReturnType<typeof setTimeout> | null = null, disposed = false;
  let position = legs[0] ? { coordinate: legs[0].start, bearing: legs[0].bearing } : null;
  let snapshot = { status: (legs.length ? 'idle' : 'unavailable') as 'idle' | 'playing' | 'paused' | 'finished' | 'unavailable', ready: false };
  const publish = () => listeners.forEach(listener => listener());
  const stopClock = () => { if (timer !== null) clock.clear(timer); timer = null; };
  const progress = () => Math.min(total, elapsed + (started === null ? 0 : Math.max(0, clock.now() - started)));
  const updatePosition = (time: number) => {
    let remaining = time;
    for (let index = 0; index < legs.length; index++) {
      const leg = legs[index], span = leg.duration + (index < legs.length - 1 ? 650 : 0);
      if (remaining <= span || index === legs.length - 1) {
        position = { coordinate: travelPosition(leg, Math.min(1, remaining / leg.duration)), bearing: leg.bearing };
        positions.forEach(listener => listener()); return;
      }
      remaining -= span;
    }
  };
  const tick = () => {
    if (disposed || started === null) return;
    const time = progress(); updatePosition(time);
    if (time >= total) { elapsed = total; started = null; stopClock(); snapshot = { ...snapshot, status: 'finished' }; publish(); }
    else timer = clock.set(tick, 32);
  };
  const pause = () => {
    if (started === null) return;
    elapsed = progress(); started = null; stopClock(); updatePosition(elapsed);
    snapshot = { ...snapshot, status: elapsed >= total ? 'finished' : 'paused' }; publish();
  };
  const play = () => {
    if (disposed || !snapshot.ready || !legs.length || started !== null || elapsed >= total) return false;
    started = clock.now(); snapshot = { ...snapshot, status: 'playing' }; publish(); tick(); return true;
  };
  return {
    get: () => snapshot, getPosition: () => position, progress, total,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    subscribePosition(listener: () => void) { positions.add(listener); return () => { positions.delete(listener); }; },
    play, pause,
    replay() { if (disposed || !snapshot.ready || !legs.length) return false; pause(); elapsed = 0; updatePosition(0); return play(); },
    setReady(ready: boolean) {
      if (!ready) pause();
      if (snapshot.ready !== ready) { snapshot = { ...snapshot, ready }; publish(); }
    },
    dispose() { pause(); disposed = true; stopClock(); listeners.clear(); positions.clear(); },
  };
}
export type JourneyPreview = ReturnType<typeof createJourneyPreview>;
