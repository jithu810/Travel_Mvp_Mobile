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
