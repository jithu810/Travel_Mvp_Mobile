import Mapbox, { AnimatedPoint } from '@rnmapbox/maps';
import { useEffect, useState } from 'react';
import type { JourneyPreview } from '@/lib/journey/preview-playback';

export function StoryPreviewMarker({ preview, buddy }: { preview: JourneyPreview; buddy: boolean }) {
  const initial = preview.getPosition();
  const [position] = useState(() => new AnimatedPoint({ type: 'Point', coordinates: initial?.coordinate ?? [0, 0] }));
  const [bearing, setBearing] = useState(initial?.bearing ?? 0);
  useEffect(() => {
    const update = () => { const current = preview.getPosition(); if (current) { position.setValue({ type: 'Point', coordinates: current.coordinate }); setBearing(current.bearing); } };
    update(); const stop = preview.subscribePosition(update);
    return () => { stop(); position.stopAnimation(undefined); };
  }, [preview, position]);
  if (!initial) return null;
  return <Mapbox.Animated.ShapeSource id="story-preview-traveler" shape={position}>
    <Mapbox.SymbolLayer id="story-preview-traveler-icon" style={buddy ? {
      iconImage: 'journey-map-buddy', iconSize: 0.28, iconAnchor: 'bottom', iconRotationAlignment: 'viewport', iconPitchAlignment: 'viewport',
      iconTranslate: [0, -16], iconTranslateAnchor: 'viewport',
      iconAllowOverlap: true, iconIgnorePlacement: true,
    } : { textField: '✈', textFont: ['Arial Unicode MS Regular'], textSize: 26, textColor: '#18243B', textHaloColor: '#FFFFFF', textHaloWidth: 2, textRotate: bearing - 45, textRotationAlignment: 'map', textAllowOverlap: true, textIgnorePlacement: true }} />
  </Mapbox.Animated.ShapeSource>;
}
