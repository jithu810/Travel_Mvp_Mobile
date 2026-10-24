import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, AppState, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { GestureResponderHandlers } from 'react-native';
import type { StopInput } from '@/lib/create/model';
import { theme } from '@/theme/mobile-theme';

export type MemorySwipe = { handlers: GestureResponderHandlers; canInteract: () => boolean };
// Browsing changes selection only; MemoryRow owns the separate edit/reorder/remove controls.
export function MemoryDeck({ stops, selectedId, onSelect, renderMemory, actions, active = true, title, status, leading, emptyContent }: {
  stops: StopInput[]; selectedId: string | null; onSelect: (id: string) => void;
  renderMemory: (stop: StopInput, index: number, width: number, swipe?: MemorySwipe) => ReactNode; actions: ReactNode; active?: boolean; title?: string; status?: string; leading?: ReactNode; emptyContent?: ReactNode;
}) {
  const [width, setWidth] = useState(320);
  const [reduced, setReduced] = useState(true);
  const [x] = useState(() => new Animated.Value(0));
  const selected = Math.max(0, stops.findIndex(stop => stop.id === selectedId));
  const current = useRef({ stops, selected, onSelect, active, width, reduced });
  const busy = useRef(false);
  const generation = useRef(0);
  const foreground = useRef(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const cancel = useCallback(() => { generation.current++; busy.current = false; x.stopAnimation(); x.setValue(0); }, [x]);
  useEffect(() => {
    current.current = { stops, selected, onSelect, active, width, reduced };
    cancel();
  }, [stops, selected, onSelect, active, width, reduced, selectedId, cancel]);
  useEffect(() => {
    let mounted = true, changed = false;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted && !changed) setReduced(value); }).catch(() => {});
    const lifecycle = AppState.addEventListener('change', state => { foreground.current = state === 'active'; if (!foreground.current) cancel(); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; if (mounted) setReduced(value); });
    return () => { mounted = false; cancel(); lifecycle.remove(); subscription.remove(); };
  }, [cancel]);
  const canInteract = useCallback(() => current.current.active && foreground.current && !busy.current, []);
  const browse = useCallback((direction: -1 | 1) => {
    const state = current.current, target = state.stops[state.selected + direction];
    if (!canInteract()) return;
    if (!target) { cancel(); return; }
    if (state.reduced) { cancel(); state.onSelect(target.id); return; }
    busy.current = true;
    const token = ++generation.current;
    Animated.timing(x, { toValue: -direction * (state.width + 60), duration: 210, useNativeDriver: true }).start(({ finished }) => {
      if (token !== generation.current) return;
      busy.current = false; x.setValue(0);
      if (finished && current.current.active && foreground.current) state.onSelect(target.id);
    });
  }, [canInteract, cancel, x]);
  const shouldSwipe = useCallback((_: unknown, gesture: { dx: number; dy: number }) => canInteract() && Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5, [canInteract]);
  // Creation registers callbacks; refs are read only when a gesture runs.
  // eslint-disable-next-line react-hooks/refs
  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: shouldSwipe,
    onPanResponderMove: (_, gesture) => { if (canInteract() && !current.current.reduced) x.setValue(Math.max(-current.current.width, Math.min(current.current.width, gesture.dx))); },
    onPanResponderRelease: (_, gesture) => {
      if (busy.current) return;
      if (Math.abs(gesture.dx) >= 50 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5) browse(gesture.dx < 0 ? 1 : -1);
      else cancel();
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: cancel,
  }), [browse, canInteract, cancel, shouldSwipe, x]);
  const memory = stops[selected];
  const behind = stops.slice(selected + 1, selected + 3).reverse();
  // Renderer forwards canInteract into MemoryRow event handlers without calling it.
  // eslint-disable-next-line react-hooks/refs
  const card = memory ? renderMemory(memory, selected, width, { handlers: swipe.panHandlers, canInteract }) : null;
  return <View testID="draft-memory-deck" onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View style={s.header}>{leading}<View style={s.heading}>{title && <Text accessibilityRole="header" numberOfLines={1} style={s.headingTitle}>{title}</Text>}<Text numberOfLines={1} style={s.progress} accessibilityLiveRegion="polite">{stops.length ? 'Memory ' + (selected + 1) + ' of ' + stops.length : 'Memories · 0/50'}{status ? ' · ' + status : ''}</Text></View>
      {stops.length > 0 && <View style={s.controls}><Pressable accessibilityRole="button" accessibilityLabel="Previous memory card" disabled={!active || selected === 0} accessibilityState={{ disabled: !active || selected === 0 }} onPress={() => browse(-1)} style={s.arrow}><Text style={s.arrowText}>←</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Next memory card" disabled={!active || selected >= stops.length - 1} accessibilityState={{ disabled: !active || selected >= stops.length - 1 }} onPress={() => browse(1)} style={s.arrow}><Text style={s.arrowText}>→</Text></Pressable></View>}
    </View>
    {memory ? <View style={s.stack}>
      {behind.map((stop, index) => <View key={stop.id} testID="draft-memory-rear" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.rear, { top: (behind.length - index - 1) * 8, left: (behind.length - index) * 8, right: (behind.length - index) * 8, height: width * 9 / 16, transform: [{ rotate: index ? '-2deg' : '2deg' }] }]}>
        {renderMemory(stop, stops.indexOf(stop), width, { handlers: {}, canInteract: () => false })}
      </View>)}
      <Animated.View testID="draft-memory-active" style={{ transform: [{ translateX: x }, { rotate: x.interpolate({ inputRange: [-400, 0, 400], outputRange: ['-8deg', '0deg', '8deg'], extrapolate: 'clamp' }) }] }}>
        {card}
      </Animated.View>
      <View pointerEvents="box-none" style={s.actions}>{actions}</View>
    </View> : emptyContent || <View style={s.empty}><View style={s.emptyCopy}><Text style={s.title}>Your journey starts here</Text><Text style={s.note}>Add a place or name a moment. It stays private until you publish.</Text></View>{actions}</View>}
  </View>;
}
const s = StyleSheet.create({
  heading: { flex: 1, minWidth: 0 }, headingTitle: { color: theme.text, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, progress: { color: theme.muted, fontSize: 12, lineHeight: 18 }, controls: { flexDirection: 'row' },
  arrow: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, arrowText: { color: theme.accent, fontSize: 18 },
  stack: { paddingTop: 12 }, rear: { position: 'absolute', borderRadius: 22, backgroundColor: theme.lavender, overflow: 'hidden' },
  actions: { position: 'absolute', right: 8, top: 24 }, empty: { minHeight: 160, padding: 16, borderRadius: 22, backgroundColor: theme.surface, flexDirection: 'row', gap: 8, alignItems: 'center' }, emptyCopy: { flex: 1, gap: 8 },
  title: { color: theme.text, fontSize: 18, fontWeight: '700' }, note: { color: theme.muted, fontSize: 12, lineHeight: 18 },
});
