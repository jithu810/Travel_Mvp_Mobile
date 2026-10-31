export const BUDDY_PREFERENCE_KEY = 'journey-buddy:v1:enabled';
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> };
// chosen: a stored on/off choice exists (or was just made). A fresh install has none, which is
// when the first-use introduction offers Buddy. A failed read counts as chosen so it never nags.
export type BuddyPreference = Readonly<{ loaded: boolean; enabled: boolean; chosen: boolean; error: string | null }>;
export function createBuddyPreference(storage: Storage) {
  let state: BuddyPreference = { loaded: false, enabled: false, chosen: false, error: null }, revision = 0;
  let loaded: Promise<void> | null = null, queue = Promise.resolve();
  const listeners = new Set<() => void>();
  const publish = (next: BuddyPreference) => { state = next; listeners.forEach(fn => fn()); };
  return {
    get: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    load() {
      if (loaded) return loaded;
      const version = revision;
      loaded = Promise.resolve().then(() => storage.getItem(BUDDY_PREFERENCE_KEY)).then(value => {
        if (version === revision) publish({ loaded: true, enabled: value === 'true', chosen: value !== null, error: null });
      }, () => { if (version === revision) publish({ loaded: true, enabled: false, chosen: true, error: 'Couldn’t load Journey Buddy. Try the switch again.' }); });
      return loaded;
    },
    setEnabled(enabled: boolean) {
      const version = ++revision;
      publish({ loaded: true, enabled, chosen: true, error: null });
      queue = queue.then(async () => {
        try { await storage.setItem(BUDDY_PREFERENCE_KEY, String(enabled)); }
        catch {
          if (version === revision) publish({ loaded: true, enabled: false, chosen: true, error: 'Couldn’t save Journey Buddy settings. Buddy is off. Try again.' });
        }
      });
      return queue;
    },
  };
}
