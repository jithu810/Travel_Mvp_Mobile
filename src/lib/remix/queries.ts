import { supabase } from '../supabase/client';
import { isJourneyId, object } from '../discovery/model';
import { loadPublicJourney } from '../discovery/queries';
import { normalizeDraft, RemixFailure, type PrivateDraft } from './model';
function api() { if (!supabase) throw new Error('Accounts are not configured yet.'); return supabase; }
async function owner(userId: string, signal: AbortSignal) {
  const { data, error } = await api().auth.getUser();
  if (signal.aborted || error || data.user?.id !== userId) throw new Error('Sign in again to access your private drafts.');
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
export async function loadPrivateDrafts(userId: string, signal: AbortSignal) {
  await owner(userId, signal);
  const { data, error } = await api().rpc('get_account_journeys', { owner_id: userId, collection: 'drafts' }).abortSignal(signal);
  if (error || !Array.isArray(data)) throw new Error('Couldn’t load your private drafts. Please retry.');
  return data.flatMap(value => {
    const row = object(value);
    return row && row.creator_id === userId && row.status === 'draft' && row.is_demo === false && typeof row.id === 'string' && isJourneyId(row.id) && typeof row.title === 'string'
      ? [{ id: row.id, title: row.title }] : [];
  });
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
