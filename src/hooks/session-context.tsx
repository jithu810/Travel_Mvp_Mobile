import { createContext, useContext, type ReactNode } from 'react';
import { useSession } from './use-session';
import type { SessionState } from '@/types/session';

const SessionContext = createContext<SessionState>({ session: null, loading: true, error: null });
export function SessionProvider({ children }: { children: ReactNode }) {
  const state = useSession();
  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}
export function useSessionState() { return useContext(SessionContext); }
