export type BuddyContextLine = Readonly<{ text: string; animation: 'wave' | 'curious' }>;
export const BUDDY_CONTEXT_DELAY = 8000;
export const BUDDY_CONTEXT_DURATION = 5000;
const explore = { text: 'A new story could be one journey away. Browse a few to start.', animation: 'wave' } as const;
const lines: Readonly<Record<string, BuddyContextLine>> = {
  '/discover': explore,
  '/search': { text: 'Somewhere in mind? Search for a place or a journey to explore.', animation: 'curious' },
  '/create': { text: 'A place, a photo, a little story. Your next chapter starts here.', animation: 'curious' },
  '/account': { text: 'Your stories, all together. Revisit a journey or keep working on a draft.', animation: 'curious' },
};
const routeKey = (path: string) => ['/', '/index'].includes(path) ? '/discover' : path;
export function buddyContextLine(path: string): BuddyContextLine | undefined { return lines[routeKey(path)]; }
// Installed-greeting memory key: Home's two routes share one greeting.
export const buddyGreetingKey = (path: string) => routeKey(path);
// Process-local only. Store identity makes the once-per-route limit survive actor
// remounts and navigation while allowing a fresh app session to greet again.
const spoken = new WeakMap<object, Set<string>>();
export function claimBuddyContext(store: { reactOnce: (key: string) => boolean }, path: string) {
  const route = routeKey(path);
  if (!buddyContextLine(route) || spoken.get(store)?.has(route) || !store.reactOnce('context:' + route)) return false;
  const routes = spoken.get(store) ?? new Set<string>(); routes.add(route); spoken.set(store, routes); return true;
}
