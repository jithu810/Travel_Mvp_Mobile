import { supabase } from '../supabase/client';
import { object } from '../discovery/model';
import { SaveFailure, type SavePayload, type Saved } from './model';
export async function saveNewJourney(payload: SavePayload, ownerId: string, signal: AbortSignal = new AbortController().signal): Promise<Saved> {
  if (signal.aborted) throw new SaveFailure('Save cancelled before submission.');
  if (!supabase) throw new SaveFailure('Journey saving is not configured.');
  const { data: viewer, error: authError } = await supabase.auth.getUser();
  if (signal.aborted) throw new SaveFailure('Save cancelled before submission.');
  if (authError || viewer.user?.id !== ownerId) throw new SaveFailure('Sign in again before saving your journey.');
  const controller = new AbortController(), abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const { data, error } = await supabase.rpc('save_journey', { payload }).abortSignal(controller.signal);
    if (error) {
      const certain = /^[0-9A-Z]{5}$/.test(error.code ?? '');
      const message = error.code === '40001' ? 'This journey changed or an earlier save reached the server. Check Account; this form cannot overwrite it.'
        : error.code === '22023' ? 'The server rejected these journey details. Check your fields and selected places.'
          : error.code === '42501' || error.code === '23505' ? 'Only your own new journey can be saved. Check Account.'
            : certain ? 'The save failed. Your form is preserved; please retry.'
              : 'Save result unconfirmed. Check Account before trying again; a draft or publication may already exist.';
      throw new SaveFailure(message, !certain || error.code === '40001');
    }
    const saved = object(data);
    if (saved?.id !== payload.id || saved.status !== payload.status || typeof saved.updated_at !== 'string' || !Number.isFinite(Date.parse(saved.updated_at))) throw new SaveFailure('Save result unconfirmed. Check Account before trying again.', true);
    return { id: payload.id, status: payload.status, updated_at: saved.updated_at };
  } catch (error) {
    if (error instanceof SaveFailure) throw error;
    throw new SaveFailure('Save result unconfirmed. Check Account before trying again; the operation may have reached the server.', true);
  } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
}
