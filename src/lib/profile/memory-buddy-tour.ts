import type { MemoryPin } from './memory-map';
import { travelLegs, travelPosition, type TravelLeg } from '../discovery/travel';

type Coordinate = [number, number];
export type MemoryTourSnapshot = {
  key: string | null; index: number; coordinate: Coordinate | null; moving: boolean; bubble: boolean;
  animation: 'idle' | 'run' | 'jump'; facing: 'left' | 'right'; playing: boolean;
};
export type MemoryTourClock = { now: () => number; request: (callback: () => void) => number; cancel: (id: number) => void };
const clock: MemoryTourClock = { now: Date.now, request: callback => requestAnimationFrame(callback), cancel: id => cancelAnimationFrame(id) };
const coordinate = (pin: MemoryPin): Coordinate => [pin.longitude, pin.latitude];
const signature = (pins: readonly MemoryPin[]) => pins.map(pin => pin.key + '@' + pin.longitude + ',' + pin.latitude).join('|');
const empty: MemoryTourSnapshot = { key: null, index: 0, coordinate: null, moving: false, bubble: false, animation: 'idle', facing: 'left', playing: false };
function normalized(pins: readonly MemoryPin[]) {
  const seen = new Set<string>();
  return pins.filter(pin => {
    if (!pin || typeof pin.key !== 'string' || !pin.key.trim() || seen.has(pin.key) || !Number.isFinite(pin.longitude) || !Number.isFinite(pin.latitude) || Math.abs(pin.longitude) > 180 || Math.abs(pin.latitude) > 90) return false;
    seen.add(pin.key);return true;
  });
}

// A decorative replay of published stops, never GPS movement or proof of travel.
// One cancellable clock owns both travel and photo holds. Native camera is untouched.
export function createMemoryBuddyTour(initial: readonly MemoryPin[], timer: MemoryTourClock = clock, permitted: () => boolean = () => true) {
  let pins = normalized(initial), membership = signature(pins), snapshot = empty;
  let meta = { key: snapshot.key, index: snapshot.index, bubble: snapshot.bubble, playing: snapshot.playing };
  let active = false, animate = false, requested = true, disposed = false;
  let phase: 'hold' | 'run' | 'jump' = 'hold', duration = 3500, elapsed = 0, last = 0;
  let leg: TravelLeg | null = null, frame: number | null = null, generation = 0;
  const listeners = new Set<() => void>();
  const metaListeners = new Set<() => void>();
  const publish = (patch: Partial<MemoryTourSnapshot>) => {
    snapshot = { ...snapshot, ...patch };listeners.forEach(listener => listener());
    if (meta.key !== snapshot.key || meta.index !== snapshot.index || meta.bubble !== snapshot.bubble || meta.playing !== snapshot.playing) {
      meta = { key: snapshot.key, index: snapshot.index, bubble: snapshot.bubble, playing: snapshot.playing };metaListeners.forEach(listener => listener());
    }
  };
  const stopClock = () => { generation++;if (frame !== null) timer.cancel(frame);frame = null;last = 0; };
  const canPlay = () => active && animate && requested && pins.length > 1 && !disposed && permitted();
  const canTick = () => canPlay() || active && animate && phase === 'jump' && !disposed && permitted();
  const hold = (index: number, milliseconds = 3500) => {
    phase = 'hold';duration = milliseconds;elapsed = 0;leg = null;
    const pin = pins[index];
    publish(pin ? { key: pin.key, index, coordinate: coordinate(pin), moving: false, bubble: true, animation: 'idle' } : empty);
  };
  const run = () => {
    const next = (snapshot.index + 1) % pins.length, target = pins[next];
    const from = snapshot.coordinate ?? coordinate(pins[snapshot.index]);
    leg = travelLegs([[from, coordinate(target)]])[0] ?? null;
    if (!leg) { hold(next);return; }
    phase = 'run';duration = 1800;elapsed = 0;
    publish({ key: target.key, index: next, moving: true, bubble: false, animation: 'run', facing: leg.target[0] >= leg.start[0] ? 'right' : 'left' });
  };
  const schedule = () => {
    if (frame !== null || !canTick()) return;
    const epoch = generation;
    last = timer.now();
    frame = timer.request(() => {
      frame = null;
      if (disposed || epoch !== generation || !canTick()) return;
      const now = timer.now();elapsed += Math.max(0, now - last);last = now;
      if (phase === 'run' && leg) publish({ coordinate: travelPosition(leg, Math.min(1, elapsed / duration)) });
      if (elapsed >= duration) {
        if (phase === 'hold') run();
        else hold(snapshot.index, phase === 'jump' ? 6000 : 3500);
      }
      schedule();
    });
  };
  if (pins.length) hold(0);
  return {
    get: () => snapshot,
    getMeta: () => meta,
    subscribe(listener: () => void) { listeners.add(listener);return () => { listeners.delete(listener); }; },
    subscribeMeta(listener: () => void) { metaListeners.add(listener);return () => { metaListeners.delete(listener); }; },
    update(next: readonly MemoryPin[]) {
      const valid = normalized(next), changed = signature(valid) !== membership;
      pins = valid;
      if (!changed) return;
      stopClock();membership = signature(valid);hold(0);publish({ playing: canPlay() });schedule();
    },
    configure(available: boolean, motion: boolean) {
      if (active === available && animate === motion) return;
      stopClock();active = available;animate = motion;
      if (!animate && pins.length) hold(Math.min(snapshot.index, pins.length - 1));
      publish({ playing: canPlay() });schedule();
    },
    pause() { if (!requested && frame === null) return;stopClock();requested = false;publish({ playing: false, animation: 'idle' }); },
    resume() { if (!pins.length) return;stopClock();requested = true;publish({ playing: canPlay(), animation: phase === 'run' && animate ? 'run' : phase === 'jump' && animate ? 'jump' : 'idle' });schedule(); },
    select(key: string, resumeAfter = snapshot.playing) {
      const index = pins.findIndex(pin => pin.key === key);
      if (index < 0 || disposed) return;
      const wasPlaying = resumeAfter;
      stopClock();requested = wasPlaying;hold(index, 6000);
      // A paused tour still plays a bounded local jump when manually selected.
      // It must not gain an autoplay request from that jump.
      if (animate) {
        phase = 'jump';duration = 600;elapsed = 0;
        publish({ animation: 'jump', bubble: true, playing: canPlay() });
      } else publish({ playing: false });
      schedule();
    },
    next() { if (pins.length) this.select(pins[(snapshot.index + 1) % pins.length].key); },
    dispose() { stopClock();disposed = true;listeners.clear();metaListeners.clear(); },
  };
}
export type MemoryBuddyTour = ReturnType<typeof createMemoryBuddyTour>;
