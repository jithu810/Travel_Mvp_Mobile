import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, AppState, Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { JourneyStop } from '@/types/journey';
import { TravelPhotoPlaceholder } from '@/components/discovery/travel-photo-placeholder';
import { theme } from '@/theme/mobile-theme';

function StopPhoto({ stop }: { stop: JourneyStop }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <View style={s.photo}>{stop.photo && failed !== stop.photo
    ? <Image key={stop.photo} source={{ uri: stop.photo }} accessibilityLabel={stop.name + ' photo'} resizeMode="cover" style={s.image} onError={() => setFailed(stop.photo)} />
    : <TravelPhotoPlaceholder destination={stop.name} label={'No journey photo available. ' + stop.name} />}</View>;
}

export function StopCardDeck({ stops, selectedId, onSelect, onDetails, active = true, photoActions, optionsActions }: { stops: JourneyStop[]; selectedId: string | null; onSelect: (id: string) => void; onDetails: (id: string) => void; active?: boolean; photoActions?: ReactNode; optionsActions?: ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(true);
  const [width, setWidth] = useState(320);
  const [x] = useState(() => new Animated.Value(0));
  const index = Math.max(0, stops.findIndex(stop => stop.id === selectedId));
  const current = useRef({ stops, index, onSelect, width, reduceMotion });
  const busy = useRef(false);
  const generation = useRef(0);
  const foreground = useRef(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const enabled = useRef(active);
  const reset = useCallback(() => { generation.current++; busy.current = false; x.stopAnimation(); x.setValue(0); }, [x]);
  useEffect(() => {
    current.current = { stops, index, onSelect, width, reduceMotion };
    enabled.current = active;
    reset();
  }, [stops, index, onSelect, width, reduceMotion, selectedId, active, reset]);
  useEffect(() => {
    let active = true, changed = false;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active && !changed) setReduceMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; if (active) setReduceMotion(value); });
    const lifecycle = AppState.addEventListener('change', state => { foreground.current = state === 'active'; if (!foreground.current) reset(); });
    return () => { active = false; motion.remove(); lifecycle.remove(); reset(); };
  }, [reset]);
  const move = useCallback((direction: -1 | 1) => {
    const c = current.current, target = c.stops[c.index + direction];
    if (!foreground.current || !enabled.current) { reset(); return; }
    if (busy.current || !target) { reset(); return; }
    if (c.reduceMotion) { reset(); c.onSelect(target.id); return; }
    busy.current = true;
    const token = ++generation.current;
    Animated.timing(x, { toValue: -direction * (c.width + 60), duration: 210, useNativeDriver: true }).start(({ finished }) => {
      if (token !== generation.current) return;
      busy.current = false; x.setValue(0);
      if (finished) c.onSelect(target.id);
    });
  }, [reset, x]);
  const shouldSwipe = useCallback((_: unknown, g: { dx: number; dy: number }) => foreground.current && enabled.current && !busy.current && Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5, []);
  // Creating a responder registers callbacks; refs are read only when a gesture runs.
  // eslint-disable-next-line react-hooks/refs
  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: shouldSwipe,
    onPanResponderMove: (_, g) => { if (!busy.current && !current.current.reduceMotion) x.setValue(Math.max(-current.current.width, Math.min(current.current.width, g.dx))); },
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) >= 50 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5) move(g.dx < 0 ? 1 : -1); else reset(); },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: reset,
  }), [move, reset, shouldSwipe, x]);
  const stop = stops[index];
  if (!stop) return <View style={s.empty}><Text style={s.name}>Places still to come</Text><Text style={s.note}>The creator hasn’t added stops yet.</Text>{photoActions && <View style={s.emptyActions}>{photoActions}</View>}{optionsActions && <View style={s.emptyActions}>{optionsActions}</View>}</View>;
  const behind = stops.slice(index + 1, index + 3).reverse();
  return <View style={s.section} testID="journey-stop-deck" onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View style={s.progress} accessibilityLiveRegion="polite"><Text style={s.note}>Stop {index + 1} of {stops.length}</Text><Text style={s.hint}>{stops.length > 1 ? '← Next · Previous →' : 'Your journey stop'}</Text></View>
    <View style={s.deck}>
      {behind.map((item, i) => <View key={item.id} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.rear, { top: (behind.length - i - 1) * 8, left: (behind.length - i) * 8, right: (behind.length - i) * 8, transform: [{ rotate: (i ? '-2deg' : '2deg') }] }]}><StopPhoto stop={item} /></View>)}
      <Animated.View style={[s.active, { transform: [{ translateX: x }, { rotate: x.interpolate({ inputRange: [-400, 0, 400], outputRange: ['-8deg', '0deg', '8deg'], extrapolate: 'clamp' }) }] }]}>
        <View style={s.card}>
          <View style={s.photoArea}>
            <View {...swipe.panHandlers} testID="stop-photo-swipe"><Pressable accessibilityRole="button" accessibilityLabel={'View photo for stop ' + (index + 1) + ': ' + stop.name} accessibilityHint="Opens the full stop story and photo" onPress={() => { if (!busy.current && enabled.current && foreground.current) onDetails(stop.id); }}><StopPhoto stop={stop} /></Pressable></View>
            {photoActions && <View style={s.photoActions} testID="stop-photo-actions">{photoActions}</View>}
          </View>
          <View style={s.captionRow}><View style={s.captionRead} {...swipe.panHandlers} testID="stop-caption-swipe"><Pressable accessibilityRole="button" accessibilityLabel={'Read stop ' + (index + 1) + ': ' + stop.name} onPress={() => { if (!busy.current && enabled.current && foreground.current) onDetails(stop.id); }} style={s.caption}><Text accessibilityRole="header" numberOfLines={2} style={s.name}>{stop.name}</Text>{!!stop.description.trim() && <Text numberOfLines={2} style={s.note}>{stop.description}</Text>}<Text style={s.link}>{stop.rating !== null ? '★ ' + stop.rating + '/5 · ' : ''}Read story ↗</Text></Pressable></View>{optionsActions && <View testID="stop-options-actions" style={s.optionsActions}>{optionsActions}</View>}</View>
        </View>
      </Animated.View>
    </View>
    <View style={s.progress}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous memory" disabled={index === 0} accessibilityState={{ disabled: index === 0 }} onPress={() => move(-1)} style={[s.control, index === 0 && s.disabled]}><Text style={s.link}>← Previous</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Next memory" disabled={index >= stops.length - 1} accessibilityState={{ disabled: index >= stops.length - 1 }} onPress={() => move(1)} style={[s.control, index >= stops.length - 1 && s.disabled]}><Text style={s.link}>Next →</Text></Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  section: { gap: 10, paddingTop: 6 }, progress: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  deck: { paddingTop: 22 }, rear: { position: 'absolute', borderRadius: 22, overflow: 'hidden', backgroundColor: theme.lavender }, active: { width: '100%' },
  card: { borderRadius: 22, overflow: 'hidden', backgroundColor: theme.surface, borderWidth: 1, borderColor: '#FFFFFF' },
  photo: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', backgroundColor: theme.lavender }, image: { width: '100%', height: '100%' },
  photoArea: { position: 'relative' }, photoActions: { position: 'absolute', right: 6, top: 6 }, emptyActions: { alignItems: 'flex-end' },
  captionRow: { flexDirection: 'row', minHeight: 150 }, captionRead: { flex: 1, minWidth: 0 }, optionsActions: { width: 56, paddingTop: 6, alignItems: 'center' },
  caption: { padding: 14, gap: 5 }, name: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: theme.text }, note: { color: theme.muted, fontSize: 12, lineHeight: 18 },
  hint: { color: theme.muted, fontSize: 10, lineHeight: 16, flexShrink: 1 }, link: { color: theme.accent, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  control: { minHeight: 44, minWidth: 100, paddingHorizontal: 14, borderRadius: 18, backgroundColor: theme.lavender, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.4 }, empty: { padding: 18, gap: 8 },
});
