type Pending<T> = { controller: AbortController; promise: Promise<T>; consumers: number };

// Process-memory only. Each subscriber cancels independently; no tokens persist.
export function createRequestCache<T>(maxEntries: number, ttl: number, clock = Date.now) {
  const values = new Map<string, { value: T; expires: number }>();
  const pending = new Map<string, Pending<T>>();
  function clear() {
    values.clear();
    // Existing subscribers may complete, but cannot repopulate this generation.
    pending.clear();
  }
  function get(key: string, signal: AbortSignal, load: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (signal.aborted) return Promise.reject(new Error('Request cancelled.'));
    const cached = values.get(key);
    if (cached && cached.expires > clock()) return Promise.resolve(cached.value);
    values.delete(key);
    let entry = pending.get(key);
    if (!entry) {
      if (pending.size >= maxEntries) return Promise.reject(new Error('Too many image requests. Please retry.'));
      const controller = new AbortController();
      const next = { controller, consumers: 0 } as Pending<T>;
      let timeout: ReturnType<typeof setTimeout>;
      let onAbort: () => void;
      const deadline = new Promise<never>((_resolve, reject) => {
        onAbort = () => reject(new Error('Request cancelled.'));
        controller.signal.addEventListener('abort', onAbort, { once: true });
        timeout = setTimeout(() => { controller.abort(); reject(new Error('The request timed out. Please try again.')); }, 15000);
      });
      next.promise = Promise.race([Promise.resolve().then(() => load(controller.signal)), deadline]).then(value => {
        if (pending.get(key) === next && !controller.signal.aborted) {
          values.set(key, { value, expires: clock() + ttl });
          while (values.size > maxEntries) values.delete(values.keys().next().value!);
        }
        return value;
      }).finally(() => { clearTimeout(timeout); controller.signal.removeEventListener('abort', onAbort); if (pending.get(key) === next) pending.delete(key); });
      entry = next;
      pending.set(key, next);
    }
    const shared = entry;
    shared.consumers++;
    return new Promise<T>((resolve, reject) => {
      let done = false;
      const release = () => {
        if (done) return false;
        done = true;
        signal.removeEventListener('abort', abort);
        shared.consumers--;
        if (!shared.consumers) { if (pending.get(key) === shared) pending.delete(key); shared.controller.abort(); }
        return true;
      };
      const abort = () => { if (release()) reject(new Error('Request cancelled.')); };
      signal.addEventListener('abort', abort, { once: true });
      shared.promise.then(value => { if (release()) resolve(value); }, error => { if (release()) reject(error); });
      if (signal.aborted) abort();
    });
  }
  return { get, clear };
}
