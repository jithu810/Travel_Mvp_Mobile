import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname, useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { useBuddyApi, useBuddyPreference } from './use-journey-buddy';

const subscribe = () => () => {};
const empty = { revision: 0 };
const getEmpty = () => empty;
// Ownership describes artwork actually present on a ready map, never a preference.
export function useMapBuddy(available: boolean, quietLive = false) {
  const api = useBuddyApi(), preference = useBuddyPreference(), path = usePathname(), token = useRef({});
  const [focused, setFocused] = useState(false);
  useSyncExternalStore(api?.store.subscribe ?? subscribe, api?.store.get ?? getEmpty, getEmpty);
  const current = api?.store.current();
  const enabled = preference.loaded && preference.enabled;
  const visible = !!(available && enabled && focused && api && api.store.get().path === path && !current?.suppressed
    && AppState.currentState === 'active' && (!api.store.getMapHelp() || !!api.store.getMapHelp()?.anchor) && !api.store.getCelebration() && api.store.getTour() === null
    && (quietLive || !current?.state?.travel?.guidance) && !current?.state?.travel?.arrival);
  useEffect(() => {
    const owner = token.current; api?.store.mapPresentation(owner, path, visible);
    return () => api?.store.mapPresentation(owner, path, false);
  }, [api, path, visible]);
  useFocusEffect(useCallback(() => {
    const owner = token.current; setFocused(true);
    return () => { setFocused(false); api?.store.mapPresentation(owner, path, false); };
  }, [api, path]));
  const openHelp = useCallback((anchor?: { x: number; y: number }) => {
    if (!api?.preference.get().enabled || AppState.currentState !== 'active') return false;
    return api.store.openMapHelp(path, anchor);
  }, [api, path]);
  // owned: some map artwork on this route currently hides the floating Buddy.
  return { helping: !!api?.store.getMapHelp(), enabled, owned: !!current?.mapOwned, visible: visible && !!current?.mapOwned, canHelp: enabled && !current?.suppressed && !current?.state?.travel?.guidance && !current?.state?.travel?.arrival, openHelp };
}
