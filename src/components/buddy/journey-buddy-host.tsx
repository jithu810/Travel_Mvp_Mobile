import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Animated, AppState, PanResponder, StyleSheet, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBuddySleep } from '@/hooks/use-buddy-sleep';
import { useBuddyApi } from '@/hooks/use-journey-buddy';
import { buddyDragged, buddyTravelCopy, travelEvent, type BuddyCelebration, type BuddyPoint, type BuddyRect, type BuddyScreen } from '@/lib/buddy/model';
import { placeBuddyBubble, createBuddyGeometry, floatingWalkTarget, nearestBuddyPosition, type BuddyGeometry } from '@/lib/buddy/geometry';
import { BuddySprite } from './buddy-sprite';
import { BuddyHelpSheet } from './buddy-help-sheet';
import { createBuddyPositionCapture } from '@/lib/buddy/position';
import { buddyCelebrationDuration } from '@/lib/buddy/animations';
import { buddyContextLine, claimBuddyContext, BUDDY_CONTEXT_DELAY, BUDDY_CONTEXT_DURATION, type BuddyContextLine } from '@/lib/buddy/contextual-lines';
import { MapBuddyHelp } from './map-buddy-help';
import { buddyHelpLine, buddyHelpPrimary } from '@/lib/buddy/help-actions';

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
  const mapHelp = api.store.getMapHelp();
  const visible = preference.loaded && preference.enabled && path === revision.path && current.floating && !current.suppressed && !current.geometryPending && geometry.areas.length > 0
    && !mapHelp && (!current.mapOwned || !!api.store.getCelebration() || api.store.getTour() !== null);
  // Confirmed success needn't wait for its initiating roaming cooldown. Actual
  // held/new touches and screen interaction still suppress/cancel the celebration.
  const interacting = current.interacting && !(api.store.getCelebration() && current.touchCooldown);
  // Unmounting destroys clocks whenever hidden; navigation resets the parked position.
  return <View ref={view} collapsable={false} pointerEvents="box-none" style={[StyleSheet.absoluteFill, s.host]} onLayout={measure}>
    {mapHelp ? <MapBuddyHelp origin={{ x: host.x, y: host.y }} /> : visible && <BuddyActor key={path} api={api} path={path} geometry={geometry} screen={current.state} interacting={interacting} />}
  </View>;
}
function BuddyActor({ api, path, geometry, screen, interacting }: { api: Api; path: string; geometry: BuddyGeometry; screen?: BuddyScreen; interacting: boolean }) {
  const corridor = geometry.bounds;
  const { fontScale = 1 } = useWindowDimensions();
  const minimumBubbleHeight = Math.ceil(124 * Math.max(1, fontScale));
  const router = useRouter();
  const [reduced, setReduced] = useState(true), [walking, setWalking] = useState(false), [facing, setFacing] = useState<'left' | 'right'>('left');
  const [motionKnown, setMotionKnown] = useState(false);
  const pendingCelebration = api.store.getCelebration();
  const celebration: BuddyCelebration | null = pendingCelebration?.claimed ? pendingCelebration : null;
  const [initialPoint] = useState(() => nearestBuddyPosition(api.store.getPose(path)?.point ?? { x: corridor.x + corridor.width - 64, y: corridor.y + corridor.height - 64 }, geometry)!);
  const project = useCallback((value: BuddyPoint) => nearestBuddyPosition(value, geometry) ?? initialPoint, [geometry, initialPoint]);
  const [position] = useState(() => new Animated.ValueXY(initialPoint));
  const [capture] = useState(() => createBuddyPositionCapture(position)), [poseOwner] = useState(() => ({}));
  const point = useRef<BuddyPoint>(initialPoint), dragStart = useRef<BuddyPoint>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false), [parked, setParked] = useState(() => api.store.getPose(path)?.parked ?? false);
  const dragged = useRef(false), alive = useRef(true);
  const gestureState = useRef({ generation: 0, active: false, ready: false, released: false, dx: 0, dy: 0 });
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [help, setHelp] = useState<{ owner: object | null } | null>(() => api.store.getTour() !== null ? { owner: api.store.actionOwner() } : null);
  const [reaction, setReaction] = useState<{ text: string; key: string } | null>(null);
  const [helpMeasurementFailed, setHelpMeasurementFailed] = useState(false);
  const [contextual, setContextual] = useState<BuddyContextLine | null>(null);
  const [bubbleHeight, setBubbleHeight] = useState(0), [anchor, setAnchor] = useState(initialPoint);
  const storyId = screen?.ownStory?.id;
  const [travelWalking, setTravelWalking] = useState(false), burstTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopTravelBurst = useCallback(() => { clearTimeout(burstTimer.current); burstTimer.current = undefined; setTravelWalking(false); }, []);
  const { asleep, wake: wakeBuddy } = useBuddySleep(api, path, !!screen?.travel || !!help || !!reaction || !!pendingCelebration || dragging, interacting);
  const wakeGesture = useRef(false);
  const canAnimate = !reduced && !interacting && !help && !reaction && !contextual && !dragging;
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
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active && !changed) { setReduced(value); setMotionKnown(true); } }).catch(() => { if (active) setMotionKnown(true); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; if (active) { setReduced(value); setMotionKnown(true); if (value) { stopTravelBurst(); api.store.clearCelebration(); } } });
    return () => { active = false; motion.remove(); };
  }, [api, stopTravelBurst]);
  useEffect(() => {
    gestureState.current.generation++; gestureState.current.active = false;
    return capture.read(value => {
      if (!alive.current) return;
      point.current = project(value); position.setValue(point.current); setWalking(false);
      setDragging(false);
    });
  }, [geometry, position, capture, project]);
  useEffect(() => {
    if (!canAnimate || asleep || celebration || parked || screen?.travel) return;
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
      if (alive.current && !gesture.active) capture.read(value => {
        if (!alive.current) return;
        point.current = project(value); setWalking(false);
      });
    };
  }, [canAnimate, asleep, celebration, parked, geometry, position, screen?.travel, capture, project]);
  const quiet = !!screen?.travel && (!!screen.travel.guidance || screen.travel.arrival);
  useEffect(() => {
    const event = api.store.getCelebration();
    if (!event) return;
    if (Date.now() >= event.expiresAt || event.path !== path || !api.preference.get().enabled || AppState.currentState !== 'active'
      || quiet || help || reaction || dragging || (motionKnown && reduced)) {
      api.store.clearCelebration(event.id); return;
    }
    if (celebration || event.claimed || !motionKnown || !canAnimate) return;
    // Success may skip only the initiating cooldown after release; held/new
    // touches stay guarded by the host/store, as do guidance and arrival.
    const claimed = api.store.claimCelebration(event.id);
    if (!claimed) return;
    capture.read(value => {
      if (!alive.current || api.store.getCelebration()?.id !== claimed.id || api.store.current().suppressed) return;
      stopTravelBurst(); setWalking(false);
      point.current = project(value); position.setValue(point.current); setAnchor(point.current);
    });
  }, [api, path, pendingCelebration, celebration, canAnimate, motionKnown, reduced, quiet, help, reaction, dragging, stopTravelBurst, capture, project, position]);
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => api.store.clearCelebration(celebration.id), buddyCelebrationDuration(celebration.animation));
    return () => { clearTimeout(timer); api.store.clearCelebration(celebration.id); };
  }, [api, celebration]);
  useEffect(() => {
    if (!pendingCelebration || pendingCelebration.claimed) return;
    const timer = setTimeout(() => api.store.clearCelebration(pendingCelebration.id), Math.max(0, pendingCelebration.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [api, pendingCelebration]);
  useEffect(() => {
    const initial = api.store.current().state?.travel;
    let previous = initial;
    let key = initial ? travelEvent(initial) : '', expiry: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = api.store.subscribe(() => {
      const context = api.store.current(), travel = context.state?.travel, next = travel ? travelEvent(travel) : '';
      if (context.interacting) stopTravelBurst();
      if (key === next) return;
      const progressed = !!travel && !!previous && travel.journeyId === previous.journeyId && (travel.completed > previous.completed || travel.nextStop !== previous.nextStop);
      previous = travel; stopTravelBurst();
      key = next; clearTimeout(expiry); setReaction(null);
      if (!travel || latest.current.help || api.store.getCelebration()) return;
      if (progressed && travel.status === 'active' && travel.gpsAvailable && !travel.guidance && !travel.arrival && latest.current.canAnimate && !context.interacting) {
        setTravelWalking(true); burstTimer.current = setTimeout(() => { burstTimer.current = undefined; setTravelWalking(false); }, 800);
      }
      if (travel.guidance || travel.arrival || context.interacting || !placeBuddyBubble(point.current, latest.current.geometry, Math.min(252, latest.current.corridor.width), minimumBubbleHeight) || !api.store.reactOnce('travel:' + next)) return;
      capture.read(value => {
        if (!alive.current || api.store.get().path !== path) return;
        point.current = nearestBuddyPosition(value, latest.current.geometry) ?? point.current;
        position.setValue(point.current); setAnchor(point.current); setBubbleHeight(0);
        setReaction({ text: buddyTravelCopy(travel), key });
      });
      expiry = setTimeout(() => setReaction(null), 7000);
    });
    return () => { unsubscribe(); clearTimeout(expiry); clearTimeout(burstTimer.current); };
  }, [api, stopTravelBurst, capture, path, position, minimumBubbleHeight]);
  useEffect(() => {
    if (!storyId || help || interacting || !placeBuddyBubble(point.current, latest.current.geometry, Math.min(252, corridor.width), minimumBubbleHeight) || !api.store.reactOnce('story:' + storyId)) return;
    capture.read(value => {
      if (!alive.current || api.store.get().path !== path) return;
      point.current = nearestBuddyPosition(value, latest.current.geometry) ?? point.current;
      position.setValue(point.current); setAnchor(point.current); setBubbleHeight(0);
      setReaction({ text: 'You made this? That deserves a tiny backpack-sized applause.', key: 'story:' + storyId });
    });
    const expiry = setTimeout(() => setReaction(null), 7000);
    return () => { clearTimeout(expiry); setReaction(old => old?.key === 'story:' + storyId ? null : old); };
  }, [api, storyId, help, interacting, capture, path, position, corridor.width, minimumBubbleHeight]);
  useEffect(() => {
    const line = buddyContextLine(path);
    if (!line || screen?.travel || help || reaction || interacting || dragging || asleep || pendingCelebration) return;
    let active = true, expiry: ReturnType<typeof setTimeout> | undefined;
    const allowed = () => active && alive.current && api.preference.get().enabled && api.store.get().path === path
      && AppState.currentState === 'active' && !api.store.current().suppressed && !api.store.current().interacting
      && !api.store.current().state?.travel && !api.store.getCelebration() && !api.store.getMapHelp() && api.store.getTour() === null;
    const timer = setTimeout(() => {
      if (!allowed()) return;
      capture.read(value => {
        if (!allowed()) return;
        const safe = nearestBuddyPosition(value, geometry);
        if (!safe || !placeBuddyBubble(safe, geometry, Math.min(252, corridor.width), minimumBubbleHeight)
          || !claimBuddyContext(api.store, path)) return;
        point.current = safe; position.setValue(safe); setWalking(false); setAnchor(safe); setBubbleHeight(0);
        setContextual(line);
        expiry = setTimeout(() => { if (active && alive.current) setContextual(null); }, BUDDY_CONTEXT_DURATION);
      });
    }, BUDDY_CONTEXT_DELAY);
    return () => { active = false; clearTimeout(timer); clearTimeout(expiry); if (alive.current) setContextual(null); };
  }, [api, path, screen?.travel, help, reaction, interacting, dragging, asleep, pendingCelebration, capture, geometry, corridor.width, minimumBubbleHeight, position]);
  const openHelp = () => {
    if (!alive.current || !api.preference.get().enabled || path !== api.store.get().path || api.store.current().suppressed || AppState.currentState !== 'active') return;
    if (api.store.current().state?.travel?.guidance || api.store.current().state?.travel?.arrival) return;
    if (wakeGesture.current) { wakeGesture.current = false; return; }
    if (wakeBuddy()) return;
    // Opening help must not wait for the asynchronous native position reply.
    setAnchor(nearestBuddyPosition(point.current, latest.current.geometry) ?? point.current);
    capture.read(value => { if (alive.current) { point.current = nearestBuddyPosition(value, latest.current.geometry) ?? point.current; position.setValue(point.current); setAnchor(point.current); } });
    api.store.clearCelebration(); stopTravelBurst(); setWalking(false); setReaction(null); setContextual(null);
    // A same-sized native bubble needn't emit onLayout twice. Keep its last
    // measured height; a bounded fallback covers missing first measurements.
    setHelpMeasurementFailed(false); setHelp({ owner: api.store.actionOwner() });
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
      wakeGesture.current = wakeBuddy();
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
      if (!dragged.current) {
        // A tap has no drag delta to resolve. Late/obsolete native captures must
        // not keep dragging=true or prevent the requested message from opening.
        gesture.generation++; gesture.active = false; setDragging(false); open.current(); return;
      }
      if (!gesture.ready) return;
      gesture.active = false; setDragging(false);
      if (dragged.current) { wakeGesture.current = false; setParked(true); } else open.current();
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => { wakeGesture.current = false; gestureState.current.generation++; gestureState.current.active = false; capture.cancel(); if (alive.current) { setDragging(false); setParked(true); } },
  }), [position, shouldStart, api, path, capture, poseOwner, stopTravelBurst, wakeBuddy]);
  const navigate = (route: '/discover' | '/search' | '/create' | '/account') => {
    if (!alive.current) return;
    if (!api.preference.get().enabled || path !== api.store.get().path || AppState.currentState !== 'active' || api.store.current().suppressed) { setHelp(null); return; }
    if (route !== path) setHelp(null); router.navigate(route);
  };
  const canAct = () => alive.current && api.preference.get().enabled && path === api.store.get().path && AppState.currentState === 'active' && !api.store.current().suppressed && !api.store.current().state?.travel?.guidance && !api.store.current().state?.travel?.arrival;
  const reactionVisible = reaction && !quiet && (reaction.key.startsWith('story:') ? reaction.key === 'story:' + screen?.ownStory?.id : !!screen?.travel && travelEvent(screen.travel) === reaction.key);
  const contextualVisible = !!contextual && !asleep && !interacting && !help && !reaction && !dragging && !screen?.travel && !pendingCelebration;
  const contextualAnimate = contextualVisible && motionKnown && !reduced && AppState.currentState === 'active';
  // Browsing Home cards pauses positional roaming, not the leaf's gentle idle
  // frame clock. Buddy's own gestures and higher-priority states still stop it.
  const homeIdleAnimate = ['/', '/index', '/discover'].includes(path) && motionKnown && !reduced && !asleep
    && !dragging && !help && !reaction && !contextual && !pendingCelebration && !screen?.travel
    && api.store.get().path === path && !api.store.current().suppressed && AppState.currentState === 'active';
  const bubbleWidth = Math.min(252, corridor.width);
  const bubbleActive = !!(help || reactionVisible || contextualVisible) && !quiet;
  const manualHelp = !!help;
  const bubbleFit = useMemo(() => {
    if (!bubbleActive) return { maxHeight: minimumBubbleHeight, fits: false, aboveOnly: false };
    const heights = [...new Set([Math.max(320, minimumBubbleHeight), 280, 240, 200, 160, minimumBubbleHeight])].filter(height => height >= minimumBubbleHeight);
    if (manualHelp) {
      const height = heights.find(height => placeBuddyBubble(anchor, geometry, bubbleWidth, height, 'above'));
      return { maxHeight: height ?? minimumBubbleHeight, fits: height !== undefined, aboveOnly: true };
    }
    const height = heights.find(height => placeBuddyBubble(anchor, geometry, bubbleWidth, height));
    return { maxHeight: height ?? minimumBubbleHeight, fits: height !== undefined, aboveOnly: false };
  }, [bubbleActive, manualHelp, anchor, geometry, bubbleWidth, minimumBubbleHeight]);
  const bubbleMaxHeight = bubbleFit.maxHeight;
  const placement = useMemo(() => bubbleActive && bubbleFit.fits && bubbleHeight ? placeBuddyBubble(anchor, geometry, bubbleWidth, Math.min(bubbleHeight, bubbleMaxHeight), bubbleFit.aboveOnly ? 'above' : undefined) : null, [bubbleActive, bubbleFit.fits, bubbleFit.aboveOnly, anchor, geometry, bubbleWidth, bubbleHeight, bubbleMaxHeight]);
  useEffect(() => {
    if (!help && !reactionVisible && !contextualVisible) return;
    if (!bubbleHeight) return;
    if (!placement) return;
    point.current = placement.buddy; position.setValue(placement.buddy);
  }, [help, reactionVisible, contextualVisible, placement, position, bubbleHeight]);
  useEffect(() => {
    if (!help || !bubbleFit.fits || placement || helpMeasurementFailed) return;
    const timer = setTimeout(() => { if (alive.current && api.store.get().path === path) setHelpMeasurementFailed(true); }, 500);
    return () => clearTimeout(timer);
  }, [api, path, help, bubbleFit.fits, placement, helpMeasurementFailed]);
  const manualFallback = !!help && (!bubbleFit.fits || helpMeasurementFailed);
  const closeBubble = () => { setHelp(null); setReaction(null); setContextual(null); api.store.setTour(null); };
  const tour = api.store.getTour();
  const helpPrimary = screen?.resume ? { label: 'Continue editing', onPress: () => { api.store.setTour(null); if (path === '/account' && api.preference.get().enabled) router.push({ pathname: '/create', params: { draft: screen.resume!.id } }); } } : undefined;
  return <>
    <Animated.View pointerEvents="box-none" style={[s.character, { transform: position.getTranslateTransform() }]}>
      <View {...gesture.panHandlers} collapsable={false} pointerEvents="box-only" accessible focusable
        accessibilityRole="button" accessibilityLabel="Journey Buddy" accessibilityHint={asleep ? 'Buddy is sleeping. Double tap to wake Buddy.' : 'Double tap for journey help. Drag to park Buddy.'}
        accessibilityActions={[{ name: 'activate', label: asleep ? 'Wake Buddy' : 'Open journey help' }]} onAccessibilityTap={openHelp}
        onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'activate') openHelp(); }}
        onTouchStart={event => event.stopPropagation()} style={s.touch}>
        <BuddySprite animation={asleep ? 'sleep' : contextualVisible ? contextual.animation : celebration && canAnimate && !quiet ? celebration.animation : (walking || travelWalking) && canAnimate ? 'walk' : 'idle'} animate={canAnimate || contextualAnimate || homeIdleAnimate} facing={facing} />
      </View>
    </Animated.View>
    {(help || reactionVisible || contextualVisible) && !quiet && <BuddyHelpSheet canAddMemory={!!screen?.canAddMemory} travel={screen?.travel}
      fallback={manualFallback} width={manualFallback ? Math.min(320, corridor.width - 32) : bubbleWidth}
      maxHeight={manualFallback ? Math.max(124, corridor.height - 48) : bubbleMaxHeight} onMeasure={height => {
        if (!bubbleFit.fits) {
          if (!help) { setReaction(null); setContextual(null); }
          return;
        }
        setBubbleHeight(old => old === height ? old : height);
      }}
      placement={placement ? { ...placement.rect, above: placement.above, tailX: placement.tailX } : undefined}
      contextualLine={buddyContextLine(path)?.text ?? buddyHelpLine(path)} reaction={contextualVisible ? contextual.text : !help && reactionVisible ? reaction?.text : undefined} tour={help ? tour : null}
      onTour={() => { if (!canAct()) return; if (tour === null) { api.store.setTour(0); } else navigate((['/discover', '/create', '/account'] as const)[tour]); }}
      onNext={() => { if (!canAct()) return; if (tour === 2) closeBubble(); else { api.store.setTour((tour ?? -1) + 1); } }}
      primary={helpPrimary ? { label: helpPrimary.label, onPress: helpPrimary.onPress } : buddyHelpPrimary(path) ? { label: buddyHelpPrimary(path)!.label, onPress: () => { api.store.setTour(null); navigate(buddyHelpPrimary(path)!.route); } } : undefined}
      onClose={closeBubble} onCreate={() => navigate('/create')} onDrafts={() => { api.store.setTour(null); navigate('/account'); }}
      onAddMemory={() => { if (!alive.current || !api.preference.get().enabled || !help) return; const captured = help; setHelp(null); api.store.act(captured.owner, path, 'addMemory'); }} />}
  </>;
}
const s = StyleSheet.create({
  // Raise the global host above native screen/map layers; startup remains above at z100/elevation30.
  host: { zIndex: 30, elevation: 20 },
  character: { position: 'absolute', left: 0, top: 0, width: 64, height: 64, zIndex: 25 }, touch: { width: 64, height: 64 },
});
