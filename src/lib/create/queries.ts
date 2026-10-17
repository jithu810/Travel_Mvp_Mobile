import { hydrateDraft } from './editor-model';
import { supabase } from '../supabase/client';
import { object, safePhoto } from '../discovery/model';
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
          : error.code === '42501' || error.code === '23505' ? 'Only your own journey can be saved. Check Account.'
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

export async function loadEditableDraft(id: string, ownerId: string, signal: AbortSignal) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Invalid private draft.');
  if (!supabase || signal.aborted) throw new Error('Draft loading is unavailable.');
  const { data: viewer, error: authError } = await supabase.auth.getUser();
  if (signal.aborted || authError || viewer.user?.id !== ownerId) throw new Error('Sign in again to edit your private draft.');
  const { data: journey, error } = await supabase.from('journeys')
    .select('id,user_id,title,description,destination_slug,destination_name,destination_latitude,destination_longitude,traveler_type,duration_days,cover_image_path,status,is_demo,updated_at')
    .eq('id', id).eq('user_id', ownerId).eq('status', 'draft').abortSignal(signal).maybeSingle();
  if (error || !journey) throw new Error('Private draft unavailable. It may have been published, deleted or belong to another account.');
  const { data: stops, error: stopError } = await supabase.from('journey_stops')
    .select('id,journey_id,sequence,name,description,latitude,longitude,mapbox_place_id,photo_path,rating,day_number')
    .eq('journey_id', id).order('sequence').abortSignal(signal);
  if (stopError || signal.aborted) throw new Error('Could not load every stop. Retry before editing.');
  const { data: version, error: versionError } = await supabase.from('journeys').select('updated_at')
    .eq('id', id).eq('user_id', ownerId).eq('status', 'draft').abortSignal(signal).maybeSingle();
  if (versionError || signal.aborted || version?.updated_at !== journey.updated_at) throw new Error('This draft changed while loading. Retry to get a consistent version.');
  return hydrateDraft(journey, stops, id, ownerId);
}
// Resolve display URLs separately; raw editor paths always remain in the form.
export async function loadEditorPhotos(paths: string[], ownerId: string, signal: AbortSignal): Promise<Record<string, string>> {
  if (!paths.length) return {};
  if (!supabase || signal.aborted) throw new Error('Photo previews unavailable.');
  const { data, error } = await supabase.auth.getUser();
  if (error || data.user?.id !== ownerId || signal.aborted) throw new Error('Photo previews unavailable.');
  const objects = [...new Set(paths.filter(path => path.startsWith('journey-media/') && safePhoto(path)))];
  if (!objects.length) return {};
  const { data: photos, error: photoError } = await supabase.storage.from('journey-media').createSignedUrls(objects.map(path => path.slice('journey-media/'.length)), 3600);
  if (photoError || signal.aborted) throw new Error('Photo previews unavailable.');
  const result: Record<string, string> = {};
  photos?.forEach((photo, index) => { if (photo.signedUrl && !photo.error) result[objects[index]] = photo.signedUrl; });
  return result;
}