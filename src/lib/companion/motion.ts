import { COMPANION, companionFits, type CompanionViewport } from './model';

export type FloatBounds = { left: number; down: number };
export type FloatPosition = { x: number; y: number };
export const FLOAT = { left: 18, down: 12, horizontalPeriod: 18, verticalPeriod: 14, speed: 4 } as const;
/** Reserve the whole expanded widget AND the greeting, not just painted model pixels. */
export function companionFloatBounds(viewport: CompanionViewport, occupiedHeight: number = COMPANION.height): FloatBounds | null {
  if (!companionFits({ ...viewport, interacting: false }) || !Number.isFinite(occupiedHeight) || occupiedHeight < COMPANION.height) return null;
  const freeHeight = viewport.height - viewport.bottomInset - COMPANION.top - occupiedHeight - 12;
  if (freeHeight < 0) return null;
  return { left: Math.min(FLOAT.left, viewport.width - 280), down: Math.min(FLOAT.down, freeHeight) };
}
/** Keep an expanded greeting above Home's World button: 40 dp offset + 44 dp target + 12 dp gap. */
export function companionGreetingHeight(viewport: CompanionViewport, bounds: FloatBounds | null) {
  return bounds ? Math.min(180, viewport.height - viewport.bottomInset - COMPANION.top - bounds.down - 96) : 0;
}
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value)) || 0;
const approach = (value: number, target: number, step: number) => value + clamp(target - value, -step, step);
export function createCompanionMotion() {
  let position: FloatPosition = { x: 0, y: 0 };
  let bounds: FloatBounds = { left: 0, down: 0 };
  let lastTime: number | null = null;
  let elapsed = 0;
  const pause = () => { lastTime = null; };
  const setPosition = (x: number, y: number) => {
    if (position.x !== x || position.y !== y) position = { x, y };
    return position;
  };
  return {
    pause,
    get: () => position,
    configure(next: FloatBounds | null) {
      bounds = next && [next.left, next.down].every(Number.isFinite)
        ? { left: clamp(next.left, 0, FLOAT.left), down: clamp(next.down, 0, FLOAT.down) } : { left: 0, down: 0 };
      return setPosition(clamp(position.x, -bounds.left, 0), clamp(position.y, 0, bounds.down));
    },
    frame(time: number, moving: boolean) {
      if (!moving || !Number.isFinite(time)) { pause(); return position; }
      // A resumed driver establishes a fresh timestamp; background time never advances phase.
      if (lastTime === null || time < lastTime) { lastTime = time; return position; }
      const delta = Math.min(time - lastTime, 0.1);
      lastTime = time;
      elapsed += delta;
      const x = -bounds.left * (1 - Math.cos(elapsed * 2 * Math.PI / FLOAT.horizontalPeriod)) / 2;
      const y = bounds.down * (1 - Math.cos(elapsed * 2 * Math.PI / FLOAT.verticalPeriod)) / 2;
      // Resize can change the target; approach it gradually after any necessary boundary clamp.
      return setPosition(approach(position.x, x, FLOAT.speed * delta), approach(position.y, y, FLOAT.speed * delta));
    },
  };
}
