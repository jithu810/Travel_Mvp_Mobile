import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { createIntentStore } from '@/lib/auth/intent';

type Store = ReturnType<typeof createIntentStore>;
const IntentContext = createContext<Store | null>(null);
export function ActionIntentProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => createIntentStore(), []);
  return <IntentContext.Provider value={store}>{children}</IntentContext.Provider>;
}
export function useActionIntent() {
  const store = useContext(IntentContext);
  if (!store) throw new Error('Action intent context unavailable.');
  const pending = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { pending, begin: store.begin, consume: store.consume, cancel: store.cancel };
}
