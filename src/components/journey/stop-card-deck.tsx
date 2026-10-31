import { darkPilotStyles } from '@/theme/dark-pilot';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, AppState, Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { JourneyStop } from '@/types/journey';
import { StopArt } from '@/components/art/journey-art';
import { artSeed } from '@/lib/art/journey-art';
import { theme } from '@/theme/mobile-theme';
import { useBuddyProtectedBounds } from '@/hooks/use-buddy-geometry';

// Photo-less stops show stop art (journey route with this stop highlighted) instead of a
// map image: the live journey map sits directly above this deck. The right edge stays
// clear for the photo action rail.
// The card's Pressable carries the label, so the art stays hidden from accessibility.
function StopPhoto({ stop, stops, index, failed, onError, fill = false }: { stop: JourneyStop; stops: JourneyStop[]; index: number; failed: boolean; fill?: boolean; onError: (photo: string) => void }) {
  const s = lightStyles_s;
  return <View style={[s.photo, fill && s.fillPhoto]}>{stop.photo && !failed
    ? <Image key={stop.photo} source={{ uri: stop.photo }} accessibilityLabel={stop.name + ' photo'} resizeMode="cover" style={s.image} onError={() => { if (stop.photo) onError(stop.photo); }} />
    : <StopArt seed={artSeed(null, stops)} stops={stops} index={index} name={stop.name} inset={{ right: 56 }} />}<View pointerEvents="none" style={s.photoShade} /></View>;
}
const showsPhoto = (stop: JourneyStop, failed: readonly string[]) => Boolean(stop.photo && !failed.includes(stop.photo));

