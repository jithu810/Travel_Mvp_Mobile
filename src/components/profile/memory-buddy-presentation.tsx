import Mapbox from '@rnmapbox/maps';
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BuddySprite } from '@/components/buddy/buddy-sprite';
import { StopArt } from '@/components/art/journey-art';
import type { MemoryPin } from '@/lib/profile/memory-map';
import type { MemoryBuddyTour } from '@/lib/profile/memory-buddy-tour';
import { theme } from '@/theme/mobile-theme';

export type MemoryJourneyCover = { id: string; cover: string | null; coverThumbnail?: string | null };
export type MemoryBubbleControl = { hide: () => void; settle: () => void };
type Viewport = { width: number; height: number };
const https = (value: string | null | undefined) => typeof value === 'string' && value.startsWith('https://') ? value : null;

// Only this leaf receives coordinate ticks. The map, pins, profile and nav do not.
export function MemoryBuddyActor({ tour, visible, animate }: { tour: MemoryBuddyTour; visible: boolean; animate: boolean }) {
  const position = useSyncExternalStore(tour.subscribe, tour.get, tour.get);
  if (!visible || !position.coordinate) return null;
  return <Mapbox.MarkerView coordinate={position.coordinate} anchor={{ x: 0.5, y: 1 }} allowOverlap>
    <View pointerEvents="none" collapsable={false} style={s.actor}><View style={s.sprite}>
      <BuddySprite animation={position.animation} animate={animate} facing={position.facing} />
    </View></View>
  </Mapbox.MarkerView>;
}

export const MemoryBuddyBubble = forwardRef<MemoryBubbleControl, {
  tour: MemoryBuddyTour; pins: readonly MemoryPin[]; covers?: readonly MemoryJourneyCover[]; viewport: Viewport; owner: string; membership: string;
  active: boolean; project: (coordinate: number[]) => Promise<number[] | undefined>; onOpen: (pin: MemoryPin) => void;
}>(function MemoryBuddyBubble({ tour, pins, covers, viewport, owner, membership, active, project, onOpen }, ref) {
  const meta = useSyncExternalStore(tour.subscribeMeta, tour.getMeta, tour.getMeta);
  const selected = pins.find(pin => pin.key === meta.key);
  const [projection, setProjection] = useState<{ request: object; epoch: number; x: number; y: number } | null>(null);
  const [revision, setRevision] = useState(0), [bubbleHeight, setBubbleHeight] = useState(82);
  const request = useMemo(() => ({ active, owner, membership, key: meta.key, bubble: meta.bubble, selected, width: viewport.width, height: viewport.height, revision }), [active, owner, membership, meta.key, meta.bubble, selected, viewport.width, viewport.height, revision]);
  const generation = useRef(0), allowed = useRef(active), latest = useRef(request);
  useLayoutEffect(() => {
    allowed.current = active;latest.current = request;
    return () => { allowed.current = false; };
  }, [active, request]);
  useImperativeHandle(ref, () => ({
    hide() { generation.current++;setProjection(null); },
    settle() { generation.current++;setProjection(null);setRevision(value => value + 1); },
  }), []);
  useEffect(() => {
    const epoch = generation.current;
    if (!active || !selected || !meta.bubble || viewport.width < 1 || viewport.height < 1) return;
    let alive = true;
    const timeout = setTimeout(() => { alive = false; }, 1500);
    project([selected.longitude, selected.latitude]).then(point => {
      if (!alive || epoch !== generation.current || !allowed.current || !point || point.length < 2 || !point.every(Number.isFinite)
        || point[0] < 0 || point[1] < 0 || point[0] > viewport.width || point[1] > viewport.height - 32
        || latest.current !== request) return;
      setProjection({ request, epoch, x: point[0], y: point[1] });
    }).catch(() => {}).finally(() => clearTimeout(timeout));
    return () => { alive = false;clearTimeout(timeout); };
  }, [active, selected, meta.bubble, viewport.width, viewport.height, project, request]);
  if (!active || !meta.bubble || !selected || !projection || projection.request !== request) return null;
  const width = Math.min(132, Math.max(80, viewport.width - 16));
  const x = Math.max(8, Math.min(viewport.width - width - 8, projection.x - width / 2));
  const above = projection.y - 44 - bubbleHeight;
  const maxY = Math.max(4, viewport.height - 88 - bubbleHeight);
  const y = Math.max(4, Math.min(maxY, above >= 4 ? above : projection.y + 8));
  const cover = covers?.find(cover => cover.id === selected.journeyId);
  return <View style={[s.bubblePosition, { left: x, top: y, width }]} onLayout={event => { const height = event.nativeEvent.layout.height;if (height > 0) setBubbleHeight(value => value === height ? value : height); }}>
    <MemoryBubbleFace key={owner + ':' + selected.key} pin={selected} cover={cover} compact={viewport.height < 240} onOpen={() => { if (allowed.current && generation.current === projection.epoch && latest.current === request) onOpen(selected); }} />
  </View>;
});

function MemoryBubbleFace({ pin, cover, onOpen, compact }: { pin: MemoryPin; cover?: MemoryJourneyCover; onOpen: () => void; compact: boolean }) {
  const [failed, setFailed] = useState<readonly string[]>([]);
  const uri = [pin.photoThumbnail, pin.photo, cover?.coverThumbnail, cover?.cover].map(https).find(uri => uri && !failed.includes(uri));
  return <Pressable accessibilityRole="button" accessibilityLabel={'Open ' + pin.journeyTitle + ' at stop ' + (pin.stopIndex + 1) + ': ' + pin.stopName} onPress={onOpen} style={s.bubble}>
    <View pointerEvents="none" style={[s.photo, compact && { height: 32 }]}>{uri ? <Image key={uri} source={{ uri }} accessible={false} resizeMode="cover" onError={() => setFailed(values => values.includes(uri) ? values : [...values, uri])} style={s.image} />
      : <StopArt seed={pin.art.seed} stops={pin.art.stops} index={pin.stopIndex} variant="mini" />}</View>
    <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={s.place}>{pin.stopName}</Text>
  </Pressable>;
}
const s = StyleSheet.create({
  actor: { width: 40, height: 40 }, sprite: { position: 'absolute', width: 64, height: 64, top: -12, left: -12, transform: [{ scale: 0.625 }] },
  bubblePosition: { position: 'absolute', zIndex: 5 }, bubble: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.accent, backgroundColor: theme.surface, minHeight: 48 },
  photo: { height: 52, overflow: 'hidden' }, image: { width: '100%', height: '100%' }, place: { color: theme.text, fontSize: 10, lineHeight: 14, paddingHorizontal: 6, paddingVertical: 4 },
});
