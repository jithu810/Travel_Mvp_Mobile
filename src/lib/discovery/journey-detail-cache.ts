import type { PublicJourney } from '../../types/journey';
import { createRequestCache } from './request-cache';

export const cloneJourney = (journey: PublicJourney): PublicJourney => ({ ...journey, stops: journey.stops.map(stop => ({ ...stop })) });

// Raw anonymous metadata only: never social state, auth tokens or signed photos.
export function createJourneyDetailCache(clock = Date.now) {
  let cache = createRequestCache<PublicJourney | null>(6, 45000, clock);
  let generation = 0;
  let scope: string | null = null;
  const transports = new Set<AbortController>();
  function clear() {
    generation++; cache.clear();
    transports.forEach(controller => controller.abort());
    cache = createRequestCache(6, 45000, clock);
  }
  function account(next: string) { if (scope !== next) { scope = next; clear(); } }
  async function get(id: string, signal: AbortSignal, load: (signal: AbortSignal) => Promise<PublicJourney | null>) {
    const version = generation;
    const value = await cache.get(id, signal, async upstream => {
      if (transports.size >= 6) throw new Error('Journey requests are busy. Please retry.');
      const controller = new AbortController();
      const abort = () => controller.abort();
      upstream.addEventListener('abort', abort, { once: true });
      if (upstream.aborted) controller.abort();
      transports.add(controller);
      try { const raw = await load(controller.signal); return raw ? cloneJourney(raw) : null; }
      finally { upstream.removeEventListener('abort', abort); transports.delete(controller); }
    });
    if (signal.aborted || version !== generation) throw new Error('Request cancelled.');
    return value ? cloneJourney(value) : null;
  }
  return { get, clear, account };
}
export const journeyDetailCache = createJourneyDetailCache();
