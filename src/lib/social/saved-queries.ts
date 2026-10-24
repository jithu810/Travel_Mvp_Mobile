import { supabase } from '../supabase/client';
import { isJourneyId, normalizePublicJourney, object } from '../discovery/model';
import { resolvePhotos } from '../discovery/queries';
import type { PublicJourney } from '../../types/journey';

export async function loadSavedJourneys(userId: string, signal: AbortSignal): Promise<PublicJourney[]> {
  const client = supabase;
  if (!client || !isJourneyId(userId)) throw new Error('Sign in to see your saved journeys.');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) cancel();
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    if (session?.user.id !== userId) cancel();
  });
  const check = () => { if (controller.signal.aborted) throw new Error('Saved journeys request cancelled.'); };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectCancelled: (() => void) | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    rejectCancelled = () => reject(new Error('Saved journeys request cancelled. Please retry.'));
    controller.signal.addEventListener('abort', rejectCancelled, { once: true });
    timer = setTimeout(cancel, 15000);
    if (controller.signal.aborted) rejectCancelled();
  });
  async function verify() {
    check();
    const { data, error } = await client!.auth.getUser();
    check();
    if (error || data.user?.id !== userId) throw new Error('Sign in to see your saved journeys.');
  }
  async function read() {
    await verify();
    const journeys = new Map<string, PublicJourney>();
    // Smaller pages avoid Data API row caps without restricting Saved to the
    // anonymous discovery window. The existing RPC orders by updated_at/id.
    for (let offset = 0; ; offset += 100) {
      check();
      const { data, error } = await client!.rpc('get_account_journeys', { owner_id: userId, collection: 'saved' })
        .range(offset, offset + 99).abortSignal(controller.signal);
      check();
      if (error || !Array.isArray(data)) throw new Error('Couldn’t load saved journeys. Please retry.');
      for (const value of data) {
        const row = object(value);
        // Unlike arbitrary owner-visible account rows, this checked projection
        // has the same public-only contract required by the discovery mapper.
        if (!row || row.status !== 'published' || row.saved !== true || row.is_demo !== false) continue;
        const journey = normalizePublicJourney(row);
        if (journey) journeys.set(journey.id, journey);
      }
      if (data.length < 100) break;
    }
    await verify();
    const photos = await resolvePhotos([...journeys.values()], controller.signal);
    await verify();
    return photos;
  }
  try { return await Promise.race([read(), deadline]); }
  finally {
    clearTimeout(timer);
    subscription.unsubscribe();
    signal.removeEventListener('abort', cancel);
    if (rejectCancelled) controller.signal.removeEventListener('abort', rejectCancelled);
    cancel();
  }
}
