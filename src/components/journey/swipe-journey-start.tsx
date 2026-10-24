import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, AppState, PanResponder, StyleSheet, Text, View } from 'react-native';

type SwipeProps = { active: boolean; label?: string; accessibilityLabel?: string; hint?: string; accessibilityHint?: string; openingLabel?: string; resetKey?: string } & ({ onStart: () => void; onComplete?: never } | { onComplete: () => void; onStart?: never });
// The caller owns the result. Dragging never invokes a write; only completed confirmation does.
export function SwipeAction({ active, onStart, onComplete, label = 'Swipe to start journey', accessibilityLabel = 'Start Journey', hint = 'Begin Trip enables GPS', accessibilityHint = 'Swipe right or double tap to open Travel Mode. Begin Trip enables location tracking.', openingLabel = 'Opening Travel Mode…', resetKey }: SwipeProps) {
  const action = onComplete ?? onStart;
  const [width, setWidth] = useState(280);
  const [opening, setOpening] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [progress] = useState(() => new Animated.Value(0));
  const current = useRef({ active, onStart: action, width, reduced });
  const foreground = useRef(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const busy = useRef(false);
  const epoch = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reset = useCallback(() => {
    epoch.current++; busy.current = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null; progress.stopAnimation(); progress.setValue(0);
  }, [progress]);
  useEffect(() => {
    current.current = { active, onStart: action, width, reduced };
    reset();
    // Synchronize the visible transition with cancellation of the external animation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpening(false);
  }, [active, action, width, reduced, resetKey, reset]);
  useEffect(() => {
    let mounted = true, changed = false;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted && !changed) setReduced(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; if (mounted) setReduced(value); });
    const app = AppState.addEventListener('change', value => {
      foreground.current = value === 'active';
      if (!foreground.current) { reset(); setOpening(false); }
    });
    return () => { mounted = false; motion.remove(); app.remove(); reset(); };
  }, [reset]);
  const complete = useCallback(() => {
    if (busy.current || !current.current.active || !foreground.current) return;
    busy.current = true; setOpening(true);
    const token = ++epoch.current;
    const finish = () => {
      if (token !== epoch.current || !current.current.active || !foreground.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        if (token === epoch.current && current.current.active && foreground.current) current.current.onStart();
      }, current.current.reduced ? 120 : 280);
    };
    if (current.current.reduced) { progress.setValue(1); finish(); }
    else Animated.timing(progress, { toValue: 1, duration: 180, useNativeDriver: false }).start(({ finished }) => { if (finished) finish(); });
  }, [progress]);
  const shouldSwipe = useCallback((_: unknown, gesture: { dx: number; dy: number }) => current.current.active && foreground.current && !busy.current && gesture.dx > 12 && gesture.dx > Math.abs(gesture.dy) * 1.5, []);
  // PanResponder registers callbacks; refs are read when a gesture runs.
  // eslint-disable-next-line react-hooks/refs
  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: shouldSwipe,
    onPanResponderMove: (_, gesture) => { if (!busy.current) progress.setValue(Math.max(0, Math.min(1, gesture.dx / Math.max(1, current.current.width - 56)))); },
    onPanResponderRelease: (_, gesture) => {
      if (busy.current) return;
      if (gesture.dx >= Math.max(72, (current.current.width - 56) * 0.75) && gesture.dx > Math.abs(gesture.dy) * 1.5) complete();
      else { reset(); setOpening(false); }
    },
    onPanResponderTerminationRequest: () => !busy.current,
    onPanResponderTerminate: () => { reset(); setOpening(false); },
  }), [complete, progress, reset, shouldSwipe]);
  return <View style={[s.shell, !active && s.disabled]} testID="journey-swipe-start" onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <Animated.View pointerEvents="none" style={[s.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    <View {...swipe.panHandlers} style={s.track}>
      <Animated.View pointerEvents="none" style={[s.thumb, { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, width - 56)] }) }] }]}><Text style={s.arrow}>→</Text></Animated.View>
      <View accessible accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} accessibilityState={{ disabled: !active || opening, busy: opening }} accessibilityActions={[{ name: 'activate', label: accessibilityLabel }]} onAccessibilityTap={complete} onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'activate') complete(); }} style={s.label}>
        <Text style={s.title}>{opening ? openingLabel : label}</Text>
        <Text style={s.hint}>{hint}</Text>
      </View>
      {opening && <ActivityIndicator pointerEvents="none" color="#6555CF" style={s.loader} />}
    </View>
  </View>;
}
// Compatibility export preserves the existing Travel Mode entry defaults.
export const SwipeJourneyStart = SwipeAction;
const s = StyleSheet.create({
  disabled: { opacity: 0.5 },
  shell: { minHeight: 56, borderRadius: 28, borderWidth: 1, borderColor: '#D6DCEC', overflow: 'hidden', backgroundColor: '#F8F9FD' },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: '#DDE5FC' },
  track: { minHeight: 54, justifyContent: 'center' },
  thumb: { position: 'absolute', left: 4, top: 4, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6555CF', experimental_backgroundImage: 'linear-gradient(110deg, #AA54DB 0%, #246BE0 100%)' },
  arrow: { color: '#FFFFFF', fontSize: 24 }, label: { minHeight: 54, paddingLeft: 56, paddingRight: 44, justifyContent: 'center', alignItems: 'center' },
  title: { color: '#243E68', fontSize: 13, lineHeight: 19, fontWeight: '700' }, hint: { color: '#596778', fontSize: 10, lineHeight: 15 }, loader: { position: 'absolute', right: 15 },
});
