export type MotionCamera = { centerCoordinate: number[]; zoomLevel: number; heading: number; pitch: number };
type Flags = { focused: boolean; active: boolean; ready: boolean; selected: boolean; reduceMotion: boolean };
type Clock = { set: (callback: () => void, milliseconds: number) => unknown; clear: (handle: unknown) => void };
export const idleDelay = 10000;
export const rotationDuration = 4000;
export const rotationStep = 2; // 0.5 degree per second; visible but gentle native interpolation.
export function createIdleMotion(animate: (camera: MotionCamera, duration: number) => void, stop: (camera: MotionCamera | null) => void, clock: Clock = {
  set: (callback, delay) => setTimeout(callback, delay),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}) {
  let flags: Flags = { focused: false, active: false, ready: false, selected: false, reduceMotion: true };
  let camera: MotionCamera | null = null;
  let touching = false, gesture = false, animating = false;
  let timer: unknown = null;
  let epoch = 0;
  let target: MotionCamera | null = null;
  const eligible = () => flags.focused && flags.active && flags.ready && !flags.selected && !flags.reduceMotion
    && !touching && !gesture && camera !== null && camera.zoomLevel <= 3;
  function clear() { epoch++; if (timer !== null) clock.clear(timer); timer = null; }
  function halt() { clear(); if (animating) { animating = false; target = null; stop(camera); } }
  function schedule(delay = idleDelay) {
    clear();
    if (!eligible()) return;
    const version = epoch;
    timer = clock.set(() => {
      if (version !== epoch) return;
      timer = null;
      if (!eligible() || !camera) return;
      animating = true;
      const longitude = ((camera.centerCoordinate[0] + rotationStep + 180) % 360 + 360) % 360 - 180;
      target = { ...camera, centerCoordinate: [longitude, camera.centerCoordinate[1]] };
      animate(target, rotationDuration);
      // Native idle events may be rounded, delayed, or carry an old gesture flag.
      // Advance after the animation duration plus a bridge margin, independently
      // of exact coordinate equality. Epoch invalidation prevents stale work
      // from advancing or stopping a later Locate/user command.
      timer = clock.set(() => {
        if (version !== epoch || !animating || !target) return;
        camera = target;
        animating = false; target = null; timer = null;
        schedule(80);
      }, rotationDuration + 150);
    }, delay);
  }
  return {
    configure(patch: Partial<Flags>) {
      const changed = Object.entries(patch).some(([key, value]) => flags[key as keyof Flags] !== value);
      flags = { ...flags, ...patch };
      if (!eligible()) halt();
      else if (changed || timer === null) schedule();
    },
    observe(value: MotionCamera, isGestureActive: boolean) {
      if (value.centerCoordinate.length < 2 || ![...value.centerCoordinate, value.zoomLevel, value.heading, value.pitch].every(Number.isFinite)) return;
      camera = value;
      if (isGestureActive) { gesture = true; halt(); }
      else if (!eligible()) halt();
      else if (timer === null) schedule();
    },
    touch(active: boolean) { touching = active; halt(); if (!active) schedule(); },
    idle() {
      gesture = false;
      if (!animating && timer === null) schedule();
    },
    pause(duration = 0) { halt(); schedule(idleDelay + duration); },
    dispose() { halt(); flags = { ...flags, focused: false, ready: false }; touching = false; gesture = false; },
  };
}
