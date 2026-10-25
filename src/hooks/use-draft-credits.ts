import { useEffect, useRef, useState } from 'react';
import { draftSourceLookupLimit, loadDraftSourceCards, type PrivateDraftSummary } from '@/lib/remix/queries';
import type { RemixSource } from '@/lib/remix/model';

type Cards = ReadonlyMap<string, RemixSource | null>;
type Load = (ids: readonly string[], signal: AbortSignal) => Promise<Cards>;
const empty: Cards = new Map();

// Fills in remix credits after the drafts list is already on screen.
// - Parents are taken in list order (first appearance) and capped at the lookup limit.
// - Resolved credits are cached for the hook's lifetime and kept while a changed list
//   loads, so cards never flicker back to the generic line; only uncached ids are fetched.
// - A changed set of parents or an unmount aborts outstanding lookups; failures keep
//   the generic credit. `load` is read through a ref, so an inline function is safe.
export function useDraftCredits(drafts: readonly PrivateDraftSummary[] | null | undefined, load: Load = loadDraftSourceCards): Cards {
  const ids = [...new Set((drafts || []).flatMap(draft => draft.sourceId ? [draft.sourceId] : []))].slice(0, draftSourceLookupLimit);
  // The sorted string is only the effect key; lookups keep list order.
  const key = [...ids].sort().join(',');
  const [cache, setCache] = useState<Cards>(empty);
  const latest = useRef({ load, cache, ids });
  // Declared first, so it runs before the lookup effect in the same commit.
  useEffect(() => { latest.current = { load, cache, ids }; });
  useEffect(() => {
    if (!key) return;
    const current = latest.current;
    const missing = current.ids.filter(id => !current.cache.has(id));
    if (!missing.length) return;
    const controller = new AbortController();
    current.load(missing, controller.signal)
      .then(cards => { if (!controller.signal.aborted && cards.size) setCache(previous => new Map([...previous, ...cards])); })
      .catch(() => { /* Credits are display-only. */ });
    return () => controller.abort();
  }, [key]);
  // Only credits for the current list's parents are returned.
  return cache.size ? new Map(ids.flatMap(id => cache.has(id) ? [[id, cache.get(id) ?? null] as const] : [])) : empty;
}
