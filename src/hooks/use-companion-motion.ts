import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Animated } from 'react-native';
import { companionFloatBounds, companionGreetingHeight, createCompanionMotion, type FloatPosition } from '@/lib/companion/motion';
import type { CompanionViewport } from '@/lib/companion/model';

type Options = { occupiedHeight: number; reduceMotion: boolean; paused: boolean; registerStop: (stop: () => void) => () => void };
export function useCompanionMotion(viewport: CompanionViewport, { occupiedHeight, reduceMotion, paused, registerStop: registerLifecycleStop }: Options) {
  const [controller] = useState(createCompanionMotion);
  const [translation] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const bounds = companionFloatBounds(viewport, occupiedHeight);
  const left = bounds?.left ?? 0, down = bounds?.down ?? 0;
  const fits = bounds !== null;
  const write = useCallback((before: FloatPosition, after: FloatPosition) => {
    if (before !== after) translation.setValue(after);
  }, [translation]);
  useLayoutEffect(() => {
    const before = controller.get();
    write(before, controller.configure(fits ? { left, down } : null));
  }, [controller, write, fits, left, down]);
  useLayoutEffect(() => { if (paused || reduceMotion) controller.pause(); }, [controller, paused, reduceMotion]);
  useEffect(() => () => { controller.pause(); translation.stopAnimation(); }, [controller, translation]);
  const onMotionFrame = useCallback((seconds: number) => {
    const before = controller.get();
    write(before, controller.frame(seconds, !paused && !reduceMotion));
  }, [controller, write, paused, reduceMotion]);
  const registerStop = useCallback((stop: () => void) => registerLifecycleStop(() => { controller.pause(); stop(); }), [controller, registerLifecycleStop]);
  return { fits, greetingHeight: companionGreetingHeight(viewport, bounds), onMotionFrame, registerStop, style: { transform: translation.getTranslateTransform() } };
}
