import { memo, useEffect, useState } from 'react';
import { Image, View } from 'react-native';
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
  if (!animate || failed || !clip) return <Image source={buddyReference} accessible={false} fadeDuration={0} resizeMethod="scale" resizeMode="contain" style={{ width: 64, height: 64 }} onError={() => setReferenceFailed(true)} />;
  return <View accessible={false} pointerEvents="none" style={{ width: 64, height: 64, overflow: 'hidden', transform: [{ scaleX: facing === clip.facing ? 1 : -1 }] }}>
    <Image source={clip.source} accessible={false} fadeDuration={0} resizeMethod="scale" resizeMode="stretch" style={{ position: 'absolute', ...spriteFrame(clip, frame) }} onError={() => setFailed(true)} />
  </View>;
});
