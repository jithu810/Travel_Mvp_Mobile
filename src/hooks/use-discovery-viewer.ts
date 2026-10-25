import { useEffect, useState } from 'react';
import { useSessionState } from './session-context';
import { discoveryViewer } from '@/lib/discovery/model';

// Discovery holds viewer-specific lists while the session restores, but never
// indefinitely: after this limit the viewer is treated as signed out (fail-open).
export const discoveryViewerPendingLimit = 4000;

export function useDiscoveryViewer() {
  const auth = useSessionState();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!auth.loading) return;
    const timer = setTimeout(() => setTimedOut(true), discoveryViewerPendingLimit);
    return () => clearTimeout(timer);
  }, [auth.loading]);
  // timedOut only matters while loading; a restored session always wins.
  return discoveryViewer(auth, timedOut);
}
