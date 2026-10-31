import { supabase } from '../supabase/client';
import { accountCheckMessage } from '../auth/model';
import { isJourneyId, object } from '../discovery/model';
import { loadPublicJourney, loadPublicJourneyCard } from '../discovery/queries';
import { mapLimited, normalizeDraft, RemixFailure, type PrivateDraft, type RemixSource } from './model';
function api() { if (!supabase) throw new Error('Accounts are not configured yet.'); return supabase; }
async function owner(userId: string, signal: AbortSignal) {
  const { data, error } = await api().auth.getUser();
  if (signal.aborted || error || data.user?.id !== userId) throw new Error(accountCheckMessage(error, 'Sign in again to access your private drafts.'));
}
export async function loadPrivateDraft(id: string, userId: string, signal: AbortSignal): Promise<PrivateDraft | null> {
  if (!isJourneyId(id)) return null;
  await owner(userId, signal);
  const { data, error } = await api().rpc('get_journey_detail', { target_id: id }).abortSignal(signal);
  if (error) throw new Error('Couldn’t load your private draft. Please retry.');
  const draft = normalizeDraft(data, id, userId);
  if (!draft) return null;
  const paths = [...new Set([draft.cover, ...draft.stops.map(stop => stop.photo)].filter((path): path is string => Boolean(path?.startsWith('journey-media/'))))];
  const resolved = new Map<string, string>();
  if (paths.length) {
    try {
      const { data: photos } = await api().storage.from('journey-media').createSignedUrls(paths.map(path => path.slice(14)), 3600);
      photos?.forEach((photo, index) => { if (photo.signedUrl && !photo.error) resolved.set(paths[index], photo.signedUrl); });
    } catch { /* Missing media keeps a neutral fallback. */ }
  }
  if (signal.aborted) throw new Error('Request cancelled.');
  const photo = (path: string | null) => path?.startsWith('journey-media/') ? resolved.get(path) ?? null : path;
  return { ...draft, cover: photo(draft.cover), stops: draft.stops.map(stop => ({ ...stop, photo: photo(stop.photo) })) };
}
export type PrivateDraftSummary = { id: string; title: string; sourceId?: string; source?: RemixSource | null };
// Bounds the Account list's parent lookups: distinct ids only, a small cap,
// limited concurrency and a short per-lookup deadline.
export const draftSourceLookupLimit = 12;
const draftSourceConcurrency = 3, draftSourceTimeout = 6000;
// get_account_journeys omits lineage, so one owner-scoped journeys read (RLS: own rows)
// adds copied_from_journey_id for every draft at once. It is optional: a failed
// lineage read keeps the list and only omits the Remix credit.
async function draftSources(userId: string, signal: AbortSignal): Promise<Map<string, string>> {
  const sources = new Map<string, string>();
  try {
    const { data, error } = await api().from('journeys').select('id,copied_from_journey_id')
      .eq('user_id', userId).eq('status', 'draft').abortSignal(signal);
    if (error || !Array.isArray(data)) return sources;
    for (const value of data) {
      const row = object(value);
      if (row && typeof row.id === 'string' && typeof row.copied_from_journey_id === 'string' && isJourneyId(row.copied_from_journey_id) && row.copied_from_journey_id !== row.id) sources.set(row.id, row.copied_from_journey_id);
    }
  } catch { /* Lineage is display-only. */ }
  return sources;
}
// Direct parent only (never walks further up the lineage). undefined = not looked
// up or failed; null = no longer public.
// Loaded after the list is shown (Account fills credits in progressively).
export async function loadDraftSourceCards(ids: readonly string[], signal: AbortSignal): Promise<Map<string, RemixSource | null>> {
  const cards = new Map<string, RemixSource | null>();
  const distinct = [...new Set(ids.filter(isJourneyId))];
  await mapLimited(distinct.slice(0, draftSourceLookupLimit), draftSourceConcurrency, async id => {
    const controller = new AbortController(), abort = () => controller.abort();
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, draftSourceTimeout);
    try {
      const card = await loadPublicJourneyCard(id, controller.signal);
      cards.set(id, card ? { title: card.title, creatorName: card.creatorName } : null);
    } catch { /* Falls back to the generic Remix credit. */ }
    finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
  }, signal);
  return cards;
}
// Lineage (sourceId) is opt-in (Account); the Create shortcuts list stays a single RPC.
// Parent titles/authors are not awaited here: see loadDraftSourceCards.
export async function loadPrivateDrafts(userId: string, signal: AbortSignal, options: { lineage?: boolean } = {}): Promise<PrivateDraftSummary[]> {
  await owner(userId, signal);
  const [{ data, error }, sources] = await Promise.all([
    api().rpc('get_account_journeys', { owner_id: userId, collection: 'drafts' }).abortSignal(signal),
    options.lineage ? draftSources(userId, signal) : Promise.resolve(new Map<string, string>()),
  ]);
  if (error || !Array.isArray(data)) throw new Error('Couldn’t load your private drafts. Please retry.');
  const drafts: PrivateDraftSummary[] = data.flatMap(value => {
    const row = object(value);
    if (!(row && row.creator_id === userId && row.status === 'draft' && row.is_demo === false && typeof row.id === 'string' && isJourneyId(row.id) && typeof row.title === 'string')) return [];
    const sourceId = sources.get(row.id);
    return [sourceId ? { id: row.id, title: row.title, sourceId } : { id: row.id, title: row.title }];
  });
  return drafts;
}
// Attaches looked-up parents; drafts without a result keep the generic credit.
export function withDraftSources(drafts: readonly PrivateDraftSummary[], cards: ReadonlyMap<string, RemixSource | null>): PrivateDraftSummary[] {
  return drafts.map(draft => draft.sourceId && cards.has(draft.sourceId) ? { ...draft, source: cards.get(draft.sourceId) } : draft);
}
export async function remixJourney(sourceId: string, userId: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let submitted = false;
  let copyId: string | null = null;
  try {
    await owner(userId, controller.signal);
    if (!await loadPublicJourney(sourceId, controller.signal)) throw new RemixFailure('This journey is no longer available to remix.');
    if (controller.signal.aborted) throw new RemixFailure('Connection timed out before copying. Please retry.');
    submitted = true;
    const { data, error } = await api().rpc('copy_journey', { source_id: sourceId }).abortSignal(controller.signal);
    if (error) {
      // Only a database SQLSTATE confirms that the transaction failed. Transport failures can follow a committed copy.
      const definite = /^[0-9A-Z]{5}$/.test(error.code ?? '') && !error.code.startsWith('PGRST');
      throw new RemixFailure(definite ? 'Couldn’t create the private copy. Please retry.' : 'Copy result unconfirmed. Check Account private drafts before trying again.', !definite);
    }
    if (typeof data !== 'string' || !isJourneyId(data) || data === sourceId) throw new RemixFailure('Copy result unconfirmed. Check Account private drafts.', true);
    copyId = data;
    const { data: detail, error: readError } = await api().rpc('get_journey_detail', { target_id: copyId }).abortSignal(controller.signal);
    const draft = normalizeDraft(detail, copyId, userId);
    if (readError || !draft || draft.sourceId !== sourceId) throw new RemixFailure('A copy was returned, but its private draft could not be verified. Open it or check Account.', true, copyId);
    return copyId;
  } catch (error) {
    if (error instanceof RemixFailure) throw error;
    throw new RemixFailure(submitted ? 'Copy result unconfirmed. Check Account private drafts before trying again.' : 'Couldn’t check your account or the original journey. Please retry.', submitted, copyId);
  } finally { clearTimeout(timer); }
}

