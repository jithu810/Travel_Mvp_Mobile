import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { companionEnabled } from '@/lib/companion/model';
import { createCompanionPreferenceStore } from '@/lib/companion/preference';

const store = createCompanionPreferenceStore(AsyncStorage);
type Status = 'loading' | 'ready' | 'saving' | 'load-error' | 'save-error';
type Choice = { enabled: boolean; status: Status };
export function useCompanionPreference() {
  const [available] = useState(() => {
    try { return Platform.OS === 'android' && !!requireOptionalNativeModule('ExpoGL'); } catch { return false; }
  });
  const [choice, setChoice] = useState<Choice>({ enabled: false, status: 'loading' });
  const mounted = useRef(false);
  const revision = useRef(0);
  const stop = useRef<(() => void) | null>(null);
  const registerDisable = useCallback((callback: (() => void) | null) => { stop.current = callback; }, []);
  useEffect(() => {
    mounted.current = true;
    revision.current++; // Invalidate writes from a prior effect setup (including Strict Mode replay).
    let settled = false;
    const finish = (enabled: boolean, status: Status) => {
      if (!mounted.current || settled) return;
      settled = true;
      clearTimeout(timer);
      setChoice({ enabled, status });
    };
    const timer = setTimeout(() => finish(false, 'load-error'), 2000);
    if (!available) finish(false, 'ready');
    else {
      // The former runtime gate supplies only the default for a missing saved choice.
      store.load(companionEnabled(process.env.EXPO_PUBLIC_TRAVEL_COMPANION))
        .then(enabled => finish(enabled, 'ready'), () => finish(false, 'load-error'));
    }
    return () => { mounted.current = false; settled = true; clearTimeout(timer); stop.current?.(); stop.current = null; };
  }, [available]);
  const setEnabled = useCallback((enabled: boolean) => {
    if (!mounted.current || !available || choice.status === 'loading') return;
    if (!enabled) stop.current?.(); // Cancel frames synchronously, before React unmounts the scene.
    const request = ++revision.current;
    setChoice({ enabled, status: 'saving' });
    store.save(enabled).then(() => {
      if (mounted.current && request === revision.current) setChoice({ enabled, status: 'ready' });
    }, () => {
      if (mounted.current && request === revision.current) setChoice({ enabled, status: 'save-error' });
    });
  }, [available, choice.status]);
  return { ...choice, available, setEnabled, registerDisable };
}
