export const COMPANION_PREFERENCE_KEY = 'journey-creator:travel-companion:v1';
type Storage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };
/** Device-local choice; isolated from authentication/storage buckets. Serialize writes
 * across Home mounts, and wait for pending writes before restoring a later mount. */
export function createCompanionPreferenceStore(storage: Storage) {
  let writes = Promise.resolve();
  return {
    async load(defaultEnabled: boolean) {
      await writes.catch(() => {});
      const value = await storage.getItem(COMPANION_PREFERENCE_KEY);
      return value === null ? defaultEnabled : value === 'on';
    },
    save(enabled: boolean) {
      writes = writes.catch(() => {}).then(() => storage.setItem(COMPANION_PREFERENCE_KEY, enabled ? 'on' : 'off'));
      return writes;
    },
  };
}
