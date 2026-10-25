import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Animated, AppState, PanResponder, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBuddyApi } from '@/hooks/use-journey-buddy';
import { buddyDragged, createBuddyReactions, travelEvent, type BuddyPoint, type BuddyRect, type BuddyScreen } from '@/lib/buddy/model';
import { buddyOverlayClear, createBuddyGeometry, floatingWalkTarget, nearestBuddyPosition, type BuddyGeometry } from '@/lib/buddy/geometry';
import { BuddySprite } from './buddy-sprite';
import { BuddyHelpSheet } from './buddy-help-sheet';
import { createBuddyPositionCapture } from '@/lib/buddy/position';

type Api = NonNullable<ReturnType<typeof useBuddyApi>>;
export function JourneyBuddyHost() {
  const api = useBuddyApi();
  return api ? <BuddyHost api={api} /> : null;
}
function BuddyHost({ api }: { api: Api }) {
  const revision = useSyncExternalStore(api.store.subscribe, api.store.get, api.store.get);
  const preference = useSyncExternalStore(api.preference.subscribe, api.preference.get, api.preference.get);
  const path = usePathname(), insets = useSafeAreaInsets(), window = useWindowDimensions();
  const view = useRef<View>(null), alive = useRef(true), measurement = useRef(0), [host, setHost] = useState<BuddyRect>({ x: 0, y: 0, width: 0, height: 0 });
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const measure = useCallback(() => {
    const epoch = ++measurement.current;
    view.current?.measureInWindow((x, y, width, height) => {
      if (alive.current && epoch === measurement.current) setHost(old => old.x === x && old.y === y && old.width === width && old.height === height ? old : { x, y, width, height });
    });
  }, []);
  useEffect(() => { measure(); }, [measure, window.width, window.height, insets.top, insets.bottom, insets.left, insets.right]);
  const current = api.store.current();
  const protectedKey = JSON.stringify(current.protectedRects), hostKey = JSON.stringify(host), insetKey = JSON.stringify(insets);
  const geometry = useMemo(() => createBuddyGeometry(JSON.parse(hostKey), JSON.parse(insetKey), JSON.parse(protectedKey)), [hostKey, insetKey, protectedKey]);
  useEffect(() => { if (preference.enabled) api.store.requestMeasurements(); }, [api, preference.enabled, path, hostKey, insetKey]);
  const visible = preference.loaded && preference.enabled && path === revision.path && current.floating && !current.suppressed && !current.geometryPending && geometry.areas.length > 0;
  // Unmounting destroys clocks whenever hidden; navigation resets the parked position.
  return <View ref={view} collapsable={false} pointerEvents="box-none" style={[StyleSheet.absoluteFill, s.host]} onLayout={measure}>
    {visible && <BuddyActor key={path} api={api} path={path} geometry={geometry} screen={current.state} interacting={current.interacting} />}
  </View>;
}
function BuddyActor({ api, path, geometry, screen, interacting }: { api: Api; path: string; geometry: BuddyGeometry; screen?: BuddyScreen; interacting: boolean }) {
  const corridor = geometry.bounds;
  const router = useRouter();
  const [reduced, setReduced] = useState(true), [walking, setWalking] = useState(false), [facing, setFacing] = useState<'left' | 'right'>('left');
  const [initialPoint] = useState(() => nearestBuddyPosition(api.store.getPose(path)?.point ?? { x: corridor.x + corridor.width - 64, y: corridor.y + corridor.height - 64 }, geometry)!);
  const project = useCallback((value: BuddyPoint) => nearestBuddyPosition(value, geometry) ?? initialPoint, [geometry, initialPoint]);
  const [position] = useState(() => new Animated.ValueXY(initialPoint));
  const [capture] = useState(() => createBuddyPositionCapture(position)), [poseOwner] = useState(() => ({}));
  const point = useRef<BuddyPoint>(initialPoint), dragStart = useRef<BuddyPoint>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false), [parked, setParked] = useState(() => api.store.getPose(path)?.parked ?? false);
  const dragged = useRef(false), alive = useRef(true);
  const gestureState = useRef({ generation: 0, active: false, ready: false, released: false, dx: 0, dy: 0 });
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [help, setHelp] = useState<{ owner: object | null } | null>(null);
  const [reaction, setReaction] = useState<{ text: string; key: string; left: boolean } | null>(null);
  const [travelWalking, setTravelWalking] = useState(false), burstTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopTravelBurst = useCallback(() => { clearTimeout(burstTimer.current); burstTimer.current = undefined; setTravelWalking(false); }, []);
  const canAnimate = !reduced && !interacting && !help && !dragging;
  const latest = useRef({ corridor, geometry, help, parked, canAnimate });
  useEffect(() => { latest.current = { corridor, geometry, help, parked, canAnimate }; });
  useEffect(() => {
    const gesture = gestureState.current;
    // Claim only after commit. StrictMode replay invalidates a previous cleanup capture.
    capture.cancel(); api.store.claimPose(path, poseOwner);
    return () => {
      gesture.generation++; gesture.active = false;
      capture.read(value => {
        api.store.savePose(path, { point: nearestBuddyPosition(value, latest.current.geometry) ?? point.current, parked: latest.current.parked || dragged.current }, poseOwner);
        api.store.releasePose(path, poseOwner);
      });
    };
  }, [api, path, capture, poseOwner]);
  useEffect(() => {
    let active = true, changed = false;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active && !changed) setReduced(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; if (active) { setReduced(value); if (value) stopTravelBurst(); } });
    return () => { active = false; motion.remove(); };
  }, [stopTravelBurst]);
  useEffect(() => {
    gestureState.current.generation++; gestureState.current.active = false;
    return capture.read(value => {
      if (!alive.current) return;
      point.current = project(value); position.setValue(point.current); setWalking(false);
      setDragging(false);
    });
  }, [geometry, position, capture, project]);
  useEffect(() => {
    if (!canAnimate || parked || screen?.travel) return;
    const gesture = gestureState.current;
    let disposed = false, timer: ReturnType<typeof setTimeout>;
    const schedule = () => { timer = setTimeout(walk, 15000 + Math.random() * 15000); };
    const walk = () => {
      if (disposed || AppState.currentState !== 'active') return;
      const target = floatingWalkTarget(point.current, geometry), distance = Math.hypot(target.x - point.current.x, target.y - point.current.y);
      if (distance < 16) { schedule(); return; }
      setFacing(target.x < point.current.x ? 'left' : 'right'); setWalking(true);
      Animated.timing(position, { toValue: target, duration: Math.max(1000, distance * 35), useNativeDriver: true, isInteraction: false }).start(({ finished }) => {
        if (disposed) return;
        if (finished) point.current = target;
        setWalking(false); schedule();
      });
    };
    schedule();
    return () => {
      disposed = true; clearTimeout(timer);
      if (alive.current && !gesture.active) capture.read(value => { point.current = project(value); });
    };
  }, [canAnimate, parked, geometry, position, screen?.travel, capture, project]);
  useEffect(() => {
    const reactions = createBuddyReactions();
    const initial = api.store.current().state?.travel;
    let previous = initial;
    reactions.reset(initial);
    let key = initial ? travelEvent(initial) : '', expiry: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = api.store.subscribe(() => {
      const context = api.store.current(), travel = context.state?.travel, next = travel ? travelEvent(travel) : '';
      if (context.interacting) stopTravelBurst();
      if (key === next) return;
      const progressed = !!travel && !!previous && travel.journeyId === previous.journeyId && (travel.completed > previous.completed || travel.nextStop !== previous.nextStop);
      previous = travel; stopTravelBurst();
      key = next; clearTimeout(expiry); setReaction(null);
      if (!travel || latest.current.help) { reactions.reset(travel); return; }
      if (progressed && travel.status === 'active' && travel.gpsAvailable && !travel.guidance && !travel.arrival && latest.current.canAnimate && !context.interacting) {
        setTravelWalking(true); burstTimer.current = setTimeout(() => { burstTimer.current = undefined; setTravelWalking(false); }, 800);
      }
      const text = reactions.read(travel), bounds = latest.current.corridor;
      if (!text || bounds.height < 136 || bounds.width < 198 || point.current.y - bounds.y < 72) return;
      const left = point.current.x - bounds.x < 134;
      if (!buddyOverlayClear({ x: left ? point.current.x : point.current.x + 64 - 190, y: point.current.y - 72, width: 190, height: 72 }, latest.current.geometry)) return;
      setReaction({ text, key, left });
      expiry = setTimeout(() => setReaction(null), 5000);
    });
    return () => { unsubscribe(); clearTimeout(expiry); clearTimeout(burstTimer.current); };
  }, [api, stopTravelBurst]);
  const openHelp = () => {
    if (!alive.current || !api.preference.get().enabled || path !== api.store.get().path || api.store.current().suppressed || AppState.currentState !== 'active') return;
    capture.read(value => { if (alive.current) { point.current = nearestBuddyPosition(value, latest.current.geometry) ?? point.current; position.setValue(point.current); } });
    stopTravelBurst(); setWalking(false); setReaction(null);
    setHelp({ owner: api.store.actionOwner() });
  };
  const open = useRef<() => void>(() => {});
  useEffect(() => { open.current = openHelp; });
  const shouldStart = useCallback(() => !latest.current.help, []);
  // PanResponder registers these callbacks; it does not execute them during render.
  // eslint-disable-next-line react-hooks/refs
  const gesture = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: shouldStart,
    onStartShouldSetPanResponderCapture: shouldStart,
    onMoveShouldSetPanResponder: shouldStart,
    onPanResponderGrant: () => {
      if (!alive.current || !api.preference.get().enabled || path !== api.store.get().path || api.store.current().suppressed) return;
      dragged.current = false; stopTravelBurst(); setDragging(true); setWalking(false);
      const epoch = ++gestureState.current.generation;
      Object.assign(gestureState.current, { active: true, ready: false, released: false, dx: 0, dy: 0 });
      capture.read(value => {
        const gesture = gestureState.current;
        if (!alive.current || epoch !== gesture.generation || api.store.get().path !== path || api.store.current().suppressed) return;
        dragStart.current = value; gesture.ready = true;
        point.current = nearestBuddyPosition({ x: value.x + gesture.dx, y: value.y + gesture.dy }, latest.current.geometry) ?? point.current;
        position.setValue(point.current);
        if (dragged.current) api.store.savePose(path, { point: point.current, parked: true }, poseOwner);
        if (gesture.released) { gesture.active = false; setDragging(false); if (!dragged.current) open.current(); }
      });
    },
    onPanResponderMove: (_, move) => {
      if (!alive.current || !api.preference.get().enabled || path !== api.store.get().path || api.store.current().suppressed) return;
      gestureState.current.dx = move.dx; gestureState.current.dy = move.dy;
      if (!dragged.current && !buddyDragged(move.dx, move.dy)) return;
      dragged.current = true; setParked(true);
      if (!gestureState.current.ready) return;
      point.current = nearestBuddyPosition({ x: dragStart.current.x + move.dx, y: dragStart.current.y + move.dy }, latest.current.geometry) ?? point.current;
      position.setValue(point.current);
      api.store.savePose(path, { point: point.current, parked: true }, poseOwner);
    },
    onPanResponderRelease: (_, move) => {
      if (!alive.current || !api.preference.get().enabled || path !== api.store.get().path || api.store.current().suppressed) return;
      const gesture = gestureState.current;
      gesture.released = true; gesture.dx = move.dx; gesture.dy = move.dy;
      if (buddyDragged(move.dx, move.dy)) { dragged.current = true; setParked(true); }
      if (!gesture.ready) return;
      gesture.active = false; setDragging(false);
      if (dragged.current) setParked(true); else open.current();
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => { gestureState.current.generation++; gestureState.current.active = false; capture.cancel(); if (alive.current) { setDragging(false); setParked(true); } },
  }), [position, shouldStart, api, path, capture, poseOwner, stopTravelBurst]);
  const navigate = (route: '/create' | '/account') => {
    if (!alive.current) return;
    if (!api.preference.get().enabled || path !== api.store.get().path || AppState.currentState !== 'active' || api.store.current().suppressed) { setHelp(null); return; }
    setHelp(null); router.navigate(route);
  };
  const reactionVisible = reaction && screen?.travel && !screen.travel.guidance && !screen.travel.arrival && travelEvent(screen.travel) === reaction.key;
  return <>
    <Animated.View pointerEvents="box-none" style={[s.character, { transform: position.getTranslateTransform() }]}>
      <View {...gesture.panHandlers} collapsable={false} pointerEvents="box-only" accessible focusable
        accessibilityRole="button" accessibilityLabel="Journey Buddy" accessibilityHint="Double tap for journey help. Drag to park Buddy."
        accessibilityActions={[{ name: 'activate', label: 'Open journey help' }]} onAccessibilityTap={openHelp}
        onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'activate') openHelp(); }}
        onTouchStart={event => event.stopPropagation()} style={s.touch}>
        <BuddySprite animation={(walking || travelWalking) && canAnimate ? 'walk' : 'idle'} animate={canAnimate} facing={facing} />
      </View>
      {reactionVisible && <View pointerEvents="none" style={[s.reaction, reaction.left && { left: 0, right: undefined }]}><Text numberOfLines={3} style={s.reactionText}>{reaction.text}</Text></View>}
    </Animated.View>
    {help && <BuddyHelpSheet canAddMemory={!!screen?.canAddMemory} travel={screen?.travel}
      onClose={() => setHelp(null)} onCreate={() => navigate('/create')} onDrafts={() => navigate('/account')}
      onAddMemory={() => { if (!alive.current || !api.preference.get().enabled) return; const captured = help; setHelp(null); api.store.act(captured.owner, path, 'addMemory'); }} />}
  </>;
}
const s = StyleSheet.create({
  // Raise the global host above native screen/map layers; startup remains above at z100/elevation30.
  host: { zIndex: 30, elevation: 20 },
  character: { position: 'absolute', left: 0, top: 0, width: 64, height: 64, zIndex: 25 }, touch: { width: 64, height: 64 },
  reaction: { position: 'absolute', bottom: 64, right: 0, width: 190, borderRadius: 14, padding: 9, backgroundColor: '#F5FBFF', borderWidth: 1, borderColor: '#CEE0EA' },
  reactionText: { fontSize: 12, lineHeight: 17, color: '#314F5D' },
});
