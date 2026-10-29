// Task-specific help for the manual Buddy bubble. Navigation only: Buddy never saves, copies or
// starts GPS from here, and each action leads somewhere other than the current screen.
export type BuddyHelpRoute = '/search' | '/create';
export type BuddyHelpPrimary = Readonly<{ label: string; route: BuddyHelpRoute }>;

const home = (path: string) => ['/', '/index', '/discover'].includes(path);

// null keeps the bubble's existing default (Capture a moment / Open my drafts).
export function buddyHelpPrimary(path: string): BuddyHelpPrimary | null {
  if (home(path)) return { label: 'Find a journey', route: '/search' };
  if (path === '/search') return { label: 'Start my own journey', route: '/create' };
  if (path === '/account') return { label: 'Start a new journey', route: '/create' };
  return null;
}

// Lines for routes without a contextual greeting; they describe what each Story control does.
export function buddyHelpLine(path: string): string | undefined {
  if (/^\/journey\/[^/]+$/.test(path)) return 'Swipe to start uses every stop. Make it yours lets you pick stops for this trip or save an editable copy.';
  if (/^\/customized\/[^/]+$/.test(path)) return 'These are the stops you picked for this trip. Nothing is saved; swipe when you’re ready to go.';
  return undefined;
}
