import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useSessionState } from '@/hooks/session-context';
import { travelPreferences } from '@/lib/buddy/travel-preferences-store';
import { emptyTravelPreferenceState, validPreferenceOwner, type TravelPreferences } from '@/lib/buddy/travel-preferences';

export function useTravelPreferences() {
  const auth = useSessionState();
  const candidate = auth.session?.user.id;
  const owner = !auth.loading && !auth.error && validPreferenceOwner(candidate) ? candidate : null;
  const token = useMemo(() => ({ owner }), [owner]);
  const latest = useRef<object | null>(null);
  // Commit the identity guard before native input can run; display masking below is synchronous.
  useLayoutEffect(() => { latest.current = token; return () => { latest.current = null; }; }, [token]);
  useEffect(() => { void travelPreferences.select(owner); }, [owner]);
  const snapshot = useSyncExternalStore(travelPreferences.subscribe, travelPreferences.get, () => emptyTravelPreferenceState);
  const state = owner && snapshot.owner === owner ? snapshot : emptyTravelPreferenceState;
  const current = () => owner !== null && latest.current === token && travelPreferences.get().owner === owner;
  return { ...state, owner, available: owner !== null,
    save: (value: TravelPreferences) => current() ? travelPreferences.save(owner!, value) : Promise.resolve(false),
    forget: () => current() ? travelPreferences.forget(owner!) : Promise.resolve(false),
    retry: () => { if (current()) void travelPreferences.retry(owner!); },
  };
}
