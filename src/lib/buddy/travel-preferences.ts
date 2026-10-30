export const TRAVEL_INTERESTS = ['Nature', 'Food', 'Culture'] as const;
export const TRAVEL_PACES = ['Relaxed', 'Packed'] as const;
export type TravelInterest = typeof TRAVEL_INTERESTS[number];
export type TravelPace = typeof TRAVEL_PACES[number];
export type TravelPreferences = Readonly<{ interests: readonly TravelInterest[]; pace: TravelPace | null }>;
export const neutralTravelPreferences: TravelPreferences = Object.freeze({ interests: [], pace: null });
export const validPreferenceOwner = (owner: unknown): owner is string => typeof owner === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner);
export const travelPreferenceKey = (owner: string) => 'journey-travel-preferences:v1:' + owner;
export function validTravelPreferences(value: unknown): value is TravelPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as Record<string, unknown>;
  return Object.keys(p).length === 2 && Array.isArray(p.interests) && p.interests.length <= 3
    && new Set(p.interests).size === p.interests.length && p.interests.every(v => TRAVEL_INTERESTS.includes(v))
    && (p.pace === null || TRAVEL_PACES.includes(p.pace as TravelPace));
}
export function parseTravelPreferences(raw: string | null, owner: string): TravelPreferences {
  if (!raw || raw.length > 1024 || !validPreferenceOwner(owner)) return neutralTravelPreferences;
  try {
    const row = JSON.parse(raw);
    if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).length !== 4 || row.version !== 1 || row.userId !== owner) return neutralTravelPreferences;
    const preferences = { interests: row.interests, pace: row.pace };
    return validTravelPreferences(preferences) ? { interests: [...preferences.interests], pace: preferences.pace } : neutralTravelPreferences;
  } catch { return neutralTravelPreferences; }
}
export type TravelPreferenceStorage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown>; removeItem(key: string): Promise<unknown> };
export type TravelPreferenceState = Readonly<{ owner: string | null; loaded: boolean; busy: boolean; value: TravelPreferences; error: string | null; message: string | null }>;
export const emptyTravelPreferenceState: TravelPreferenceState = { owner: null, loaded: false, busy: false, value: neutralTravelPreferences, error: null, message: null };
export function createTravelPreferences(storage: TravelPreferenceStorage) {
  let state = emptyTravelPreferenceState, generation = 0, operation = 0, queue = Promise.resolve();
  const persisted = new Map<string, TravelPreferences>();
  const listeners = new Set<() => void>();
  const publish = (next: TravelPreferenceState) => { state = next; listeners.forEach(fn => fn()); };
  const ordered = (work: () => Promise<void>) => { queue = queue.then(work, work); return queue; };
  function select(owner: string | null, reload = false) {
    owner = validPreferenceOwner(owner) ? owner : null;
    if (!reload && state.owner === owner) return queue;
    const currentOwner = owner, epoch = ++generation;
    publish({ ...emptyTravelPreferenceState, owner });
    if (!owner) return queue;
    return ordered(async () => {
      try {
        const value = parseTravelPreferences(await storage.getItem(travelPreferenceKey(currentOwner!)), currentOwner!);
        persisted.set(currentOwner!, value);
        if (epoch === generation) publish({ ...state, loaded: true, value, error: null });
      } catch { if (epoch === generation) publish({ ...state, loaded: false, error: 'Could not load preferences on this phone. Retry before editing.' }); }
    });
  }
  function write(owner: string, value: TravelPreferences | null) {
    if (!validPreferenceOwner(owner) || state.owner !== owner || !state.loaded || (value !== null && !validTravelPreferences(value))) return Promise.resolve(false);
    const epoch = generation, serial = ++operation;
    const captured = value === null ? null : { interests: [...value.interests], pace: value.pace };
    publish({ ...state, busy: true, error: null, message: null });
    let success = false;
    const task = ordered(async () => {
      try {
        if (captured === null) await storage.removeItem(travelPreferenceKey(owner));
        else await storage.setItem(travelPreferenceKey(owner), JSON.stringify({ version: 1, userId: owner, ...captured }));
        persisted.set(owner, captured ?? neutralTravelPreferences);
        success = true;
        if (epoch === generation && serial === operation) publish({ ...state, busy: false, value: captured ?? neutralTravelPreferences, message: captured === null ? 'Preferences forgotten on this phone.' : 'Preferences saved on this phone.' });
      } catch {
        if (epoch === generation && serial === operation) publish({ ...state, busy: false, value: persisted.get(owner) ?? state.value, error: captured === null ? 'Could not forget preferences. Try again.' : 'Could not save preferences. Try again.' });
      }
    });
    return task.then(() => success && epoch === generation && state.owner === owner);
  }
  return { get: () => state, subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }, select,
    save: (owner: string, value: TravelPreferences) => write(owner, value), forget: (owner: string) => write(owner, null),
    retry: (owner: string) => state.owner === owner ? select(owner, true) : Promise.resolve() };
}
export function travelPreferenceTip(path: string, preferences: TravelPreferences): string | undefined {
  if (!['/', '/index', '/discover', '/search'].includes(path)) return undefined;
  const parts: string[] = [];
  if (preferences.interests.length) parts.push('You chose ' + preferences.interests.join(', ') + '. Try a matching place or topic in Search.');
  if (preferences.pace === 'Relaxed') parts.push('For your relaxed preference, consider fewer stops and room for breaks.');
  if (preferences.pace === 'Packed') parts.push('For your packed preference, review distances and opening times before choosing more stops.');
  return parts.length ? parts.join(' ') + ' These are tips only; search results and routes are unchanged.' : undefined;
}
