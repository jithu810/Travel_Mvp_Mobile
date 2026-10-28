import { memo, useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { buddyReference, resolveBuddyAnimation, spriteFrame, type BuddyAnimationName } from '@/lib/buddy/animations';

// The frame clock belongs only to this leaf; it never updates navigation or the global host.
export const BuddySprite = memo(function BuddySprite({ animation = 'idle', animate, facing = 'left' }: { animation?: BuddyAnimationName; animate: boolean; facing?: 'left' | 'right' }) {
  const clip = resolveBuddyAnimation(animation), [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState(false), [referenceFailed, setReferenceFailed] = useState(false);
  useEffect(() => {
    setFrame(0);
    if (!animate || failed || !clip || clip.frames < 2) return;
    let index = 0;
    const timer = setInterval(() => {
      index = clip.loop ? (index + 1) % clip.frames : Math.min(index + 1, clip.frames - 1); setFrame(index);
      if (!clip.loop && index === clip.frames - 1) clearInterval(timer);
    }, 1000 / clip.fps);
    return () => clearInterval(timer);
  }, [clip, animate, failed]);
  if (referenceFailed) return null;
  if ((!animate && animation !== 'sleep') || failed || !clip) return <Image source={buddyReference} accessible={false} fadeDuration={0} resizeMethod="scale" resizeMode="contain" style={{ width: 64, height: 64 }} onError={() => setReferenceFailed(true)} />;
  // Keep the outer touch canvas and bottom-center anchor unchanged. Jump's
  // original cells are180×189: clip their exact width so no adjacent frame leaks.
  const width = 64 * clip.frameWidth / clip.frameHeight;
  return <View accessible={false} pointerEvents="none" style={{ width, height: 64, alignSelf: 'center', overflow: 'hidden', transform: [{ scaleX: facing === clip.facing ? 1 : -1 }] }}>
    {animation === 'sleep' && <Text accessible={false} style={{ position: 'absolute', top: 0, right: 0, zIndex: 1, color: '#536486', fontSize: 10, fontWeight: '700' }}>Zzz</Text>}
    <Image source={clip.source} accessible={false} fadeDuration={0} resizeMethod="scale" resizeMode="stretch" style={{ position: 'absolute', ...spriteFrame(clip, animate ? frame : 0) }} onError={() => setFailed(true)} />
  </View>;
});
