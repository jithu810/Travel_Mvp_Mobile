import Mapbox, { type Camera, type MapView } from '@rnmapbox/maps';
import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, ActivityIndicator, AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, usePathname } from 'expo-router';
import { StopArt } from '@/components/art/journey-art';
import { JourneyActionIcon } from '@/components/journey/journey-action-icon';
import { useThumbnailSource } from '@/hooks/use-thumbnail-source';
import { globeAtmosphere, spaceColor } from '@/lib/discovery/presentation';
import {
  initialMemoryMapLoad, memoryCameras, memoryMapFrame, memoryMapStyleBudget, memoryMapTotalBudget, memoryPinsSignature, memoryPlacePress, nextMemoryMapLoad,
  type MemoryPin,
} from '@/lib/profile/memory-map';
import { lightTheme, theme } from '@/theme/mobile-theme';
import { MemoryMapNotice, type MemoryMapViewport } from './memory-map-notice';
import { useMapBuddy } from '@/hooks/use-map-buddy';
import { buddyCameraPoseKey, equivalentBuddyCameraPose } from '@/hooks/use-buddy-map-pins';
import { useBuddyApi } from '@/hooks/use-journey-buddy';
import { createMemoryBuddyTour } from '@/lib/profile/memory-buddy-tour';
import { MemoryBuddyActor, MemoryBuddyBubble, type MemoryBubbleControl, type MemoryJourneyCover } from './memory-buddy-presentation';
import { MemoryPlaceChoices } from './memory-place-choices';

let configuredToken: string | null = null;
export async function configureMemoryMap(token: string) {
  if (configuredToken === token) return;
  await Mapbox.setAccessToken(token);
  configuredToken = token;
}

const pinSize = 44;
const padding = { paddingTop: 64, paddingBottom: 44, paddingLeft: 40, paddingRight: 40 };

// Live view annotation: real accessible button, photo thumbnail first, then the
// existing per-stop art when there is no usable photo (or every variant failed).
const MemoryPinFace = memo(function MemoryPinFace({ pin, onPress }: { pin: MemoryPin; onPress: (key: string) => void }) {
  const { uri, onError } = useThumbnailSource(pin.photo, pin.photoThumbnail);
  return <Pressable accessibilityRole="button" accessibilityLabel={'Select memory: ' + pin.stopName + ', ' + pin.journeyTitle} accessibilityHint="Moves Buddy here and shows the photo. Tap the photo to open the story." hitSlop={4} onPress={() => onPress(pin.key)}
    style={({ pressed }) => [s.pin, pressed && s.pressed]}>
    <View style={s.pinFace} pointerEvents="none">
      {uri ? <Image key={uri} source={{ uri }} accessible={false} style={s.pinImage} resizeMode="cover" fadeDuration={0} onError={() => { onError(); }} />
        : <StopArt seed={pin.art.seed} stops={pin.art.stops} index={pin.stopIndex} variant="mini" />}
    </View>
  </Pressable>;
});

