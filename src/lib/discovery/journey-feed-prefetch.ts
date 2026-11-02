// Native image transports are not uniformly cancellable. Bound outstanding work
// even when a platform ignores abort; never publish obsolete completions.
export function createFirstImagePrefetch() {
  let busy = false;
  return async function prefetch(url: string, signal: AbortSignal, start: (url: string, request: (id: number) => void) => Promise<boolean>, abort?: (id: number) => void) {
    if (signal.aborted || busy) return false;
    busy = true;
    let requestId: number | undefined;
    const cancel = () => { if (requestId !== undefined) abort?.(requestId); };
    signal.addEventListener('abort', cancel, { once: true });
    try {
      const result = await start(url, id => { requestId = id; if (signal.aborted) cancel(); });
      return !signal.aborted && result;
    } catch { return false; }
    finally { busy = false; signal.removeEventListener('abort', cancel); }
  };
}
export const prefetchFirstImage = createFirstImagePrefetch();
