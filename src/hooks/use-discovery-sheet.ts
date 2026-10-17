import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';
import { draggedSheetHeight, sheetHeight, sheetSnapMode, shouldDragSheet, type SheetMode, type SheetSizes } from '@/lib/discovery/sheet';

export function useDiscoverySheet(availableHeight: number, onHeight: (height: number) => void, onInteraction: (active: boolean) => void, sizes?: SheetSizes) {
  const peek = sizes?.peek, collapsed = sizes?.collapsed, full = sizes?.expanded;
  const bounds = useMemo(() => peek !== undefined && collapsed !== undefined && full !== undefined ? { peek, collapsed, expanded: full } : undefined, [peek, collapsed, full]);
  const [expanded, setExpanded] = useState(false);
  const [height] = useState(() => new Animated.Value(0));
  const current = useRef(0), start = useRef(0), offset = useRef(0), startOffset = useRef(0);
  const moving = useRef(false), version = useRef(0), mode = useRef<SheetMode>('collapsed');
  const requestedMode = useRef<SheetMode>('collapsed');
  // Commit new measurements without replacing an in-flight gesture's frame.
  const latest = useRef({ availableHeight, bounds, onHeight, onInteraction });
  const dragFrame = useRef({ availableHeight, bounds });
  const cancelAnimation = useCallback(() => { version.current++; height.stopAnimation(); }, [height]);
  const settle = useCallback((next: SheetMode) => {
    const revision = ++version.current;
    requestedMode.current = next;
    height.stopAnimation(); moving.current = true; latest.current.onInteraction(true);
    const animate = () => {
      const config = latest.current;
      const target = sheetHeight(config.availableHeight, next, config.bounds);
      Animated.spring(height, { toValue: target, stiffness: 240, damping: 30, mass: 1,
        overshootClamping: true, useNativeDriver: false, isInteraction: false }).start(({ finished }) => {
        if (!finished || revision !== version.current) return;
        const updated = latest.current;
        // Measurements arriving during a spring are applied smoothly, keeping
        // the requested mode instead of reverting to the previous settled mode.
        if (sheetHeight(updated.availableHeight, next, updated.bounds) !== target) { animate(); return; }
        moving.current = false; mode.current = next; setExpanded(next === 'expanded');
        updated.onHeight(target); updated.onInteraction(false);
      });
    };
    animate();
  }, [height]);
  useEffect(() => {
    const listener = height.addListener(({ value }) => { current.current = value; });
    return () => height.removeListener(listener);
  }, [height]);
  useEffect(() => {
    latest.current = { availableHeight, bounds, onHeight, onInteraction };
    // Late card/header/keyboard measurements must not cancel a drag or spring.
    // A drag retains its original frame; release settles against latest bounds.
    if (moving.current) return;
    version.current++; height.stopAnimation(); moving.current = false;
    requestedMode.current = mode.current;
    const target = sheetHeight(availableHeight, mode.current, bounds);
    current.current = target; height.setValue(target); onHeight(target); onInteraction(false);
  }, [availableHeight, bounds, height, onHeight, onInteraction]);
  // Cancel only on unmount, not on every measurement/callback change.
  useEffect(() => cancelAnimation, [cancelAnimation]);
  // PanResponder.create registers these handlers; it does not execute them.
  // Ref reads below occur only on native touch events, never during render.
  /* eslint-disable react-hooks/refs */
  const responders = useMemo(() => {
    const callbacks = {
      onStartShouldSetPanResponderCapture: () => { startOffset.current = offset.current; return false; },
      onPanResponderGrant: () => {
        version.current++; height.stopAnimation(); start.current = current.current;
        dragFrame.current = latest.current;
        moving.current = true; latest.current.onInteraction(true);
      },
      onPanResponderMove: (_, gesture) => height.setValue(draggedSheetHeight(start.current, gesture.dy, dragFrame.current.availableHeight, dragFrame.current.bounds)),
      onPanResponderRelease: (_, gesture) => {
        // A deliberate upward swipe opens the list even when released slowly
        // before the midpoint. Use finger travel, not clamped sheet height:
        // short screens can have equal collapsed/expanded heights but still
        // need to switch from the horizontal cards to the vertical list.
        const opensList = mode.current !== 'expanded' && gesture.dy <= -32;
        settle(opensList ? 'expanded' : sheetSnapMode(current.current, gesture.vy, dragFrame.current.availableHeight, dragFrame.current.bounds));
      },
      onPanResponderTerminate: () => settle(sheetSnapMode(current.current, 0, dragFrame.current.availableHeight, dragFrame.current.bounds)),
      onPanResponderTerminationRequest: () => false,
    } satisfies Parameters<typeof PanResponder.create>[0];
    return {
      handle: PanResponder.create({ ...callbacks, onMoveShouldSetPanResponderCapture: (_, gesture) =>
        shouldDragSheet(gesture.dx, gesture.dy, gesture.numberActiveTouches, mode.current === 'expanded', startOffset.current, offset.current, true) }).panHandlers,
      content: PanResponder.create({ ...callbacks, onMoveShouldSetPanResponderCapture: (_, gesture) =>
        shouldDragSheet(gesture.dx, gesture.dy, gesture.numberActiveTouches, mode.current === 'expanded', startOffset.current, offset.current) }).panHandlers,
    };
  }, [height, settle]);
  /* eslint-enable react-hooks/refs */
  const setScrollOffset = useCallback((value: number) => { offset.current = value; }, []);
  return { height, expanded, responders, offset, setScrollOffset,
    toggle: () => settle(requestedMode.current === 'collapsed' ? 'expanded' : 'collapsed'),
    touchStart: () => latest.current.onInteraction(true),
    touchEnd: () => { if (!moving.current) latest.current.onInteraction(false); },
  };
}
