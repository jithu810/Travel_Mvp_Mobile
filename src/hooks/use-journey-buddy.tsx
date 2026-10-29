import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useFocusEffect, usePathname } from 'expo-router';
import { AppState, Keyboard, View, type GestureResponderEvent } from 'react-native';
import { createBuddyPreference } from '@/lib/buddy/preference';
import { createBuddyStore } from '@/lib/buddy/store';
import type { BuddyAction, BuddyCelebrationName, BuddyScreen } from '@/lib/buddy/model';

function createApi() { return { store: createBuddyStore(), preference: createBuddyPreference(AsyncStorage) }; }
type BuddyApi = ReturnType<typeof createApi>;
const BuddyContext = createContext<BuddyApi | null>(null);
export function JourneyBuddyProvider({ children }: { children: ReactNode }) {
  const [api] = useState(createApi);
  useEffect(() => {
    const stop = api.preference.subscribe(() => { if (api.preference.get().enabled) api.store.requestMeasurements(); else { api.store.clearCelebration(); api.store.closeMapHelp(); } });
    void api.preference.load(); return stop;
  }, [api]);
  return <BuddyContext.Provider value={api}>{children}</BuddyContext.Provider>;
}
export function useBuddyApi() { return useContext(BuddyContext); }
// Success sites supply an operation identity, never a Save/Begin button intent.
export function useBuddyCelebration() {
  const api = useBuddyApi(), path = usePathname();
  return useCallback((animation: BuddyCelebrationName, operation: object) => {
    if (!api?.preference.get().enabled || AppState.currentState !== 'active') return false;
    return api.store.celebrate(path, animation, operation);
  }, [api, path]);
}
const absent = { loaded: false, enabled: false, chosen: true, error: null };
const noopSubscribe = () => () => {};
const absentPreference = () => absent;
export function useBuddyPreference() {
  const api = useBuddyApi();
  const value = useSyncExternalStore(api?.preference.subscribe ?? noopSubscribe, api?.preference.get ?? absentPreference, absentPreference);
  return { ...value, setEnabled: (enabled: boolean) => { void api?.preference.setEnabled(enabled); } };
}
// First use only: offered once while no on/off choice is stored. Guide me turns Buddy on and opens
// the existing three-step tour (the actor opens help when it mounts with a tour step set).
export function useBuddyIntro() {
  const api = useBuddyApi();
  const value = useSyncExternalStore(api?.preference.subscribe ?? noopSubscribe, api?.preference.get ?? absentPreference, absentPreference);
  return {
    visible: !!api && value.loaded && !value.chosen,
    guide: () => { if (!api) return; api.store.setTour(0); void api.preference.setEnabled(true); },
    skip: () => { void api?.preference.setEnabled(false); },
  };
}
// Registration never subscribes to animation state. Latest callbacks are committed before publication.
export function useBuddyScreen(state: BuddyScreen, actions?: { addMemory?: () => void }) {
  const api = useBuddyApi(), path = usePathname(), token = useRef({});
  const latest = useRef({ state, actions }), focused = useRef(false);
  useEffect(() => {
    latest.current = { state, actions };
    if (focused.current) api?.store.screen(token.current, { path, state, act: action => { if (action === 'addMemory') latest.current.actions?.addMemory?.(); } });
  });
  useFocusEffect(useCallback(() => {
    focused.current = true;
    const owner = token.current;
    api?.store.screen(owner, { path, state: latest.current.state, act: action => { if (action === 'addMemory') latest.current.actions?.addMemory?.(); } });
    return () => { focused.current = false; api?.store.removeScreen(owner); };
  }, [api, path]));
}
export function useBuddySuppression(blocked: boolean) {
  const api = useBuddyApi(), path = usePathname(), token = useRef({});
  useEffect(() => {
    const owner = token.current;
    api?.store.block(owner, path, blocked);
    return () => api?.store.block(owner, path, false);
  }, [api, path, blocked]);
}

export function BuddyTouchBoundary({ children }: { children: ReactNode }) {
  const api = useBuddyApi(), path = usePathname(), cooldown = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const cancelInteraction = () => { if (cooldown.current) clearTimeout(cooldown.current); cooldown.current = null; api?.store.interaction(false); };
    api?.store.environment(path, AppState.currentState === 'active');
    const state = AppState.addEventListener('change', value => {
      cancelInteraction();
      api?.store.environment(path, value === 'active');
    });
    const stopWhenDisabled = api?.preference.subscribe(() => { if (!api.preference.get().enabled) cancelInteraction(); });
    const keyboard = {}, show = Keyboard.addListener('keyboardDidShow', () => api?.store.block(keyboard, path, true));
    const hide = Keyboard.addListener('keyboardDidHide', () => api?.store.block(keyboard, path, false));
    if (Keyboard.isVisible?.()) api?.store.block(keyboard, path, true);
    return () => {
      if (cooldown.current) clearTimeout(cooldown.current);
      stopWhenDisabled?.();
      state.remove(); show.remove(); hide.remove(); api?.store.block(keyboard, path, false);
    };
  }, [api, path]);
  const start = () => { if (cooldown.current) clearTimeout(cooldown.current); if (api?.preference.get().enabled && AppState.currentState === 'active') api.store.interaction(true); };
  const end = (event?: GestureResponderEvent) => {
    if (cooldown.current) clearTimeout(cooldown.current);
    if (!api?.preference.get().enabled || AppState.currentState !== 'active') { cooldown.current = null; api?.store.interaction(false); return; }
    if (event?.nativeEvent.touches.length) { cooldown.current = null; api.store.interaction(true); return; }
    api.store.touchEnded();
    cooldown.current = setTimeout(() => { cooldown.current = null; api.store.interaction(false); }, 3000);
  };
  return <View style={{ flex: 1 }} onTouchStart={start} onTouchEnd={end} onTouchCancel={end}>{children}</View>;
}
export type { BuddyAction };
