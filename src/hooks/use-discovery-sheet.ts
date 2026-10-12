import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';
import { draggedSheetHeight, sheetHeight, sheetSnapMode, shouldDragSheet, type SheetMode } from '@/lib/discovery/sheet';

export function useDiscoverySheet(availableHeight: number, onHeight: (height: number) => void, onInteraction: (active: boolean) => void) {
  const [expanded, setExpanded] = useState(false);
  const [height] = useState(() => new Animated.Value(0));
  const current = useRef(0), start = useRef(0), offset = useRef(0), startOffset = useRef(0);
  const moving = useRef(false), version = useRef(0), mode = useRef<SheetMode>('collapsed');
  const cancelAnimation = useCallback(() => { version.current++; height.stopAnimation(); }, [height]);
  const settle = useCallback((next: SheetMode) => {
    const revision = ++version.current;
    height.stopAnimation(); moving.current = true; onInteraction(true);
    const target = sheetHeight(availableHeight, next);
    Animated.spring(height, { toValue: target, stiffness: 240, damping: 30, mass: 1,
      overshootClamping: true, useNativeDriver: false, isInteraction: false }).start(({ finished }) => {
      if (!finished || revision !== version.current) return;
      moving.current = false; mode.current = next; setExpanded(next === 'expanded');
      onHeight(target); onInteraction(false);
    });
  }, [availableHeight, height, onHeight, onInteraction]);
  useEffect(() => {
    const listener = height.addListener(({ value }) => { current.current = value; });
    return () => height.removeListener(listener);
  }, [height]);
  useEffect(() => {
    // Orientation/available-area changes cancel an in-progress snap and clamp
    // the established mode. Never publish intermediate animated heights.
    version.current++; height.stopAnimation(); moving.current = false;
    const target = sheetHeight(availableHeight, mode.current);
    current.current = target; height.setValue(target); onHeight(target); onInteraction(false);
    return cancelAnimation;
  }, [availableHeight, height, onHeight, onInteraction, cancelAnimation]);
  // PanResponder.create registers these handlers; it does not execute them.
  // Ref reads below occur only on native touch events, never during render.
  /* eslint-disable react-hooks/refs */
  const responders = useMemo(() => {
    const callbacks = {
      onStartShouldSetPanResponderCapture: () => { startOffset.current = offset.current; return false; },
      onPanResponderGrant: () => {
        version.current++; height.stopAnimation(); start.current = current.current;
        moving.current = true; onInteraction(true);
      },
      onPanResponderMove: (_, gesture) => height.setValue(draggedSheetHeight(start.current, gesture.dy, availableHeight)),
      onPanResponderRelease: (_, gesture) => settle(sheetSnapMode(current.current, gesture.vy, availableHeight)),
      onPanResponderTerminate: () => settle(sheetSnapMode(current.current, 0, availableHeight)),
      onPanResponderTerminationRequest: () => false,
    } satisfies Parameters<typeof PanResponder.create>[0];
    return {
      handle: PanResponder.create({ ...callbacks, onMoveShouldSetPanResponderCapture: (_, gesture) =>
        shouldDragSheet(gesture.dx, gesture.dy, gesture.numberActiveTouches, mode.current === 'expanded', startOffset.current, offset.current, true) }).panHandlers,
      content: PanResponder.create({ ...callbacks, onMoveShouldSetPanResponderCapture: (_, gesture) =>
        shouldDragSheet(gesture.dx, gesture.dy, gesture.numberActiveTouches, mode.current === 'expanded', startOffset.current, offset.current) }).panHandlers,
    };
  }, [availableHeight, height, onInteraction, settle]);
  /* eslint-enable react-hooks/refs */
  return { height, expanded, responders, offset,
    toggle: () => settle(mode.current === 'collapsed' ? 'expanded' : 'collapsed'),
    touchStart: () => onInteraction(true),
    touchEnd: () => { if (!moving.current) onInteraction(false); },
  };
}
