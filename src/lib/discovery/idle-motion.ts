export type MotionCamera = { centerCoordinate: number[]; zoomLevel: number; heading: number; pitch: number };
type Flags = { focused: boolean; active: boolean; ready: boolean; selected: boolean; reduceMotion: boolean; interacting: boolean };
type Clock = { set: (callback: () => void, milliseconds: number) => unknown; clear: (handle: unknown) => void; now?: () => number };
export const idleDelay = 10000;
export const rotationDuration = 4000;
export const rotationStep = 5; // 1.25 degrees/second (about 1.23 including the 50 ms bridge margin).
export function createIdleMotion(animate: (camera: MotionCamera, duration: number) => void, stop: (camera: MotionCamera | null) => void, clock: Clock = {
  set: (callback, delay) => setTimeout(callback, delay),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}) {
  let flags: Flags = { focused: false, active: false, ready: false, selected: false, reduceMotion: true, interacting: false };
  let camera: MotionCamera | null = null;
  let touching = false, gesture = false, animating = false;
  let resumeAfter = 0, cameraTransition = false;
  const now = () => clock.now?.() ?? Date.now();
  let timer: unknown = null;
  let epoch = 0;
  let target: MotionCamera | null = null;
  const eligible = () => flags.focused && flags.active && flags.ready && !flags.selected && !flags.reduceMotion && !flags.interacting
    && !touching && !gesture && camera !== null && camera.zoomLevel <= 3;
  function clear() { epoch++; if (timer !== null) clock.clear(timer); timer = null; }
  function halt() { clear(); cameraTransition = false; if (animating) { animating = false; target = null; stop(camera); } }
  function schedule(delay = Math.max(0, resumeAfter - now())) {
    clear();
    if (!eligible() || cameraTransition) return;
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
        schedule(0);
      }, rotationDuration + 50);
    }, delay);
  }
  return {
    configure(patch: Partial<Flags>) {
      flags = { ...flags, ...patch };
      if (!flags.focused || !flags.active || !flags.ready) { touching = false; gesture = false; }
      if (!eligible()) {
        // Keep an initial camera hold even before the first valid pose arrives.
        if (!cameraTransition || !flags.focused || !flags.active || !flags.ready || flags.selected) halt();
      } else if (!cameraTransition && timer === null) schedule();
    },
    observe(value: MotionCamera, isGestureActive: boolean) {
      if (value.centerCoordinate.length < 2 || ![...value.centerCoordinate, value.zoomLevel, value.heading, value.pitch].every(Number.isFinite)) return;
      camera = value;
      // Native camera events can retain an old gesture flag. Only an actual
      // map touch can begin a gesture; its inertia remains active until idle.
      if (isGestureActive && (touching || gesture)) { gesture = true; halt(); }
      else if (!eligible()) { if (!cameraTransition) halt(); }
      else if (!cameraTransition && timer === null) schedule();
    },
    touch(active: boolean) {
      if (touching === active) return;
      touching = active;
      halt();
      if (!active) { resumeAfter = now() + idleDelay; schedule(); }
    },
    idle() {
      if (gesture) resumeAfter = now() + idleDelay;
      gesture = false;
      if (!animating && timer === null) schedule();
    },
    pause(duration = 0) {
      halt();
      gesture = false;
      if (flags.selected) return; // Locate selection owns its entire transition.
      // Reserve the camera even if its first pose has not arrived yet. Readiness
      // and camera events must not replace this hold with an immediate start.
      cameraTransition = true;
      const version = epoch;
      timer = clock.set(() => {
        if (version !== epoch) return;
        timer = null; cameraTransition = false; schedule();
      }, duration);
    },
    dispose() { halt(); resumeAfter = 0; flags = { ...flags, focused: false, ready: false }; touching = false; gesture = false; },
  };
}
