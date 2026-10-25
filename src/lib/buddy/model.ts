export const BUDDY_SIZE = 64;
export type BuddyRect = Readonly<{ x: number; y: number; width: number; height: number }>;
export type BuddyPoint = Readonly<{ x: number; y: number }>;
export type BuddyPose = Readonly<{ point: BuddyPoint; parked: boolean }>;
export type BuddyTravel = Readonly<{
  journeyId: string;
  status: 'ready' | 'active' | 'paused' | 'finished' | 'completed';
  nextStop: string | null;
  gpsAvailable: boolean;
  guidance: string | null;
  arrival: boolean;
  completed: number;
}>;
export type BuddyScreen = Readonly<{ floating?: boolean; geometryMoving?: boolean; suppressed?: boolean; interacting?: boolean; canAddMemory?: boolean; travel?: BuddyTravel }>;
export type BuddyAction = 'addMemory';
export const isBuddyRoute = (path: string) => ['/', '/index', '/discover', '/search', '/create', '/account'].includes(path)
  || /^\/(journey|travel|draft)\/[^/]+$/.test(path) || /^\/profile\/[^/]+$/.test(path) && path !== '/profile/edit';
export function validRect(rect: BuddyRect): boolean {
  return [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width >= BUDDY_SIZE && rect.height >= BUDDY_SIZE;
}
// A corridor is measured empty app space. Keep the entire touch canvas inside it.
export function clampBuddy(point: BuddyPoint, rect: BuddyRect): BuddyPoint {
  return { x: Math.max(rect.x, Math.min(rect.x + rect.width - BUDDY_SIZE, point.x)),
    y: Math.max(rect.y, Math.min(rect.y + rect.height - BUDDY_SIZE, point.y)) };
}
export function clearCorridor(region: BuddyRect, host: BuddyRect, inset: { top: number; bottom: number; left: number; right: number }): BuddyRect | null {
  const x = Math.max(inset.left + 4, region.x - host.x), y = Math.max(inset.top + 4, region.y - host.y);
  const right = Math.min(host.width - inset.right - 4, region.x - host.x + region.width);
  const bottom = Math.min(host.height - inset.bottom - 4, region.y - host.y + region.height);
  const rect = { x, y, width: right - x, height: bottom - y };
  return validRect(rect) ? rect : null;
}
export function buddyDragged(dx: number, dy: number) { return Math.hypot(dx, dy) >= 8; }
export function walkTarget(point: BuddyPoint, rect: BuddyRect, random = Math.random): BuddyPoint {
  const distance = Math.min(96, Math.max(0, rect.width - BUDDY_SIZE));
  const direction = random() < 0.5 ? -1 : 1;
  let target = clampBuddy({ x: point.x + direction * distance, y: point.y }, rect);
  if (Math.abs(target.x - point.x) < 16) target = clampBuddy({ x: point.x - direction * distance, y: point.y }, rect);
  return target;
}
export function buddyTravelCopy(travel: BuddyTravel): string {
  if (travel.status === 'completed') return 'We did it! Every stop has its own little story.';
  if (travel.status === 'finished') return 'Adventure tucked away. Take a little rest!';
  if (travel.status === 'paused') return 'A little breather! Resume your trip when you’re ready.';
  if (travel.status === 'ready') return 'Ready, explorer? Begin Trip when you’re ready for GPS guidance.';
  if (travel.arrival) return 'We might be here! Check the arrival prompt above.';
  if (!travel.gpsAvailable) return 'Waiting for a clearer GPS signal. Your map has the latest status.';
  return travel.nextStop ? 'Next little adventure: ' + travel.nextStop + '. Follow the map’s guidance.' : 'One little step at a time. Follow the map’s guidance.';
}
export function travelEvent(travel: BuddyTravel): string {
  return JSON.stringify([travel.journeyId, travel.status, travel.nextStop, travel.gpsAvailable, travel.arrival, travel.completed]);
}
export function createBuddyReactions(now = Date.now) {
  let event = '', last = -Infinity;
  return {
    reset(travel?: BuddyTravel) { event = travel ? travelEvent(travel) : ''; last = now(); },
    read(travel: BuddyTravel): string | null {
      const next = travelEvent(travel);
      if (next === event) return null;
      event = next;
      // Existing maneuver/arrival UI has priority. Buddy is quiet during active guidance.
      if (travel.arrival || travel.guidance || now() - last < 15000) return null;
      last = now(); return buddyTravelCopy(travel);
    },
  };
}
