import { useCallback, useEffect, useState } from 'react';

type Request = { version: number; preserve: boolean };
type Result<T> = {
  request: Request;
  loader: (signal: AbortSignal) => Promise<T>;
  data: T | null;
  error: string | null;
};

export function useLoad<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [request, setRequest] = useState<Request>({ version: 0, preserve: false });
  const [result, setResult] = useState<Result<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = setTimeout(() => {
      controller.abort();
      if (cancelled) return;
      cancelled = true; // Ignore late results even from transports that ignore AbortSignal.
      setResult(previous => ({ request, loader, data: request.preserve && previous?.loader === loader ? previous.data : null, error: 'The request timed out. Please try again.' }));
    }, 15000);
    // Only asynchronous request completion sets result state. A new loader or
    // request derives its loading state without a second render from the effect.
    loader(controller.signal).then(data => {
      if (controller.signal.aborted) throw new Error('The request timed out. Please try again.');
      if (!cancelled) setResult({ request, loader, data, error: null });
    }).catch(reason => {
      if (!cancelled) setResult(previous => ({
        request, loader,
        data: request.preserve && previous?.loader === loader ? previous.data : null,
        error: controller.signal.aborted ? 'The request timed out. Please try again.'
          : reason instanceof Error ? reason.message : 'Something went wrong. Please try again.',
      }));
    }).finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [loader, request]);

  const settled = result?.request === request && result.loader === loader;
  const preserved = request.preserve && result?.loader === loader;
  const refresh = useCallback(() => setRequest(previous => ({ version: previous.version + 1, preserve: true })), []);
  const retry = useCallback(() => setRequest(previous => ({ version: previous.version + 1, preserve: true })), []);
  return {
    data: settled || preserved ? result?.data ?? null : null,
    loading: !settled && !(preserved && result?.data != null),
    refreshing: !settled && preserved && result?.data != null,
    error: settled ? result.error : null,
    refresh, retry,
  };
}

