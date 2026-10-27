import type { BuddyRect } from './model';
export const LIVE_BUDDY_OFFSET = [32, -12] as const;
export const MAP_BUDDY_SIZE = 32;
const overlap = (a: BuddyRect, b: BuddyRect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
export function liveBuddyClear(point: readonly number[], stops: readonly (readonly number[])[], viewport: { width: number; height: number }, controls: readonly BuddyRect[]) {
  if (point.length < 2 || !point.every(Number.isFinite) || stops.some(stop => stop.length < 2 || !stop.every(Number.isFinite))) return false;
  const body = { x: point[0] + LIVE_BUDDY_OFFSET[0] - MAP_BUDDY_SIZE / 2, y: point[1] + LIVE_BUDDY_OFFSET[1] - MAP_BUDDY_SIZE, width: MAP_BUDDY_SIZE, height: MAP_BUDDY_SIZE };
  if (body.x < 8 || body.y < 8 || body.x + body.width > viewport.width - 8 || body.y + body.height > viewport.height - 8) return false;
  return !controls.some(rect => overlap(body, rect)) && !stops.some(([x, y]) => overlap(body, { x: x - 24, y: y - 24, width: 48, height: 48 }));
}
