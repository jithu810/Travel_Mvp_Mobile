import { supabase } from '../supabase/client';
import { isJourneyId } from '../discovery/model';
import { normalizeSocialState, type SocialAction, type SocialPort } from './model';

export function socialPort(id: string, userId: string): SocialPort {
  const client = supabase;
  if (!client || !isJourneyId(id) || !isJourneyId(userId)) throw new Error('Account actions unavailable.');
  async function request<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('Request timed out.')); }, 15000);
    });
    try { return await Promise.race([operation(controller.signal), deadline]); }
    finally { clearTimeout(timer!); controller.abort(); }
  }
  async function verify(signal: AbortSignal) {
    const { data, error } = await client!.auth.getUser();
    if (signal.aborted || error || data.user?.id !== userId) throw new Error('Sign in required.');
  }
  async function detail(signal: AbortSignal) {
    const { data, error } = await client!.rpc('get_journey_detail', { target_id: id }).abortSignal(signal);
    const state = normalizeSocialState(data, id);
    if (signal.aborted || error || !state) throw new Error('Journey actions unavailable.');
    return state;
  }
  return {
    read: () => request(async signal => { await verify(signal); return detail(signal); }),
    write: (action: SocialAction, enabled: boolean) => request(async signal => {
      await verify(signal);
      // Recheck visibility before writing. Server RLS remains authoritative.
      await detail(signal);
      if (signal.aborted) throw new Error('Request cancelled.');
      const table = action === 'like' ? 'journey_likes' : 'saved_journeys';
      const mutation = enabled
        ? client.from(table).upsert({ user_id: userId, journey_id: id }, { onConflict: 'user_id,journey_id', ignoreDuplicates: true })
        : client.from(table).delete().eq('user_id', userId).eq('journey_id', id);
      const { error } = await mutation.abortSignal(signal);
      if (signal.aborted || error) throw new Error('Update unconfirmed.');
      return detail(signal);
    }),
  };
}
