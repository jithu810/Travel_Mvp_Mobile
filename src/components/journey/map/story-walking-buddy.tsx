import Mapbox from '@rnmapbox/maps';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Image, View } from 'react-native';
import { useMapBuddy } from '@/hooks/use-map-buddy';
import { resolveBuddyAnimation, spriteFrame } from '@/lib/buddy/animations';
import type { StoryBuddyPlayback } from '@/lib/journey/story-buddy-playback';

const idle = resolveBuddyAnimation('idle')!, walk = resolveBuddyAnimation('walk')!;
export function StoryWalkingBuddy({ playback, active, reducedMotion, size, motionKnown = true }: { playback: StoryBuddyPlayback; active: boolean; reducedMotion: boolean; size: number; motionKnown?: boolean }) {
  const position = useSyncExternalStore(playback.subscribe, playback.get, playback.get);
  const [decoded, setDecoded] = useState({ idle: false, walk: false, layout: false });
  const [failed, setFailed] = useState(false);
  const ready = decoded.idle && decoded.walk && decoded.layout && !failed;
  const buddy = useMapBuddy(active && motionKnown && ready && !!position.coordinate);
  const clip = position.moving ? walk : idle;
  const [sprite, setSprite] = useState({ clip: idle, frame: 0 });
  const frame = sprite.clip === clip ? sprite.frame : 0;
  useEffect(() => {
    if (ready || failed) return;
    const timer = setTimeout(() => setFailed(true), 5000); return () => clearTimeout(timer);
  }, [ready, failed]);
  useEffect(() => {
    // A freshly expanded map starts with an unknown accessibility preference.
    // Its conservative placeholder must not snap away retained walk progress.
    if (!motionKnown) { playback.pause(); return; }
    playback.configure(buddy.visible, reducedMotion);
    return () => playback.pause();
  }, [playback, buddy.visible, reducedMotion, motionKnown]);
  useEffect(() => {
    if (!buddy.visible || reducedMotion) return;
    let index = 0;
    const timer = setInterval(() => { index = (index + 1) % clip.frames; setSprite({ clip, frame: index }); }, 1000 / clip.fps);
    return () => clearInterval(timer);
  }, [clip, buddy.visible, reducedMotion]);
  if (!position.coordinate || failed) return null;
  return <Mapbox.MarkerView coordinate={position.coordinate} anchor={{ x: 0.5, y: 1 }} allowOverlap pointerEvents="none">
    <View collapsable={false} accessible={false} pointerEvents="none" onLayout={event => {
      if (event.nativeEvent.layout.width > 0 && event.nativeEvent.layout.height > 0) setDecoded(old => old.layout ? old : { ...old, layout: true });
    }} style={{ width: size, height: size, overflow: 'hidden', opacity: buddy.visible ? 1 : 0, transform: [{ scaleX: position.facing === clip.facing ? 1 : -1 }] }}>
      {(['idle', 'walk'] as const).map(name => <Image key={name} source={(name === 'walk' ? walk : idle).source} accessible={false}
        fadeDuration={0} resizeMode="stretch" resizeMethod="scale" onLoad={() => setDecoded(old => old[name] ? old : { ...old, [name]: true })} onError={() => setFailed(true)}
        style={{ position: 'absolute', ...spriteFrame(name === 'walk' ? walk : idle, frame, size), opacity: (position.moving ? 'walk' : 'idle') === name ? 1 : 0 }} />)}
    </View>
  </Mapbox.MarkerView>;
}