// One server transaction copies only selected source stops and retains attribution.
// A stable draft ID makes transport retries refer to the same draft.
export async function remixSelectedJourney(sourceId: string, stopIds: string[], draftId: string, userId: string): Promise<string> {
  if (!isJourneyId(sourceId) || !isJourneyId(draftId) || draftId === sourceId || !stopIds.length || stopIds.length > 50
    || stopIds.some(id => !isJourneyId(id)) || new Set(stopIds).size !== stopIds.length) throw new RemixFailure('Invalid stop selection. Review your stops.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let submitted = false;
  try {
    await owner(userId, controller.signal);
    if (controller.signal.aborted) throw new RemixFailure('Connection timed out before copying. Please retry.');
    submitted = true;
    const { data, error } = await api().rpc('copy_journey_selected', { source_id: sourceId, selected_stop_ids: stopIds, draft_id: draftId }).abortSignal(controller.signal);
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') throw new RemixFailure('Customize stops is not available on the server yet. Your selections are preserved; no draft was created.');
      const definite = /^[0-9A-Z]{5}$/.test(error.code ?? '') && !error.code.startsWith('PGRST');
      throw new RemixFailure(definite ? 'Couldn’t create this selection. The source may have changed; review your stops and retry.'
        : 'Draft result unconfirmed. Check Account drafts before continuing.', !definite);
    }
    if (data !== draftId) throw new RemixFailure('Draft result unconfirmed. Check Account drafts before continuing.', true);
    const { data: detail, error: readError } = await api().rpc('get_journey_detail', { target_id: draftId }).abortSignal(controller.signal);
    const draft = normalizeDraft(detail, draftId, userId);
    if (readError || !draft || draft.sourceId !== sourceId || draft.stops.length !== stopIds.length)
      throw new RemixFailure('Your draft was created but could not be verified. Check Account drafts.', true, draftId);
    return draftId;
  } catch (error) {
    if (error instanceof RemixFailure) throw error;
    throw new RemixFailure(submitted ? 'Draft result unconfirmed. Check Account drafts before continuing.' : 'Couldn’t check your account. Please retry.', submitted);
  } finally { clearTimeout(timer); }
}
