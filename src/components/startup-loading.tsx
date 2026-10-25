import { useEffect, useState } from 'react';
import { useSessionState } from '@/hooks/session-context';
import { BrandedLoading } from './branded-loading';
import { useBuddySuppression } from '@/hooks/use-journey-buddy';

// Keep navigation mounted underneath. Slow session restoration must not hide
// public pages indefinitely or change the authentication state itself.
export function StartupLoading() {
  const { loading } = useSessionState();
  const [expired, setExpired] = useState(false);
  useBuddySuppression(loading && !expired);
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => setExpired(true), 15000);
    return () => clearTimeout(timeout);
  }, [loading]);
  return loading && !expired ? <BrandedLoading overlay /> : null;
}
