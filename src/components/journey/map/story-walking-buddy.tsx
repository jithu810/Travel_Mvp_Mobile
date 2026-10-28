import Mapbox from '@rnmapbox/maps';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Image, View } from 'react-native';
import { useMapBuddy } from '@/hooks/use-map-buddy';
import { resolveBuddyAnimation, spriteFrame } from '@/lib/buddy/animations';
import type { StoryBuddyPlayback } from '@/lib/journey/story-buddy-playback';

const idle = resolveBuddyAnimation('idle')!;
export function StoryWalkingBuddy({ playback, active, reducedMotion, size, motionKnown = true, motion = 'walk' }: { playback: StoryBuddyPlayback; active: boolean; reducedMotion: boolean; size: number; motionKnown?: boolean; motion?: 'walk' | 'run' }) {
  const moving = resolveBuddyAnimation(motion)!;
  const position = useSyncExternalStore(playback.subscribe, playback.get, playback.get);
  const [decoded, setDecoded] = useState({ idle: false, moving: null as typeof moving | null, layout: false });
  const [failed, setFailed] = useState(false);
  const ready = decoded.idle && decoded.moving === moving && decoded.layout && !failed;
  const buddy = useMapBuddy(active && motionKnown && ready && !!position.coordinate);
  const clip = position.moving ? moving : idle;
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
      {([idle, moving] as const).map(sheet => <Image key={sheet === idle ? 'idle' : motion} source={sheet.source} accessible={false}
        fadeDuration={0} resizeMode="stretch" resizeMethod="scale" onLoad={() => setDecoded(old => sheet === idle ? old.idle ? old : { ...old, idle: true } : old.moving === sheet ? old : { ...old, moving: sheet })} onError={() => setFailed(true)}
        style={{ position: 'absolute', ...spriteFrame(sheet, frame, size), opacity: clip === sheet ? 1 : 0 }} />)}
    </View>
  </Mapbox.MarkerView>;
}
