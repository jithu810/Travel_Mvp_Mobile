// Task-specific help for the manual Buddy bubble. Navigation only: Buddy never saves, copies or
// starts GPS from here, and each action leads somewhere other than the current screen.
export type BuddyHelpRoute = '/search' | '/create';
// reason: one line saying why the action fits, using only what the app knows for certain.
export type BuddyHelpPrimary = Readonly<{ label: string; route: BuddyHelpRoute; reason: string }>;

const home = (path: string) => ['/', '/index', '/discover'].includes(path);

// null keeps the bubble's existing default (Capture a moment / Open my drafts).
export function buddyHelpPrimary(path: string): BuddyHelpPrimary | null {
  if (home(path)) return { label: 'Find a journey', route: '/search', reason: 'Search looks through the latest public journeys by place, stop or creator.' };
  if (path === '/search') return { label: 'Start my own journey', route: '/create', reason: 'Turn your places and photos into a private draft. Nothing is public until you publish.' };
  // Neutral on purpose: Account cannot always tell no drafts apart from a failed drafts load.
  if (path === '/account') return { label: 'Start a new journey', route: '/create', reason: 'Start a journey. It stays private until you publish.' };
  return null;
}

// Offered only for a draft from a successful load, so saying it is saved is accurate.
export function buddyResumeReason(title: string): string {
  const name = title.trim();
  return (name ? 'Your draft “' + name + '”' : 'Your draft') + ' is saved privately. Pick up where you left off.';
}
// Lines for routes without a contextual greeting; they describe what each Story control does.
export function buddyHelpLine(path: string): string | undefined {
  if (/^\/journey\/[^/]+$/.test(path)) return 'Swipe to start uses every stop. Make it yours lets you pick stops for this trip or save an editable copy.';
  if (/^\/customized\/[^/]+$/.test(path)) return 'These are the stops you picked for this trip. Nothing is saved; swipe when you’re ready to go.';
  return undefined;
}

// Describes the loaded Saved collection, never unfinished trip progress.
export function buddySavedReason(title: string): string {
  const name = title.trim();
  return (name ? 'Your saved journey "' + name + '" is ready to revisit.' : 'Your saved journey is ready to revisit.') + ' Open its story to plan your next steps.';
}