export const NativeMemoryMap = memo(function NativeMemoryMap({ pins, onOpen, retry, initialViewport, deadline, cameraKey, onScreen = true, journeyCovers }: {
  pins: readonly MemoryPin[]; onOpen: (pin: MemoryPin) => void; retry: () => void; initialViewport: MemoryMapViewport; deadline: number; cameraKey: string; onScreen?: boolean; journeyCovers?: readonly MemoryJourneyCover[];
}) {
  const camera = useRef<Camera>(null);
  const map = useRef<MapView>(null), bubble = useRef<MemoryBubbleControl>(null);
  const lastPose = useRef<string | null>(null), lastIdle = useRef<string | null>(null), cameraMoving = useRef(false);
  const focused = useRef(true), visible = useRef(onScreen), choiceResume = useRef(false);
  const choiceKeys = useRef(new Set<string>());
  const choiceEpoch = useRef(0);
  const runtime = useRef({ allowed: false }), initialPins = useRef(pins), currentOwner = useRef(cameraKey);currentOwner.current = cameraKey;
  visible.current = onScreen;
  const api = useBuddyApi(), path = usePathname();
  const tour = useMemo(() => createMemoryBuddyTour(initialPins.current, undefined, () => runtime.current.allowed && currentOwner.current === cameraKey), [cameraKey]);
  const tourMeta = useSyncExternalStore(tour.subscribeMeta, tour.getMeta, tour.getMeta);
  const mounted = useRef(false);
  const foreground = useRef(AppState.currentState === 'active');
  const zoom = useRef(0);
  const fittedFor = useRef<string | null>(null);
  const loadDeadline = useRef(deadline);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  // Starts from the parent's known frame size, so the MapView mounts on the first
  // render and never depends on a layout event arriving after an effect.
  const [viewport, setViewport] = useState<MemoryMapViewport>(initialViewport);
  const [load, dispatch] = useReducer(nextMemoryMapLoad, initialMemoryMapLoad);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [motionKnown, setMotionKnown] = useState(false);
  const [choices, setChoices] = useState<string[]>([]);
  const [chooserId, setChooserId] = useState(0);
  const { style, ready } = load;
  const failed = style === 'failed';
  const live = ready && !failed && appActive && onScreen;
  const mapBuddy = useMapBuddy(live && !choices.length);
  const motion = motionKnown && !reduceMotion && mapBuddy.enabled;
  runtime.current.allowed = live && focused.current && foreground.current && mapBuddy.visible && !mapBuddy.helping && !choices.length;
  const gate = useRef({ live, motion });gate.current = { live, motion };
  useEffect(() => { tour.update(pins); }, [tour, pins]);
  useEffect(() => { tour.configure(live && mapBuddy.visible && !mapBuddy.helping && !choices.length, motion); }, [tour, live, mapBuddy.visible, mapBuddy.helping, choices.length, motion]);
  useEffect(() => () => tour.dispose(), [tour]);
  useEffect(() => {
    const fence = () => {
      if (api && (!api.preference.get().enabled || api.store.get().path !== path || api.store.current().suppressed || api.store.getMapHelp() || api.store.getCelebration() || api.store.getTour() !== null)) {
        tour.configure(false, gate.current.motion);bubble.current?.hide();
      }
    };
    const stopStore = api?.store.subscribe(fence), stopPreference = api?.preference.subscribe(fence);
    return () => { stopStore?.();stopPreference?.(); };
  }, [api, path, tour]);
  const frame = useMemo(() => memoryMapFrame(pins, viewport, padding), [pins, viewport]);
  const placesSignature = useMemo(() => memoryPinsSignature(pins), [pins]);
  const signature = placesSignature + '#' + viewport.width + 'x' + viewport.height;
  // Resume the last camera of this owner's unchanged places (read once per mount).
  const [restored] = useState(() => memoryCameras.get(cameraKey, memoryPinsSignature(pins)));
  const featured = useMemo(() => pins.filter(pin => pin.featured), [pins]);
  const byKey = useMemo(() => new Map(pins.map(pin => [pin.key, pin])), [pins]);
  const points = useMemo(() => ({ type: 'FeatureCollection' as const, features: pins.map(pin => ({
    type: 'Feature' as const, id: pin.key, geometry: { type: 'Point' as const, coordinates: [pin.longitude, pin.latitude] },
    properties: { key: pin.key },
  })) }), [pins]);
  useEffect(() => {
    mounted.current = true;
    const bubbleOwner = bubble.current;
    const subscription = AppState.addEventListener('change', state => {
      if (!mounted.current) return;
      const active = state === 'active';
      // Loading timers pause in the background; a return gets a fresh budget.
      if (active && !foreground.current) loadDeadline.current = Date.now() + memoryMapTotalBudget;
      foreground.current = active;
      if (!active) { tour.configure(false, gate.current.motion);bubble.current?.hide();choiceEpoch.current++;choiceKeys.current.clear();setChoices([]); }
      setAppActive(active);
    });
    return () => { mounted.current = false; tour.configure(false, false);bubbleOwner?.hide();subscription.remove(); };
  }, [tour]);
  useEffect(() => {
    let active = true, changed = false;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active && !changed) { setReduceMotion(value);setMotionKnown(true); } }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true;if (value) tour.configure(false, false);if (active) { setReduceMotion(value);setMotionKnown(true); } });
    return () => { active = false; subscription.remove(); };
  }, [tour]);
  // Independent of frame/style: satellite gets part of the budget, then outdoors, and the
  // notice appears when the whole budget ends. Never an indefinite spinner.
  useEffect(() => {
    if (ready || failed || !appActive) return;
    const now = Date.now();
    const remaining = Math.max(0, loadDeadline.current - now);
    const styleAt = loadDeadline.current - memoryMapTotalBudget + memoryMapStyleBudget;
    const styleTimer = setTimeout(() => dispatch({ type: 'style-timeout' }), Math.max(0, Math.min(remaining, styleAt - now)));
    const deadlineTimer = setTimeout(() => dispatch({ type: 'deadline' }), remaining);
    return () => { clearTimeout(styleTimer); clearTimeout(deadlineTimer); };
  }, [ready, failed, appActive]);
  // The chooser belongs to this visit of the profile.
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false;tour.configure(false, gate.current.motion);bubble.current?.hide();choiceEpoch.current++;choiceKeys.current.clear();setChoices([]); };
  }, [tour]));
  const basePermission = useCallback(() => mounted.current && focused.current && foreground.current && visible.current && gate.current.live
    && (!api || api.store.get().path === path && !api.store.current().suppressed), [api, path]);
  const canSelect = useCallback(() => basePermission() && choiceKeys.current.size === 0, [basePermission]);
  const selectKnown = useCallback((key: string, resume?: boolean) => {
    if (!canSelect() || !byKey.has(key)) return;
    bubble.current?.hide();tour.select(key, resume);bubble.current?.settle();
  }, [canSelect, byKey, tour]);
  const project = useCallback((coordinate: number[]) => canSelect() ? map.current?.getPointInView(coordinate) ?? Promise.resolve(undefined) : Promise.resolve(undefined), [canSelect]);
  const openSelected = useCallback((pin: MemoryPin) => {
    if (canSelect() && (!api || !api.store.current().suppressed) && byKey.has(pin.key)) onOpen(byKey.get(pin.key)!);
  }, [canSelect, api, byKey, onOpen]);
  const move = useCallback((centerCoordinate: number[], zoomLevel: number) => {
    if (!canSelect()) return;
    camera.current?.setCamera({ centerCoordinate, zoomLevel, animationMode: 'easeTo', animationDuration: reduceMotion ? 0 : 450 });
  }, [reduceMotion, canSelect]);
  const fit = useCallback(() => {
    if (!frame || !ready || failed) return;
    move(frame.camera.centerCoordinate, frame.camera.zoomLevel);
  }, [frame, ready, failed, move]);
  // Fit once per pin set/viewport (the first fit uses the measured size); a refresh with
  // unchanged places keeps the traveler's pan, and a restored camera is never refit.
  useEffect(() => {
    if (!ready || !appActive || !frame || fittedFor.current === signature) return;
    const first = fittedFor.current === null;
    fittedFor.current = signature;
    if (first && restored) return;
    camera.current?.setCamera({ ...frame.camera, animationMode: 'easeTo', animationDuration: 0 });
  }, [ready, appActive, frame, signature, restored]);
  const press = useCallback((key: string, hits: readonly string[] = [key]) => {
    if (!canSelect()) return;
    const action = memoryPlacePress(pins, key, hits, zoom.current);
    if (!action) return;
    if (action.kind === 'choose' || hits.length > 1) {
      choiceResume.current = tour.get().playing;tour.configure(false, gate.current.motion);bubble.current?.hide();
      const keys = action.kind === 'choose' ? action.keys : [...new Set(hits)];choiceKeys.current = new Set(keys);choiceEpoch.current++;setChooserId(choiceEpoch.current);setChoices(keys);
    } else selectKnown(key);
  }, [pins, canSelect, selectKnown, tour]);
  const nearby = useMemo(() => choices.flatMap(key => {
    const pin = byKey.get(key);
    return pin ? [pin] : [];
  }), [choices, byKey]);
  if (failed) return <MemoryMapNotice message="The travel map couldn’t load. Published journeys remain available in the Journeys tab." retry={retry} />;
  return <View style={s.viewport} onLayout={event => {
    const { width, height } = event.nativeEvent.layout;
    if (width < 1 || height < 1) return;
    setViewport(previous => previous.width === width && previous.height === height ? previous : { width, height });
  }}>
    {frame && <Mapbox.MapView ref={map} key={style} style={s.map} projection={frame.projection} styleURL={style === 'satellite' ? Mapbox.StyleURL.SatelliteStreet : Mapbox.StyleURL.Outdoors}
      pitchEnabled={false} surfaceView={false} requestDisallowInterceptTouchEvent compassEnabled compassPosition={{ top: 12, right: 12 }} scaleBarEnabled={false} logoEnabled attributionEnabled
      onCameraChanged={state => {
        if (!canSelect()) return;
        zoom.current = state.properties.zoom;
        const pose = buddyCameraPoseKey(state.properties);
        if (!equivalentBuddyCameraPose(lastPose.current, pose)) { lastPose.current = pose;cameraMoving.current = true;bubble.current?.hide(); }
        if (state.gestures.isGestureActive) tour.pause();
      }}
      onMapIdle={state => {
        if (!canSelect()) return;
        zoom.current = state.properties.zoom;
        if (ready) memoryCameras.set(cameraKey, placesSignature, { centerCoordinate: state.properties.center, zoomLevel: state.properties.zoom, heading: state.properties.heading });
        const pose = buddyCameraPoseKey(state.properties);
        if (cameraMoving.current || !equivalentBuddyCameraPose(lastIdle.current, pose)) bubble.current?.settle();
        cameraMoving.current = false;lastIdle.current = pose;lastPose.current = pose;
      }}
      onDidFinishLoadingMap={() => dispatch({ type: 'loaded', style })}
      onMapLoadingError={() => dispatch({ type: 'error', style })}>
      <Mapbox.Atmosphere style={globeAtmosphere} />
      <Mapbox.Camera ref={camera} defaultSettings={restored ? { ...restored, pitch: 0 } : frame.camera} minZoomLevel={0} maxZoomLevel={16} />
      <Mapbox.ShapeSource id="memory-map-places" shape={points} hitbox={{ width: 44, height: 44 }} onPress={event => {
        const hits = event.features.flatMap(feature => typeof feature.properties?.key === 'string' && byKey.has(feature.properties.key) ? [feature.properties.key as string] : []);
        if (hits.length) press(hits[0], hits);
      }}>
        <Mapbox.CircleLayer id="memory-map-place-circles" style={{ circleRadius: 7, circleColor: lightTheme.accent, circleStrokeWidth: 2, circleStrokeColor: '#FFFFFF' }} />
      </Mapbox.ShapeSource>
      {ready && featured.map(pin => <Mapbox.MarkerView key={pin.key} coordinate={[pin.longitude, pin.latitude]} anchor={{ x: 0.5, y: 0.5 }} allowOverlap={false}>
        <MemoryPinFace pin={pin} onPress={selectKnown} />
      </Mapbox.MarkerView>)}
      <MemoryBuddyActor tour={tour} visible={live && mapBuddy.visible && !mapBuddy.helping && !choices.length} animate={motion} />
    </Mapbox.MapView>}
    {!ready && <View style={s.loading} pointerEvents="none" accessibilityLabel="Loading travel map" accessibilityRole="progressbar"><ActivityIndicator color={theme.accent} /><Text style={s.note}>Loading map…</Text></View>}
    <Pressable accessibilityRole="button" accessibilityLabel="Fit all travel memories" accessibilityState={{ disabled: !ready || !frame }} disabled={!ready || !frame} onPress={fit} style={s.fit}>
      <JourneyActionIcon name="fit" color="#243E68" />
    </Pressable>
    {live && <View style={s.tourControls}>
      {mapBuddy.enabled && motionKnown && !reduceMotion && <Pressable accessibilityRole="button" accessibilityLabel={tourMeta.playing ? 'Pause memory tour' : 'Resume memory tour'} onPress={() => { if (canSelect()) { if (tour.get().playing) tour.pause();else tour.resume(); } }} style={s.tourControl}><Text style={s.controlText}>{tourMeta.playing ? 'Pause' : 'Play'}</Text></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="Next shared memory" onPress={() => { if (canSelect()) { bubble.current?.hide();tour.next();bubble.current?.settle(); } }} style={s.tourControl}><Text style={s.controlText}>Next</Text></Pressable>
    </View>}
    <MemoryBuddyBubble ref={bubble} tour={tour} pins={pins} covers={journeyCovers} viewport={viewport} owner={cameraKey} membership={placesSignature}
      active={live && !mapBuddy.helping && !choices.length && (!api || !api.store.current().suppressed)} project={project} onOpen={openSelected} />
    {nearby.length > 1 && <MemoryPlaceChoices key={chooserId + ':' + choices.join('|')} pins={nearby} onClose={() => {
      if (chooserId !== choiceEpoch.current) return;
      choiceEpoch.current++;choiceKeys.current.clear();setChoices([]);
    }} onSelect={key => {
      if (chooserId !== choiceEpoch.current || !basePermission() || !choiceKeys.current.has(key)) return;
      choiceEpoch.current++;choiceKeys.current.clear();setChoices([]);selectKnown(key, choiceResume.current);
    }} />}
  </View>;
});

const s = StyleSheet.create({
  viewport: { flex: 1, position: 'relative' }, map: { flex: 1, backgroundColor: spaceColor },
  loading: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: spaceColor, alignItems: 'center', justifyContent: 'center', gap: 10 },
  note: { color: theme.muted, fontSize: 12, lineHeight: 19 },
  fit: { position: 'absolute', top: 12, left: 12, width: 48, minHeight: 48, borderRadius: 22, paddingHorizontal: 10, justifyContent: 'center', backgroundColor: lightTheme.surface },
  tourControls: { position: 'absolute', right: 8, bottom: 36, flexDirection: 'row', gap: 4 },
  tourControl: { minWidth: 48, minHeight: 48, paddingHorizontal: 8, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  controlText: { color: theme.text, fontSize: 11, fontWeight: '600' },
  pin: { width: pinSize, height: pinSize, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
  pinFace: { width: pinSize, height: pinSize, borderRadius: pinSize / 2, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: lightTheme.text, overflow: 'hidden' },
  pinImage: { width: '100%', height: '100%' },
});
