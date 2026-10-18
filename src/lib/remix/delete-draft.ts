import type { SupabaseClient } from '@supabase/supabase-js';
import { isJourneyId } from '../discovery/model';

export async function deleteOwnedDraft(client: SupabaseClient | null, id: string, ownerId: string) {
  if (!client || !isJourneyId(id) || !isJourneyId(ownerId)) throw new Error('Could not verify this draft or account.');
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || auth.user?.id !== ownerId) throw new Error('Sign in again before deleting your draft.');
  // Atomic filters also protect a draft published after the confirmation opened.
  // Never remove Storage objects: independent copies can reference these paths.
  const { data, error } = await client.from('journeys').delete()
    .eq('id', id).eq('user_id', ownerId).eq('status', 'draft').eq('is_demo', false).select('id');
  if (error) throw new Error('Deletion could not be confirmed. Refresh drafts to check before retrying.');
  if (!Array.isArray(data) || data.length !== 1 || data[0].id !== id) throw new Error('Draft not deleted: it may have been published, removed or belong to another account. Refresh drafts.');
}
