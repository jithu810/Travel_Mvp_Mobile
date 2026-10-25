const noop = () => {};
export const buddyGeometryStub = {
  useBuddyProtectedBounds: () => ({ onLayout: noop }),
  useBuddyScroll: () => ({ onScroll: noop, onScrollBeginDrag: noop, onScrollEndDrag: noop, onMomentumScrollBegin: noop, onMomentumScrollEnd: noop }),
};
export const buddyMapPinsStub = { useBuddyMapPins: () => ({ mapRef: noop, setFrame: noop, cameraChanged: noop, idle: noop }) };
