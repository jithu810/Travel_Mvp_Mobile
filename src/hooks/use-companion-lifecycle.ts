import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

export function useCompanionLifecycle() {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [reduceMotion, setReduceMotion] = useState(true);
  const stops = useRef(new Set<() => void>());
  const stopAll = useCallback(() => { stops.current.forEach(stop => stop()); stops.current.clear(); }, []);
  const registerStop = useCallback((stop: () => void) => {
    stops.current.add(stop);
    return () => { stop(); stops.current.delete(stop); };
  }, []);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => { stopAll(); setFocused(false); };
  }, [stopAll]));
  useEffect(() => {
    let mounted = true;
    const app = AppState.addEventListener('change', state => {
      if (state !== 'active') stopAll();
      setActive(state === 'active');
    });
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; stopAll(); app.remove(); motion.remove(); };
  }, [stopAll]);
  return { focused, active, reduceMotion, registerStop, stopAll };
}
