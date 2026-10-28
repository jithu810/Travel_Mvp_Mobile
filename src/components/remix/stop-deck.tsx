import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { AccessibilityInfo, Animated, AppState, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import type { JourneyStop } from '@/types/journey';
import { theme } from '@/theme/mobile-theme';
import { useBuddyProtectedBounds } from '@/hooks/use-buddy-geometry';
import { DeckBuddy, type DeckMood } from './deck-buddy';

export type StopDeckHandle = {
  /** Animates the top card to a pile, then reports the decision. Ignored while locked or animating. */
  play: (keep: boolean) => boolean;
  /** Arms stop `id` to return from its pile when it is next on top; false while locked or animating (caller must not undo). */
  restore: (fromHand: boolean, id: string) => boolean;
};
const TOP = 6, SIDE = 12, TRAY = 88, SLOT = 68, MINI_W = 40, MINI_H = 56, FLIGHT = 300, RETURN = 280;
const KEEP_SPIN = 14, DISCARD_SPIN = -24, FAN_MAX = 6;
const hidden = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const, pointerEvents: 'none' as const };

function CardBack({ mini = false }: { mini?: boolean }) {
  return <View style={[s.back, mini && s.miniBack]}><View style={[s.backInset, mini && s.miniInset]}><Text style={[s.backMark, mini && s.miniMark]}>✦</Text></View></View>;
}