export function StopCardDeck({ stops, selectedId, onSelect, onDetails, onLoop, active = true, photoActions, optionsActions, creator, fitted = false, compact = false, textScale = 1 }: { stops: JourneyStop[]; selectedId: string | null; onSelect: (id: string) => void; onDetails: (id: string) => void; onLoop?: (id: string, reducedMotion: boolean) => void; active?: boolean; fitted?: boolean; compact?: boolean; textScale?: number; photoActions?: ReactNode; optionsActions?: ReactNode; creator?: ReactNode }) {
  const s = lightStyles_s;
  const shortCard = fitted && compact;
  const [reduceMotion, setReduceMotion] = useState(true);
  const [failedPhotos, setFailedPhotos] = useState<readonly string[]>([]);
  const photoFailed = useCallback((photo: string) => setFailedPhotos(previous => previous.includes(photo) ? previous : [...previous, photo]), []);
  const [width, setWidth] = useState(320);
  const protection = useBuddyProtectedBounds();
  const [x] = useState(() => new Animated.Value(0));
  const index = Math.max(0, stops.findIndex(stop => stop.id === selectedId));
  const current = useRef({ stops, index, onSelect, onLoop, width, reduceMotion });
  const busy = useRef(false);
  const generation = useRef(0);
  const foreground = useRef(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const enabled = useRef(active);
  const reset = useCallback(() => { generation.current++; busy.current = false; x.stopAnimation(); x.setValue(0); }, [x]);
  useEffect(() => {
    current.current = { stops, index, onSelect, onLoop, width, reduceMotion };
    enabled.current = active;
    reset();
  }, [stops, index, onSelect, onLoop, width, reduceMotion, selectedId, active, reset]);
  useEffect(() => {
    let active = true, changed = false;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active && !changed) setReduceMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; if (active) setReduceMotion(value); });
    const lifecycle = AppState.addEventListener('change', state => { foreground.current = state === 'active'; if (!foreground.current) reset(); });
    return () => { active = false; motion.remove(); lifecycle.remove(); reset(); };
  }, [reset]);
  const move = useCallback((direction: -1 | 1) => {
    const c = current.current, looping = direction === 1 && c.stops.length > 1 && c.index === c.stops.length - 1;
    const target = c.stops[looping ? 0 : c.index + direction];
    const select = () => { if (target) { if (looping && c.onLoop) c.onLoop(target.id, c.reduceMotion); else c.onSelect(target.id); } };
    if (!foreground.current || !enabled.current) { reset(); return; }
    if (busy.current) return;
    if (!target) { reset(); return; }
    if (c.reduceMotion) { reset(); busy.current = true; select(); return; }
    busy.current = true;
    const token = ++generation.current;
    Animated.timing(x, { toValue: -direction * (c.width + 60), duration: 210, useNativeDriver: true }).start(({ finished }) => {
      if (token !== generation.current) return;
      busy.current = false; x.setValue(0);
      if (finished) select();
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
  if (!stop) return <View {...protection} style={s.empty}><Text style={s.name}>Places still to come</Text><Text style={s.note}>The creator hasn’t added stops yet.</Text>{photoActions && <View style={s.emptyActions}>{photoActions}</View>}{optionsActions && <View style={s.emptyActions}>{optionsActions}</View>}</View>;
  const behind = stops.slice(index + 1, index + 3).reverse();
  return <View {...protection} style={[s.section, fitted && s.fittedSection, shortCard && s.shortSection]} testID="journey-stop-deck" onLayout={event => { protection.onLayout(); setWidth(event.nativeEvent.layout.width); }}>
    <View style={s.progress} accessibilityLiveRegion="polite"><Text style={s.note}>Stop {index + 1} of {stops.length}</Text><View style={s.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous memory" disabled={index === 0} accessibilityState={{ disabled: index === 0 }} onPress={() => move(-1)} style={[s.control, index === 0 && s.disabled]}><Text style={s.link}>←</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={index === stops.length - 1 && stops.length > 1 ? 'Return to first stop' : 'Next memory'} disabled={stops.length <= 1} accessibilityState={{ disabled: stops.length <= 1 }} onPress={() => move(1)} style={[s.control, stops.length <= 1 && s.disabled]}><Text style={s.link}>→</Text></Pressable>
    </View></View>
    <View style={[s.deck, fitted && s.fittedDeck]}>
      {behind.map((item, i) => <View key={item.id} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.rear, { top: (behind.length - i - 1) * 8, left: (behind.length - i) * 8, right: (behind.length - i) * 8, transform: [{ rotate: (i ? '-2deg' : '2deg') }] }]}><StopPhoto stop={item} stops={stops} index={stops.indexOf(item)} failed={!showsPhoto(item, failedPhotos)} onError={photoFailed} /></View>)}
      <Animated.View style={[s.active, fitted && s.fittedCard, { transform: [{ translateX: x }, { rotate: x.interpolate({ inputRange: [-400, 0, 400], outputRange: ['-8deg', '0deg', '8deg'], extrapolate: 'clamp' }) }] }]}>
        <View style={[s.card, fitted && s.fixedCard, shortCard && s.shortCard]}>
          <View style={[s.photoArea, fitted && s.fittedPhotoArea]}>
            <View {...swipe.panHandlers} style={fitted && s.fittedCard} testID="stop-photo-swipe"><Pressable style={fitted && s.fittedCard} accessibilityRole="button" accessibilityLabel={(showsPhoto(stop, failedPhotos) ? 'View photo for stop ' : 'View stop ') + (index + 1) + ': ' + stop.name} accessibilityHint={showsPhoto(stop, failedPhotos) ? 'Opens the full stop story and photo' : 'Opens the full stop story'} onPress={() => { if (!busy.current && enabled.current && foreground.current) onDetails(stop.id); }}><StopPhoto fill={fitted} stop={stop} stops={stops} index={index} failed={!showsPhoto(stop, failedPhotos)} onError={photoFailed} /></Pressable></View>
            {photoActions && <View style={s.photoActions} testID="stop-photo-actions">{photoActions}</View>}
          </View>
          <View style={s.captionRow}><View style={s.captionRead} {...swipe.panHandlers} testID="stop-caption-swipe"><Pressable accessibilityRole="button" accessibilityLabel={'Read stop ' + (index + 1) + ': ' + stop.name} onPress={() => { if (!busy.current && enabled.current && foreground.current) onDetails(stop.id); }} style={s.caption}><Text accessibilityRole="header" numberOfLines={shortCard ? 1 : 2} style={[s.name, { height: 56 * Math.max(1, textScale) }, shortCard && s.shortName]}>{stop.name}</Text><Text numberOfLines={1} style={[s.description, { height: 18 * Math.max(1, textScale) }]}>{stop.description.trim() || ' '}</Text><Text style={s.link}>{stop.rating !== null ? '★ ' + stop.rating + '/5 · ' : ''}Read story ↗</Text></Pressable></View><View style={s.captionFooter}>{creator && <View style={s.creator}>{creator}</View>}{optionsActions && <View testID="stop-options-actions" style={s.optionsActions}>{optionsActions}</View>}</View></View>
        </View>
      </Animated.View>
    </View>

  </View>;
}
const lightStyles_s = darkPilotStyles(StyleSheet.create({
  shortCard: { height: 300 }, shortSection: { height: 362 }, shortName: { height: 28, minHeight: 28 },
  fixedCard: { height: 328 }, fittedSection: { height: 390, flexGrow: 0, flexShrink: 0 }, fittedDeck: { flex: 1, minHeight: 0 }, fittedCard: { flex: 1, minHeight: 0 },
  fittedPhotoArea: { flex: 1, minHeight: 162 }, fillPhoto: { flex: 1, aspectRatio: undefined, height: '100%' },
  description: { color: theme.muted, fontSize: 12, lineHeight: 18, minHeight: 18 },
  section: { gap: 0 }, progress: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  deck: { paddingTop: 14 }, rear: { position: 'absolute', borderRadius: 22, overflow: 'hidden', backgroundColor: theme.lavender }, active: { width: '100%' },
  card: { borderRadius: 22, overflow: 'hidden', backgroundColor: theme.surface, borderWidth: 1, borderColor: '#FFFFFF' },
  photo: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', backgroundColor: theme.lavender }, image: { width: '100%', height: '100%' },
  photoShade: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 72, experimental_backgroundImage: 'linear-gradient(90deg, rgba(5,15,30,0) 0%, rgba(5,15,30,0.55) 100%)' },
  photoArea: { position: 'relative' }, photoActions: { position: 'absolute', right: 6, top: 6 }, emptyActions: { alignItems: 'flex-end' },
  captionFooter: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, gap: 4 }, creator: { flex: 1, minWidth: 0 },
  captionRow: { gap: 0 }, captionRead: { minWidth: 0 }, optionsActions: { paddingHorizontal: 6, paddingBottom: 2, alignItems: 'flex-end' },
  caption: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 0, gap: 3 }, name: { minHeight: 56, fontSize: 22, lineHeight: 28, fontWeight: '700', color: theme.text }, note: { color: theme.muted, fontSize: 12, lineHeight: 18 },
  hint: { color: theme.muted, fontSize: 10, lineHeight: 16, flexShrink: 1 }, link: { color: theme.accent, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  controls: { flexDirection: 'row', gap: 4 }, control: { minHeight: 48, minWidth: 48, paddingHorizontal: 8, borderRadius: 18, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.4 }, empty: { padding: 18, gap: 8 },
}));
