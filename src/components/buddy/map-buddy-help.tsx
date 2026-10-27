import { useRouter } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, useWindowDimensions } from 'react-native';
import { useBuddyApi } from '@/hooks/use-journey-buddy';
import { BuddyHelpSheet } from './buddy-help-sheet';

export function MapBuddyHelp() {
  const api = useBuddyApi();
  return api ? <MapHelp api={api} /> : null;
}
function MapHelp({ api }: { api: NonNullable<ReturnType<typeof useBuddyApi>> }) {
  useSyncExternalStore(api.store.subscribe, api.store.get, api.store.get);
  const router = useRouter(), window = useWindowDimensions();
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
  return <BuddyHelpSheet fallback width={Math.max(160, Math.min(320, window.width - 48))} maxHeight={Math.max(124, window.height - 100)}
    canAddMemory={!!current.state?.canAddMemory} travel={travel} tour={tour} onClose={close}
    onAddMemory={() => { if (!allowed()) return; api.store.closeMapHelp(); api.store.act(request.owner, request.path, 'addMemory'); }}
    onCreate={() => navigate('/create')} onDrafts={() => { if (!allowed()) return; api.store.setTour(null); navigate('/account'); }}
    onTour={() => { if (!allowed()) return; if (tour === null) api.store.setTour(0); else navigate((['/discover', '/create', '/account'] as const)[tour]); }}
    onNext={() => { if (!allowed()) return; if (tour === 2) close(); else api.store.setTour((tour ?? -1) + 1); }} />;
}