// Piles are presentation only: decisions are reported through onDecide and the caller keeps
// the original stop order. Selection is reported after the fly-off completes (immediately
// under Reduce Motion); stale completions are dropped by generation token and stop identity.
// `active` is false while the route is unfocused: no gestures, presses or late reports.
export function StopDeck({ ref, stops, cursor, decisions, disabled, active = true, onDecide, card, empty }: {
  ref?: Ref<StopDeckHandle>; stops: readonly JourneyStop[]; cursor: number; decisions: Readonly<Record<string, boolean>>; disabled: boolean; active?: boolean;
  onDecide: (keep: boolean, id: string) => void; card: ReactNode; empty: ReactNode;
}) {
  const protection = useBuddyProtectedBounds();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [reduced, setReduced] = useState(true), [motionKnown, setMotionKnown] = useState(false);
  const [say, setSay] = useState<{ mood: DeckMood; beat: number }>({ mood: 'idle', beat: 0 });
  const [fanDone, setFanDone] = useState(false);
  const [pan] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [fly] = useState(() => new Animated.Value(0)), [spin] = useState(() => new Animated.Value(0)), [down] = useState(() => new Animated.Value(0));
  const [intro] = useState(() => new Animated.Value(0)), [face] = useState(() => new Animated.Value(0)), [settled] = useState(() => new Animated.Value(0));
  const stop = stops[cursor], identity = stop?.id ?? null;
  const cardWidth = Math.max(0, size.width - SIDE * 2), cardHeight = Math.max(72, size.height - TRAY - TOP - 16);
  const threshold = Math.min(110, Math.max(48, cardHeight * 0.22));
  const current = useRef({ stops, cursor, disabled, active, onDecide, reduced, size, cardHeight, threshold });
  const busy = useRef(false), generation = useRef(0), mounted = useRef(true);
  // A pending Undo return is armed for one stop id; any other identity clears it.
  const returning = useRef<{ fromHand: boolean; id: string } | null>(null);
  // The stop just reported: further presses wait until the caller moves the deck on.
  const reported = useRef<string | null>(null);
  const phase = useRef<'pending' | 'running' | 'done'>('pending'), fallback = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const foreground = useRef(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  useLayoutEffect(() => { current.current = { stops, cursor, disabled, active, onDecide, reduced, size, cardHeight, threshold }; });
  const zero = useCallback(() => {
    pan.stopAnimation(); fly.stopAnimation(); spin.stopAnimation(); down.stopAnimation();
    pan.setValue({ x: 0, y: 0 }); fly.setValue(0); spin.setValue(0); down.setValue(0);
  }, [pan, fly, spin, down]);
  const finishIntro = useCallback(() => {
    if (phase.current === 'done') return;
    phase.current = 'done'; intro.stopAnimation(); face.stopAnimation(); settled.stopAnimation(); intro.setValue(0); face.setValue(1); settled.setValue(1);
  }, [intro, face, settled]);
  // Event-handler variant: also unmounts the (now invisible) fan cards.
  const endIntro = useCallback(() => { finishIntro(); setFanDone(true); }, [finishIntro]);
  // Cancels any flight, return or intro and leaves the current card resting face-up.
  const settle = useCallback(() => { generation.current++; busy.current = false; reported.current = null; clearTimeout(fallback.current); zero(); finishIntro(); }, [zero, finishIntro]);
  const target = useCallback((keep: boolean) => {
    const { size: { width, height }, cardHeight: h } = current.current;
    return { x: (keep ? width - SIDE - SLOT / 2 : SIDE + SLOT / 2) - width / 2, y: height - TRAY + 4 + MINI_H / 2 - (TOP + h / 2) };
  }, []);
  const live = useCallback(() => mounted.current && foreground.current && current.current.active && !current.current.disabled, []);
  const canAct = useCallback(() => live() && !busy.current && reported.current === null, [live]);
  const speak = useCallback((mood: DeckMood) => setSay(previous => ({ mood, beat: previous.beat + 1 })), []);
  const report = useCallback((keep: boolean, item: JourneyStop, token: number) => {
    reported.current = item.id; speak(keep ? 'select' : 'discard'); current.current.onDecide(keep, item.id);
    // Android hears each decision once through the caller's progress live region; iOS has no live regions.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility((keep ? 'Selected ' : 'Discarded ') + (item.name || 'stop'));
    // Normally the next identity resets the deck before paint; this recovers if the caller declined.
    clearTimeout(fallback.current);
    fallback.current = setTimeout(() => { if (mounted.current && token === generation.current) { reported.current = null; zero(); } }, 250);
  }, [speak, zero]);
  const play = useCallback((keep: boolean) => {
    const c = current.current, item = c.stops[c.cursor];
    if (!item || !canAct()) return false;
    endIntro();
    if (c.reduced || !c.size.width) { const token = ++generation.current; zero(); report(keep, item, token); return true; }
    busy.current = true;
    const token = ++generation.current, to = target(keep), timing = (value: Animated.Value, toValue: number) => Animated.timing(value, { toValue, duration: FLIGHT, useNativeDriver: true });
    Animated.parallel([Animated.timing(pan, { toValue: to, duration: FLIGHT, useNativeDriver: true }), timing(fly, 1), timing(spin, keep ? KEEP_SPIN : DISCARD_SPIN), timing(down, keep ? 0 : 1)]).start(({ finished }) => {
      if (token !== generation.current) return;
      busy.current = false;
      const now = current.current;
      if (!finished || !live() || now.stops[now.cursor]?.id !== item.id) { zero(); return; }
      // The card rests on its pile until the next identity resets values before paint.
      report(keep, item, token);
    });
    return true;
  }, [canAct, live, endIntro, zero, report, target, pan, fly, spin, down]);
  const restore = useCallback((fromHand: boolean, id: string) => {
    if (!live() || busy.current) return false;
    endIntro(); returning.current = { fromHand, id }; speak('undo'); return true;
  }, [live, endIntro, speak]);
  useImperativeHandle(ref, () => ({ play, restore }), [play, restore]);
  useLayoutEffect(() => {
    generation.current++; busy.current = false; reported.current = null; clearTimeout(fallback.current); zero();
    const armed = returning.current, c = current.current; returning.current = null;
    if (!armed || armed.id !== identity || c.reduced || !c.size.width || phase.current !== 'done') return;
    const to = target(armed.fromHand), token = ++generation.current;
    pan.setValue(to); fly.setValue(1); spin.setValue(armed.fromHand ? KEEP_SPIN : DISCARD_SPIN); down.setValue(armed.fromHand ? 0 : 1); busy.current = true;
    const timing = (value: Animated.Value) => Animated.timing(value, { toValue: 0, duration: RETURN, useNativeDriver: true });
    Animated.parallel([Animated.timing(pan, { toValue: { x: 0, y: 0 }, duration: RETURN, useNativeDriver: true }), timing(fly), timing(spin), timing(down)]).start(({ finished }) => {
      if (token !== generation.current) return;
      busy.current = false; if (!finished) zero();
    });
  }, [identity, cursor, target, zero, pan, fly, spin, down]);
  useEffect(() => { if (busy.current || reported.current !== null || phase.current === 'running') settle(); }, [disabled, active, reduced, settle]);
  useEffect(() => {
    // StrictMode replays effects: the replayed cleanup settles, so re-arm the intro on setup.
    mounted.current = true; phase.current = 'pending';
    let changed = false;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted.current && !changed) { setReduced(value); setMotionKnown(true); } }).catch(() => { if (mounted.current) setMotionKnown(true); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; if (mounted.current) { setReduced(value); setMotionKnown(true); } });
    const lifecycle = AppState.addEventListener('change', state => { foreground.current = state === 'active'; if (!foreground.current) { settle(); setFanDone(true); } });
    return () => { mounted.current = false; motion.remove(); lifecycle.remove(); settle(); };
  }, [settle]);
  // Intro on every open: squared deck, magician's fan, gather with the current stop on top.
  useEffect(() => {
    if (phase.current !== 'pending' || !motionKnown || !size.width) return;
    if (reduced || !identity) { finishIntro(); return; }
    phase.current = 'running'; intro.setValue(0); face.setValue(0); settled.setValue(0);
    const timing = (value: Animated.Value, toValue: number, duration: number) => Animated.timing(value, { toValue, duration, useNativeDriver: true, isInteraction: false });
    Animated.sequence([timing(intro, 1, 420), Animated.delay(120), timing(intro, 0, 340), Animated.parallel([timing(face, 1, 160), timing(settled, 1, 160)])]).start(() => { if (phase.current === 'running') endIntro(); });
  }, [motionKnown, reduced, size.width, identity, finishIntro, endIntro, intro, face, settled]);
  const springBack = useCallback(() => {
    if (busy.current) return;
    if (current.current.reduced) { zero(); return; }
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, tension: 80, useNativeDriver: true }).start();
  }, [pan, zero]);
  // Creating a responder registers callbacks; refs are read only when a gesture runs.
  // eslint-disable-next-line react-hooks/refs
  const gesture = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => canAct() && Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2,
    onPanResponderGrant: endIntro,
    onPanResponderMove: (_, g) => { if (!busy.current && !current.current.reduced) pan.setValue({ x: g.dx * 0.5, y: g.dy }); },
    onPanResponderRelease: (_, g) => {
      if (busy.current) return;
      const t = current.current.threshold;
      const keep = g.dy <= -t || (g.dy < -32 && g.vy < -0.9) ? true : g.dy >= t || (g.dy > 32 && g.vy > 0.9) ? false : null;
      if (keep === null || !play(keep)) springBack();
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: springBack,
  }), [canAct, endIntro, play, springBack, pan]);
  const remaining = Math.max(0, stops.length - cursor);
  // Fan views exist only for a live intro: never under Reduce Motion, gone once it ends, is cut short or the app backgrounds.
  const fan = stop && !fanDone && !(motionKnown && reduced) ? Math.min(remaining, FAN_MAX) : 0, peeks = stop ? Math.min(remaining - 1, 2) : 0;
  const discarded = stops.filter(item => decisions[item.id] === false).length, hand = stops.filter(item => decisions[item.id] === true);
  const frame = { top: TOP, left: SIDE, right: SIDE, height: cardHeight };
  const mood: DeckMood = stop ? say.mood : 'done';
  // Stamps reflect the finger only: a flight to the hand pile moves down, which must not read as DISCARD.
  const dragOnly = fly.interpolate({ inputRange: [0, 0.2], outputRange: [1, 0], extrapolate: 'clamp' });
  return <View {...protection} style={s.root} testID="customize-stop-deck" onLayout={event => { protection.onLayout(); const { width, height } = event.nativeEvent.layout; setSize(previous => previous.width === width && previous.height === height ? previous : { width, height }); }}>
    {size.width > 0 && <>
      {Array.from({ length: peeks }, (_, i) => peeks - i).map(k => <Animated.View key={'peek' + k} {...hidden} testID="deck-peek" style={[s.slot, frame, { top: TOP + k * 6, left: SIDE + k * 7, right: SIDE + k * 7, opacity: settled, transform: [{ rotate: k % 2 ? '2deg' : '-2deg' }] }]}><CardBack /></Animated.View>)}
      {Array.from({ length: fan }, (_, i) => { const k = i - (fan - 1) / 2; return <Animated.View key={'fan' + i} {...hidden} testID="deck-fan" style={[s.slot, frame, { opacity: settled.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [
        { translateX: intro.interpolate({ inputRange: [0, 1], outputRange: [0, k * cardWidth * 0.11] }) }, { translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [0, k * k * 6 - 10] }) },
        { rotate: intro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', k * 10 + 'deg'] }) }, { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) }] }]}><CardBack /></Animated.View>; })}
      {stop ? <Animated.View key={stop.id} {...gesture.panHandlers} testID="deck-top-card" style={[s.slot, s.top, frame, { opacity: face, transform: [
        { translateX: pan.x }, { translateY: pan.y }, { rotate: pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-10deg', '0deg', '10deg'], extrapolate: 'clamp' }) },
        { rotate: spin.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) }, { scale: fly.interpolate({ inputRange: [0, 1], outputRange: [1, cardWidth ? MINI_W / cardWidth : 0.2] }) }] }]}>
        {card}
        <Animated.View {...hidden} style={[s.stamp, s.selectStamp, { opacity: Animated.multiply(pan.y.interpolate({ inputRange: [-threshold, -threshold * 0.55, 0], outputRange: [1, 0, 0], extrapolate: 'clamp' }), dragOnly) }]}><Text style={[s.stampText, s.selectText]}>SELECT</Text></Animated.View>
        <Animated.View {...hidden} style={[s.stamp, s.discardStamp, { opacity: Animated.multiply(pan.y.interpolate({ inputRange: [0, threshold * 0.55, threshold], outputRange: [0, 0, 1], extrapolate: 'clamp' }), dragOnly) }]}><Text style={[s.stampText, s.discardText]}>DISCARD</Text></Animated.View>
        <Animated.View {...hidden} style={[s.cover, { opacity: down }]}><CardBack /></Animated.View>
      </Animated.View> : <View style={[s.slot, frame, s.empty]}>{empty}</View>}
    </>}
    <View style={s.tray}>
      <View style={s.pileSlot} accessible accessibilityLabel={'Discard pile, ' + discarded + (discarded === 1 ? ' stop' : ' stops')}>
        <View style={s.pile}>{discarded ? Array.from({ length: Math.min(discarded, 3) }, (_, i) => <View key={i} style={[s.mini, { transform: [{ translateX: i * 3 - 3 }, { translateY: -i * 2 }, { rotate: (i - 1) * 7 + 'deg' }] }]}><CardBack mini /></View>) : <View style={s.placeholder} />}</View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={s.pileLabel}>Discarded · {discarded}</Text>
      </View>
      <DeckBuddy mood={mood} beat={say.beat} reduced={reduced} />
      <View style={s.pileSlot} accessible accessibilityLabel={'Your hand, ' + hand.length + (hand.length === 1 ? ' stop' : ' stops')}>
        <View style={s.pile}>{hand.length ? hand.slice(-4).map((item, i, shown) => { const k = i - (shown.length - 1) / 2; return <View key={item.id} style={[s.mini, s.miniFace, { transform: [{ translateX: k * 9 }, { translateY: Math.abs(k) * 3 }, { rotate: k * 9 + 'deg' }] }]}><Text style={s.miniNumber}>{stops.indexOf(item) + 1}</Text></View>; }) : <View style={s.placeholder} />}</View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={s.pileLabel}>Your hand · {hand.length}</Text>
      </View>
    </View>
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  slot: { position: 'absolute', borderRadius: 24, overflow: 'hidden' },
  top: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.white, boxShadow: '0 4px 10px rgba(21,62,53,0.12)' },
  empty: { justifyContent: 'center' },
  back: { flex: 1, borderRadius: 24, padding: 8, backgroundColor: theme.accent, experimental_backgroundImage: theme.primaryGradient, borderWidth: 1, borderColor: '#DCD6FF' },
  backInset: { flex: 1, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  backMark: { color: theme.white, fontSize: 28, opacity: 0.85 },
  miniBack: { borderRadius: 7, padding: 3 }, miniInset: { borderRadius: 5, borderWidth: 1 }, miniMark: { fontSize: 12 },
  cover: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  stamp: { position: 'absolute', top: 18, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, borderWidth: 3, backgroundColor: 'rgba(255,255,255,0.86)' },
  selectStamp: { left: 16, borderColor: '#356147', transform: [{ rotate: '-12deg' }] }, discardStamp: { right: 16, borderColor: '#9A3B32', transform: [{ rotate: '12deg' }] },
  stampText: { fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: 2 }, selectText: { color: '#356147' }, discardText: { color: '#9A3B32' },
  tray: { position: 'absolute', left: SIDE, right: SIDE, bottom: 0, height: TRAY, flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  pileSlot: { width: SLOT, height: TRAY, paddingTop: 4, alignItems: 'center', gap: 4 },
  pile: { width: SLOT, height: MINI_H, alignItems: 'center', justifyContent: 'center' },
  mini: { position: 'absolute', width: MINI_W, height: MINI_H, borderRadius: 7, overflow: 'hidden' },
  miniFace: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(39,54,85,0.18)' },
  miniNumber: { color: theme.accent, fontSize: 14, fontWeight: '700' },
  placeholder: { width: MINI_W, height: MINI_H, borderRadius: 7, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.border },
  pileLabel: { color: theme.muted, fontSize: 11, lineHeight: 16, fontWeight: '600' },
});
