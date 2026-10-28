import Mapbox, { AnimatedPoint, type PointAnnotation } from '@rnmapbox/maps';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import type { DiscoveryPoints } from '@/lib/discovery/map';
import { createTravelPlayback, travelLegs, travelLine, travelPosition, type TravelLeg } from '@/lib/discovery/travel';
import type { Coordinate } from '@/lib/journey/map-data';
import { colors } from '../ui';
import { useThumbnailSource } from '@/hooks/use-thumbnail-source';
import { useBuddyPreference } from '@/hooks/use-journey-buddy';
import { TravelingBuddy } from './traveling-buddy';

const PhotoPin = memo(function PhotoPin({ point, onOpen, selected = false, size = 42 }: { size?: number; selected?: boolean; point: DiscoveryPoints['features'][number]; onOpen: (id: string) => void }) {
  const annotation = useRef<PointAnnotation>(null);
  const { uri, onError } = useThumbnailSource(point.properties.photo, point.properties.photoThumbnail);
  useEffect(() => { annotation.current?.refresh(); }, [selected, uri, size]);
  return <Mapbox.PointAnnotation ref={annotation} id={'photo-' + point.id} coordinate={point.geometry.coordinates}
    onSelected={() => onOpen(point.properties.journeyId)}>
    <View collapsable={false} style={[s.photoRing, { width: size, height: size, borderRadius: size / 2, borderWidth: size < 42 ? 2 : 3 }, selected && { borderColor: '#63D4EF' }]}>
      <Image key={uri || 'default'} accessibilityLabel={uri ? 'Photo at ' + point.properties.name : 'Default travel photo at ' + point.properties.name}
        source={uri ? { uri } : require('../../../../assets/images/journey-photo-fallback.png')} style={[s.photo, { width: size - (size < 42 ? 4 : 6), height: size - (size < 42 ? 4 : 6), borderRadius: size / 2 }]}
        resizeMode="cover" fadeDuration={0} onLoad={() => annotation.current?.refresh()} onError={() => { if (uri) onError(); }} />
    </View>
  </Mapbox.PointAnnotation>;
});
function TravelingPlane({ legs }: { legs: TravelLeg[] }) {
  const [position] = useState(() => new AnimatedPoint({ type: 'Point', coordinates: legs[0].start }));
  const [bearing, setBearing] = useState(legs[0].bearing);
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    const progress = new Animated.Value(0);
    let current: TravelLeg | null = null;
    const listener = progress.addListener(({ value }) => {
      if (current) position.setValue({ type: 'Point', coordinates: travelPosition(current, value) });
    });
    const playback = createTravelPlayback(legs, (leg, done) => {
      current = leg; progress.setValue(0);
      position.setValue({ type: 'Point', coordinates: leg.start }); setBearing(leg.bearing);
      animation = Animated.timing(progress, { toValue: 1, duration: leg.duration,
        easing: Easing.linear, useNativeDriver: false, isInteraction: false });
      animation.start(({ finished }) => done(finished));
    }, () => { current = null; animation?.stop(); position.stopAnimation(undefined); });
    playback.start(); return () => { playback.cancel(); progress.removeListener(listener); };
  }, [legs, position]);
  return <Mapbox.Animated.ShapeSource id="discovery-travel-plane" shape={position}>
    <Mapbox.SymbolLayer id="discovery-travel-plane-icon" style={{ textField: '✈', textFont: ['Arial Unicode MS Regular'],
      textSize: 26, textColor: colors.ink, textHaloColor: '#FFFFFF', textHaloWidth: 2,
      textRotate: bearing - 45, textRotationAlignment: 'map', textAllowOverlap: true, textIgnorePlacement: true }} />
  </Mapbox.Animated.ShapeSource>;
}
function HomeTraveler({ legs }: { legs: TravelLeg[] }) {
  const preference = useBuddyPreference();
  const [failed, setFailed] = useState(false);
  return preference.loaded && preference.enabled && !failed
    ? <TravelingBuddy legs={legs} onFailure={() => setFailed(true)} /> : <TravelingPlane legs={legs} />;
}
export function JourneyOverlays({ points, route, onOpen, playing, playbackKey, drawRoute = true, durationScale = 1, selectedId, onPointOpen, walkingBuddy = false, photoPinSize = 42 }: {
  points: DiscoveryPoints; route: Coordinate[][]; onOpen: (id: string) => void; playing: boolean; playbackKey: string; drawRoute?: boolean; durationScale?: number; selectedId?: string | null; onPointOpen?: (id: string) => void; walkingBuddy?: boolean; photoPinSize?: number;
}) {
  const legs = useMemo(() => travelLegs(route).map(leg => ({ ...leg, duration: leg.duration * durationScale })), [route, durationScale]);
  const line = useMemo(() => travelLine(route, legs), [route, legs]);
  const hasLegs = line.geometry.coordinates.length > 0;
  return <>
    {hasLegs && drawRoute && <Mapbox.ShapeSource id="discovery-travel-line" shape={line}>
      <Mapbox.LineLayer id="discovery-travel-line-halo" belowLayerID="discovery-pins"
        style={{ lineColor: '#FFFFFF', lineWidth: 5, lineOpacity: 0.65, lineCap: 'round', lineJoin: 'round' }} />
      <Mapbox.LineLayer id="discovery-travel-line-color" belowLayerID="discovery-pins"
        style={{ lineColor: '#4A9D7C', lineWidth: 2.5, lineOpacity: 0.9, lineDasharray: [2, 2], lineCap: 'round' }} />
    </Mapbox.ShapeSource>}
    {points.features.filter(point => point.properties.photo || point.properties.photoThumbnail).map(point => <PhotoPin key={point.id}
      point={point} size={photoPinSize} onOpen={onPointOpen ? () => onPointOpen(String(point.id)) : onOpen} selected={selectedId === point.id} />)}
    {hasLegs && playing && (walkingBuddy ? <HomeTraveler key={playbackKey} legs={legs} /> : <TravelingPlane key={playbackKey} legs={legs} />)}
  </>;
}
const s = StyleSheet.create({
  photoRing: { width: 42, height: 42, borderRadius: 21, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: colors.ink,
    overflow: 'hidden' },
  photo: { width: 36, height: 36, borderRadius: 18 },
});
