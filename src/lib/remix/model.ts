import { isJourneyId, normalizeStops, object, safePhoto } from '../discovery/model';
import type { JourneyStop } from '../../types/journey';
export type PrivateDraft = { id: string; title: string; description: string; cover: string | null; stops: JourneyStop[]; sourceId: string | null };
export function normalizeDraft(value: unknown, id: string, owner: string): PrivateDraft | null {
  const row = object(value);
  if (!row || !isJourneyId(id) || row.id !== id || row.creator_id !== owner || row.status !== 'draft' || row.is_demo !== false || typeof row.title !== 'string') return null;
  return { id, title: row.title, description: typeof row.description === 'string' ? row.description : '', cover: safePhoto(row.cover_image_path),
    stops: normalizeStops(row.stops, true), sourceId: typeof row.copied_from_journey_id === 'string' && isJourneyId(row.copied_from_journey_id) ? row.copied_from_journey_id : null };
}
export class RemixFailure extends Error {
  constructor(message: string, readonly uncertain = false, readonly copyId: string | null = null) { super(message); }
}
export type RemixSnapshot = { busy: boolean; copyId: string | null; error: string | null; blocked: boolean };
export function createRemixStore() {
  const entries = new Map<string, RemixSnapshot>();
  const idle: RemixSnapshot = { busy: false, copyId: null, error: null, blocked: false };
  const listeners = new Set<() => void>();
  const set = (key: string, value: RemixSnapshot) => { entries.set(key, value); listeners.forEach(fn => fn()); };
  return {
    get: (key: string) => entries.get(key) ?? idle,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    async run(key: string, port: () => Promise<string>) {
      const previous = entries.get(key) ?? idle;
      if (previous.busy || previous.blocked || previous.copyId) return previous.copyId;
      set(key, { ...idle, busy: true });
      try { const id = await port(); set(key, { ...idle, copyId: id }); return id; }
      catch (error) {
        const failure = error instanceof RemixFailure ? error : new RemixFailure('Copy result unconfirmed. Check Account private drafts before trying again.', true);
        set(key, { busy: false, copyId: failure.copyId, error: failure.message, blocked: failure.uncertain });
        return null;
      }
    },
  };
}
export const remixStore = createRemixStore();
// Attribution copy for a remix's direct parent (journeys.copied_from_journey_id).
export const unavailableSourceCopy = 'Remixed from an original journey that is currently unavailable.';
export function remixCredit(prefix: 'Remix of' | 'Remixed from', source: { title: string; creatorName: string } | null): string {
  if (!source) return unavailableSourceCopy;
  return prefix + ' ' + source.title + (source.creatorName ? ' · by ' + source.creatorName : '');
}
// A remix draft without any place photo shows maps until the owner adds photos.
export const remixPhotoHint = 'Add your own photos — places show a map until you do.';
export function needsRemixPhotoHint(sourceId: string | null | undefined, stops: readonly { id: string; photoPath?: string | null }[], localPhotoIds: readonly string[]) {
  return Boolean(sourceId) && stops.length > 0 && !stops.some(stop => stop.photoPath || localPhotoIds.includes(stop.id));
}
// Account draft cards credit the direct parent when it was looked up, a generic
// line when the lookup was skipped or failed, and the unavailable copy when the
// parent is no longer public.
export const genericRemixCredit = 'Remix of another journey';
export type RemixSource = { title: string; creatorName: string };
export function draftRemixCredit(source: RemixSource | null | undefined) {
  return source === undefined ? genericRemixCredit : remixCredit('Remix of', source);
}
// Runs at most `limit` tasks at once; results keep input order. An abort stops
// queued items from starting and rejects at once, without waiting for running tasks
// (which receive the same signal through their own lookups).
export async function mapLimited<T, R>(items: readonly T[], limit: number, task: (item: T) => Promise<R>, signal?: AbortSignal): Promise<R[]> {
  const cancelled = () => new Error('Request cancelled.');
  if (signal?.aborted) throw cancelled();
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length && !signal?.aborted) { const index = next++; results[index] = await task(items[index]); } };
  const all = Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  if (!signal) { await all; return results; }
  let onAbort = () => {};
  const aborted = new Promise<never>((_resolve, reject) => { onAbort = () => reject(cancelled()); signal.addEventListener('abort', onAbort, { once: true }); });
  try { await Promise.race([all, aborted]); } finally { signal.removeEventListener('abort', onAbort); }
  if (signal.aborted) throw cancelled();
  return results;
}
