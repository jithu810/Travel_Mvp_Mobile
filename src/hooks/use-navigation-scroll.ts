import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AccessibilityInfo, Animated, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { initialNavigationScroll, nextNavigationScroll } from '@/lib/navigation-scroll';

export const NavigationCompactContext = createContext(false);
export const NavigationControlContext = createContext<(compact: boolean) => void>(() => {});
export function useNavigationCompact() { return useContext(NavigationCompactContext); }
export function useNavigationScroll(enabled = false, resetKey = '', initialCompact = false) {
  const setCompact = useContext(NavigationControlContext);
  const state = useRef(initialNavigationScroll()), focused = useRef(false);
  useFocusEffect(useCallback(() => {
    void resetKey; // A collection change starts a fresh direction history.
    if (!enabled) return;
    focused.current = true; state.current = { ...initialNavigationScroll(), compact: initialCompact }; setCompact(initialCompact);
    return () => { focused.current = false; };
  }, [enabled, resetKey, initialCompact, setCompact]));
  return useCallback((event?: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!enabled || !focused.current || !event) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const previous = state.current;
    state.current = nextNavigationScroll(previous, contentOffset.y, Math.max(0, contentSize.height - layoutMeasurement.height));
    if (previous.compact !== state.current.compact) setCompact(state.current.compact);
  }, [enabled, setCompact]);
}
// Layout dimensions animate without scaling touch targets; a reduced-motion setting takes effect immediately.
export function useNavigationAnimation() {
  const compact = useNavigationCompact();
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    progress.stopAnimation();
    if (reduceMotion) { progress.setValue(compact ? 1 : 0); return; }
    const animation = Animated.timing(progress, { toValue: compact ? 1 : 0, duration: 180, useNativeDriver: false, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [compact, reduceMotion, progress]);
  return { compact, progress };
}
