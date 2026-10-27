import Mapbox from '@rnmapbox/maps';
import { useEffect, useState } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { useMapBuddy } from '@/hooks/use-map-buddy';
import { resolveBuddyAnimation, spriteFrame } from '@/lib/buddy/animations';
import { createTravelPlayback, travelPosition, type TravelLeg } from '@/lib/discovery/travel';

// Brief rest at the final stop before the floating Home Buddy (and its help) returns.
export const HOME_BUDDY_ARRIVAL_REST = 1500;

const idle = resolveBuddyAnimation('idle')!;
const walk = resolveBuddyAnimation('walk')!;

// A live view annotation keeps the original sprite sheet animated on Android.
// A style image/PointAnnotation would flatten the character into one still frame.
export function TravelingBuddy({ legs, onFailure }: { legs: TravelLeg[]; onFailure: () => void }) {
  const [loaded, setLoaded] = useState({ idle: false, walk: false, layout: false });
  const [failed, setFailed] = useState(false);
  const [arrived, setArrived] = useState(false), [released, setReleased] = useState(false);
  const ready = loaded.idle && loaded.walk && loaded.layout && !failed;
  // Ownership ends with the Locate walk so the map never hides the floating Buddy indefinitely.
  const buddy = useMapBuddy(ready && !released);
  const [coordinate, setCoordinate] = useState(legs[0].start);
  const [moving, setMoving] = useState(false);
  const [facing, setFacing] = useState<'left' | 'right'>('left');
  const [frame, setFrame] = useState(0);
  const clip = moving ? walk : idle;
  useEffect(() => {
    if (ready || failed) return;
    const timeout = setTimeout(() => setFailed(true), 5000);
    return () => clearTimeout(timeout);
  }, [ready, failed]);
  useEffect(() => { if (failed) onFailure(); }, [failed, onFailure]);
  useEffect(() => {
    if (!arrived || released) return;
    const timer = setTimeout(() => setReleased(true), HOME_BUDDY_ARRIVAL_REST);
    return () => clearTimeout(timer);
  }, [arrived, released]);
  useEffect(() => {
    if (!buddy.visible) return;
    let index = 0;
    const timer = setInterval(() => { index = (index + 1) % clip.frames; setFrame(index); }, 1000 / clip.fps);
    return () => clearInterval(timer);
  }, [clip, buddy.visible]);
  useEffect(() => {
    if (!buddy.visible) return;
    let active = true, current: TravelLeg | null = null, lastProgress = -1;
    let animation: Animated.CompositeAnimation | null = null;
    const progress = new Animated.Value(0);
    const listener = progress.addListener(({ value }) => {
      if (active && current && (value === 1 || Math.abs(value - lastProgress) * current.duration >= 32)) {
        lastProgress = value; setCoordinate(travelPosition(current, value));
      }
    });
    const playback = createTravelPlayback(legs, (leg, done) => {
      current = leg; lastProgress = -1;
      setCoordinate(leg.start); setFacing(leg.bearing >= 0 ? 'right' : 'left'); setFrame(0); setMoving(true);
      progress.setValue(0);
      animation = Animated.timing(progress, { toValue: 1, duration: leg.duration,
        easing: Easing.linear, useNativeDriver: false, isInteraction: false });
      animation.start(({ finished }) => {
        if (!active) return;
        if (finished) { setCoordinate(leg.target); setFrame(0); setMoving(false); if (leg === legs[legs.length - 1]) setArrived(true); }
        done(finished);
      });
    }, () => { current = null; animation?.stop(); });
    playback.start();
    return () => { active = false; playback.cancel(); progress.removeListener(listener); };
  }, [legs, buddy.visible]);
  if (failed || released) return null;
  return <Mapbox.MarkerView coordinate={coordinate} anchor={{ x: 0.5, y: 1 }} allowOverlap pointerEvents="none">
    <View collapsable={false} accessible={false} pointerEvents="none" onLayout={event => {
      if (event.nativeEvent.layout.width > 0 && event.nativeEvent.layout.height > 0) setLoaded(old => old.layout ? old : { ...old, layout: true });
    }} style={{ width: 64, height: 64, overflow: 'hidden', opacity: buddy.visible ? 1 : 0,
      transform: [{ scaleX: facing === clip.facing ? 1 : -1 }] }}>
      {(['idle', 'walk'] as const).map(name => <Image key={name} accessible={false}
        source={(name === 'walk' ? walk : idle).source} fadeDuration={0} resizeMode="stretch" resizeMethod="scale"
        onLoad={() => setLoaded(old => old[name] ? old : { ...old, [name]: true })} onError={() => setFailed(true)}
        style={{ position: 'absolute', ...spriteFrame(name === 'walk' ? walk : idle, frame), opacity: (moving ? 'walk' : 'idle') === name ? 1 : 0 }} />)}
    </View>
  </Mapbox.MarkerView>;
}
