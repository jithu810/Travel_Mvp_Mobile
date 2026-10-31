// Remembers which screens already had Buddy's first greeting. Stored only on this device.
// If the saved list cannot be read, no greetings show until a later launch reads it again.
export const BUDDY_GREETINGS_KEY = 'journey-buddy:v1:greeted';
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown>; removeItem(key: string): Promise<unknown> };
export function createBuddyGreetings(storage: Storage) {
  const greeted = new Set<string>();
  let loaded = false, pending: Promise<void> | null = null;
  return {
    isLoaded: () => loaded,
    load() {
      if (pending) return pending;
      pending = Promise.resolve().then(() => storage.getItem(BUDDY_GREETINGS_KEY)).then(value => {
        const routes: unknown = value ? JSON.parse(value) : [];
        if (Array.isArray(routes)) routes.forEach(route => { if (typeof route === 'string') greeted.add(route); });
        loaded = true;
      }, () => { /* stays unloaded: no greeting rather than a repeated one */ });
      return pending;
    },
    has: (route: string) => greeted.has(route),
    mark(route: string) {
      if (greeted.has(route)) return;
      greeted.add(route);
      void Promise.resolve().then(() => storage.setItem(BUDDY_GREETINGS_KEY, JSON.stringify([...greeted]))).catch(() => { /* retried on the next greeting */ });
    },
    reset() {
      greeted.clear();
      void Promise.resolve().then(() => storage.removeItem(BUDDY_GREETINGS_KEY)).catch(() => { /* the next launch reads what is stored */ });
    },
  };
}
