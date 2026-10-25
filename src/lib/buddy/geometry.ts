import { BUDDY_SIZE, clampBuddy, type BuddyPoint, type BuddyRect } from './model';
export const BUDDY_CONTROL_GAP = 8;
export type BuddyGeometry = Readonly<{ bounds: BuddyRect; obstacles: readonly BuddyRect[]; areas: readonly BuddyRect[] }>;
const overlaps = (a: BuddyRect, b: BuddyRect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
export function buddyOverlayClear(rect: BuddyRect, geometry: BuddyGeometry) {
  const { bounds } = geometry;
  return rect.x >= bounds.x && rect.y >= bounds.y && rect.x + rect.width <= bounds.x + bounds.width && rect.y + rect.height <= bounds.y + bounds.height && !geometry.obstacles.some(obstacle => overlaps(rect, obstacle));
}
export function buddyPositionClear(point: BuddyPoint, geometry: BuddyGeometry) {
  const { bounds, obstacles } = geometry;
  return Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= bounds.x && point.y >= bounds.y
    && point.x + BUDDY_SIZE <= bounds.x + bounds.width && point.y + BUDDY_SIZE <= bounds.y + bounds.height
    && !obstacles.some(rect => overlaps({ ...point, width: BUDDY_SIZE, height: BUDDY_SIZE }, rect));
}
// Decompose the top-left configuration space, rather than reserving any page space.
export function createBuddyGeometry(host: BuddyRect, insets: { top: number; bottom: number; left: number; right: number }, protectedRects: readonly BuddyRect[]): BuddyGeometry {
  const bounds = { x: Math.max(0, insets.left) + 4, y: Math.max(0, insets.top) + 4,
    width: host.width - Math.max(0, insets.left) - Math.max(0, insets.right) - 8,
    height: host.height - Math.max(0, insets.top) - Math.max(0, insets.bottom) - 8 };
  const obstacles = protectedRects.filter(r => [r.x, r.y, r.width, r.height].every(Number.isFinite) && r.width > 0 && r.height > 0).map(rect => ({
    x: rect.x - host.x - BUDDY_CONTROL_GAP, y: rect.y - host.y - BUDDY_CONTROL_GAP,
    width: rect.width + BUDDY_CONTROL_GAP * 2, height: rect.height + BUDDY_CONTROL_GAP * 2,
  })).filter(rect => overlaps(rect, bounds));
  const geometry: { bounds: BuddyRect; obstacles: BuddyRect[]; areas: BuddyRect[] } = { bounds, obstacles, areas: [] };
  if (bounds.width < BUDDY_SIZE || bounds.height < BUDDY_SIZE) return geometry;
  const maxX = bounds.x + bounds.width - BUDDY_SIZE, maxY = bounds.y + bounds.height - BUDDY_SIZE;
  const forbidden = obstacles.map(r => ({ x: r.x - BUDDY_SIZE, y: r.y - BUDDY_SIZE, right: r.x + r.width, bottom: r.y + r.height }));
  const cuts = [...new Set([bounds.x, maxX, ...forbidden.flatMap(r => [Math.max(bounds.x, Math.min(maxX, r.x)), Math.max(bounds.x, Math.min(maxX, r.right))])])].sort((a, b) => a - b);
  const strips = cuts.flatMap((x, i) => [[x, x], ...(i + 1 < cuts.length ? [[x, cuts[i + 1]]] : [])]);
  for (const [left, right] of strips) {
    const middle = (left + right) / 2;
    const intervals = forbidden.filter(r => middle > r.x && middle < r.right).map(r => [Math.max(bounds.y, r.y), Math.min(maxY, r.bottom)]).filter(([a, b]) => b >= a).sort((a, b) => a[0] - b[0]);
    let cursor = bounds.y;
    const add = (top: number, bottom: number) => {
      if (bottom < top) return;
      const area = { x: left, y: top, width: right - left + BUDDY_SIZE, height: bottom - top + BUDDY_SIZE };
      if (buddyPositionClear({ x: middle, y: (top + bottom) / 2 }, geometry)) geometry.areas.push(area);
    };
    for (const [top, bottom] of intervals) { add(cursor, top); cursor = Math.max(cursor, bottom); }
    add(cursor, maxY);
  }
  return geometry;
}
export function nearestBuddyPosition(point: BuddyPoint, geometry: BuddyGeometry): BuddyPoint | null {
  let best: BuddyPoint | null = null, distance = Infinity;
  for (const area of geometry.areas) {
    const candidate = clampBuddy(point, area), next = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    if (next < distance && buddyPositionClear(candidate, geometry)) { best = candidate; distance = next; }
  }
  return best;
}
export function buddyPathClear(start: BuddyPoint, end: BuddyPoint, geometry: BuddyGeometry) {
  if (!buddyPositionClear(start, geometry) || !buddyPositionClear(end, geometry)) return false;
  const sweep = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x) + BUDDY_SIZE, height: Math.abs(end.y - start.y) + BUDDY_SIZE };
  return !geometry.obstacles.some(rect => overlaps(sweep, rect));
}
export function floatingWalkTarget(point: BuddyPoint, geometry: BuddyGeometry, random = Math.random): BuddyPoint {
  const sign = random() < 0.5 ? -1 : 1;
  for (const [dx, dy] of [[sign * 96, 0], [-sign * 96, 0], [0, sign * 64], [0, -sign * 64]]) {
    const candidate = nearestBuddyPosition({ x: point.x + dx, y: point.y + dy }, geometry);
    if (candidate && Math.hypot(candidate.x - point.x, candidate.y - point.y) >= 16 && Math.hypot(candidate.x - point.x, candidate.y - point.y) <= 96 && buddyPathClear(point, candidate, geometry)) return candidate;
  }
  return point;
}
