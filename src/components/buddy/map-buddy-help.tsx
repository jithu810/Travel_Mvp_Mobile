import { useRouter } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useBuddyApi } from '@/hooks/use-journey-buddy';
import { BuddyHelpSheet } from './buddy-help-sheet';

export function MapBuddyHelp({ origin = { x: 0, y: 0 } }: { origin?: { x: number; y: number } } = {}) {
  const api = useBuddyApi();
  return api ? <MapHelp api={api} origin={origin} /> : null;
}
function MapHelp({ api }: { api: NonNullable<ReturnType<typeof useBuddyApi>>; origin: { x: number; y: number } }) {
  useSyncExternalStore(api.store.subscribe, api.store.get, api.store.get);
  const router = useRouter(), window = useWindowDimensions();
  const [height, setHeight] = useState(160);
  const request = api.store.getMapHelp(), current = api.store.current(), travel = current.state?.travel;
  const allowed = () => !!request && request === api.store.getMapHelp() && request.path === api.store.get().path && api.preference.get().enabled
    && AppState.currentState === 'active' && !api.store.current().suppressed && !api.store.current().state?.travel?.guidance && !api.store.current().state?.travel?.arrival;
  const visible = !!request && !current.suppressed && !travel?.guidance && !travel?.arrival;
  useEffect(() => { if (request && !visible && request === api.store.getMapHelp()) api.store.closeMapHelp(); }, [api, request, visible]);
  if (!request || !visible) return null;
  const tour = api.store.getTour();
  const close = () => {
    if (request !== api.store.getMapHelp() || request.path !== api.store.get().path) return;
    api.store.closeMapHelp(); api.store.setTour(null);
  };
  const navigate = (route: '/discover' | '/create' | '/account') => { if (!allowed()) return; api.store.closeMapHelp(); router.navigate(route); };
  const width = Math.max(160, Math.min(320, window.width - 48));
  const anchor = request.anchor;
  const left = anchor ? Math.max(24, Math.min(window.width - width - 24, anchor.x - width / 2)) : 24;
  const above = !!anchor && anchor.y > height + 72;
  const top = anchor ? Math.max(48, Math.min(window.height - height - 48, above ? anchor.y - height - 28 : anchor.y + 28)) : 48;
  const bubble = <BuddyHelpSheet fallback={!anchor} placement={anchor ? { x: left, y: top, above, tailX: Math.max(18, Math.min(width - 18, anchor.x - left)) } : undefined} onMeasure={setHeight} width={width} maxHeight={Math.max(124, window.height - 100)}
    canAddMemory={!!current.state?.canAddMemory} travel={travel} tour={tour} onClose={close}
    onAddMemory={() => { if (!allowed()) return; api.store.closeMapHelp(); api.store.act(request.owner, request.path, 'addMemory'); }}
    onCreate={() => navigate('/create')} onDrafts={() => { if (!allowed()) return; api.store.setTour(null); navigate('/account'); }}
    onTour={() => { if (!allowed()) return; if (tour === null) api.store.setTour(0); else navigate((['/discover', '/create', '/account'] as const)[tour]); }}
    onNext={() => { if (!allowed()) return; if (tour === 2) close(); else api.store.setTour((tour ?? -1) + 1); }} />;
  // Expanded maps are native full-screen modals. Present anchored messages in a
  // transparent native layer above them; page coordinates already span that
  // window, so the root host's measured origin must not be subtracted here.
  if (!anchor) return bubble;
  return <Modal transparent visible animationType="none" presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" accessibilityViewIsModal>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close Journey Buddy messages" onPress={close} />
      {bubble}
    </View>
  </Modal>;
}
