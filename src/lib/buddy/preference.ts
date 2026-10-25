export const BUDDY_PREFERENCE_KEY = 'journey-buddy:v1:enabled';
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> };
export type BuddyPreference = Readonly<{ loaded: boolean; enabled: boolean; error: string | null }>;
export function createBuddyPreference(storage: Storage) {
  let state: BuddyPreference = { loaded: false, enabled: false, error: null }, revision = 0;
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
        if (version === revision) publish({ loaded: true, enabled: value === 'true', error: null });
      }, () => { if (version === revision) publish({ loaded: true, enabled: false, error: 'Couldn’t load Journey Buddy. Try the switch again.' }); });
      return loaded;
    },
    setEnabled(enabled: boolean) {
      const version = ++revision;
      publish({ loaded: true, enabled, error: null });
      queue = queue.then(async () => {
        try { await storage.setItem(BUDDY_PREFERENCE_KEY, String(enabled)); }
        catch {
          if (version === revision) publish({ loaded: true, enabled: false, error: 'Couldn’t save Journey Buddy settings. Buddy is off. Try again.' });
        }
      });
      return queue;
    },
  };
}
