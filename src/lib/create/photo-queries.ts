import { supabase } from '../supabase/client';
import { isJourneyId } from '../discovery/model';
import { SaveFailure, type CreateForm } from './model';
import type { LocalPhoto } from './photo-model';
import { readPreparedPhoto } from './photo-device';
async function viewer(expectedOwner: string, signal: AbortSignal) {
  if (!supabase || signal.aborted) throw new SaveFailure('Photo saving is unavailable or cancelled.');
  const { data, error } = await supabase.auth.getUser();
  if (signal.aborted || error || data.user?.id !== expectedOwner || !isJourneyId(data.user.id)) throw new SaveFailure('Sign in again before saving photos.');
  return { client: supabase, owner: data.user.id };
}
export async function checkPhotoDraft(form: CreateForm, ownerId: string, signal: AbortSignal) {
  const { client, owner } = await viewer(ownerId,signal);
  const { data, error } = await client.from('journeys').select('id,user_id,status,updated_at,is_demo')
    .eq('id',form.id).eq('user_id',owner).eq('status','draft').abortSignal(signal).maybeSingle();
  if (error || signal.aborted) throw new SaveFailure('Could not verify your private draft. No new photo was uploaded. Try again.');
  if (!data || data.id !== form.id || data.user_id !== owner || data.status !== 'draft' || data.is_demo !== false || data.updated_at !== form.updatedAt) throw new SaveFailure('This draft changed or is no longer privately editable. Reload before saving photos.',true);
  const { data: stops, error: stopError } = await client.from('journey_stops').select('id').eq('journey_id',form.id).abortSignal(signal);
  if (stopError || signal.aborted || !Array.isArray(stops)) throw new SaveFailure('Could not verify every saved memory. No new photo was uploaded. Try again.');
  return { ownerId: owner, stopIds: stops.map(stop => stop.id) };
}
export async function uploadJourneyPhoto(objectName: string, photo: LocalPhoto, expectedOwner: string, signal: AbortSignal) {
  const { client, owner } = await viewer(expectedOwner,signal);
  const segments = objectName.split('/'), ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[photo.mime];
  const cover = segments.length === 4 && segments[2] === 'cover';
  const memory = segments.length === 5 && segments[2] === 'stops' && isJourneyId(segments[3]);
  const filename = segments.at(-1) || '';
  if (segments[0] !== owner || !isJourneyId(segments[1]) || !(cover || memory) || !ext || !filename.endsWith('.'+ext) || !isJourneyId(filename.slice(0,-ext.length-1))) throw new SaveFailure('Invalid photo Storage object name.');
  let bytes: ArrayBuffer;
  try { bytes = await readPreparedPhoto(photo); }
  catch (error) { throw new SaveFailure(error instanceof Error ? error.message : 'The prepared photo could not be read. Select it again.'); }
  if (signal.aborted) throw new SaveFailure('Upload cancelled before submission.');
  // The installed upload API does not accept AbortSignal. Existing client timeout
  // remains in force; do not claim cancelling the editor cancels a server write.
  try {
    const { data, error } = await client.storage.from('journey-media').upload(objectName,bytes,{ contentType: photo.mime, cacheControl: '3600', upsert: false });
    if (error) {
      const code = Number(error.statusCode);
      const certain = code >= 400 && code < 500 && ![408,409].includes(code) && !/duplicate|already exists/i.test(error.message || '');
      throw new SaveFailure(certain ? 'Photo upload was rejected. Your selected photo and saved photos are preserved. Check connection, session, size and Storage permissions before trying again.' : 'Photo upload result unconfirmed. Check/reload your saved draft before continuing; this upload will not be repeated automatically.',!certain);
    }
    if (data?.path !== objectName || signal.aborted) throw new SaveFailure('Photo upload result unconfirmed. Check your saved draft before continuing.',true);
  } catch (error) {
    if (error instanceof SaveFailure) throw error;
    throw new SaveFailure('Photo upload result unconfirmed. Check your saved draft before continuing; this upload will not be repeated automatically.',true);
  }
}
