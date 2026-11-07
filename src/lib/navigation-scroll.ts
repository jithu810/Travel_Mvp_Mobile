export type NavigationScrollState = { offset: number; anchor: number; direction: -1 | 0 | 1; compact: boolean };
export const initialNavigationScroll = (): NavigationScrollState => ({ offset: 0, anchor: 0, direction: 0, compact: false });
// Ignore bounce and collect deliberate travel in one direction, rather than toggling on every event.
export function nextNavigationScroll(state: NavigationScrollState, rawOffset: number, maxOffset = Infinity): NavigationScrollState {
  if (!Number.isFinite(rawOffset)) return state;
  const offset = Math.max(0, Math.min(rawOffset, maxOffset));
  if (offset <= 8) return initialNavigationScroll();
  const delta = offset - state.offset;
  if (Math.abs(delta) < 0.5) return state;
  const direction = delta > 0 ? 1 : -1;
  const anchor = direction === state.direction ? state.anchor : state.offset;
  const travel = Math.abs(offset - anchor);
  const compact = direction === 1 && offset >= 32 && travel >= 24 ? true : direction === -1 && travel >= 16 ? false : state.compact;
  return { offset, anchor, direction, compact };
}
