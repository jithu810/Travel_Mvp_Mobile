import { supabase } from '../supabase/client';
import { randomUUID } from '../create/id';
import { readPreparedPhoto } from '../create/photo-device';
import { MAX_PHOTO_BYTES, MAX_PHOTO_SIDE, type LocalPhoto } from '../create/photo-model';
import { ownProfile, ownedAvatar, profileFields, ProfileEditFailure, type ProfileFields } from './edit-model';
const columns = 'id,display_name,username,bio,avatar_path';
function client() { if (!supabase) throw new ProfileEditFailure('Profile editing is not configured yet.'); return supabase; }
async function wait<T>(promise: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new ProfileEditFailure('The request timed out. Please retry.');
  return new Promise((resolve, reject) => {
    const abort = () => reject(new ProfileEditFailure('The request timed out. Please retry.'));
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(value => { if (!signal.aborted) resolve(value); }, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
async function owner(id: string, signal: AbortSignal) {
  const { data, error } = await wait(client().auth.getUser(), signal);
  if (error || data.user?.id !== id) throw new ProfileEditFailure('Please sign in again before editing your profile.');
}
async function read(id: string, signal: AbortSignal) {
  const { data, error } = await wait(client().from('profiles').select(columns).eq('id', id).abortSignal(signal).maybeSingle(), signal);
  if (error) throw new ProfileEditFailure('Couldn’t load your profile. Please retry.');
  return ownProfile(data, id);
}
export async function loadOwnProfile(id: string, signal: AbortSignal) {
  await owner(id, signal);
  const profile = await read(id, signal);
  if (profile.avatarPath && ownedAvatar(profile.avatarPath, id)) {
    try {
      const { data, error } = await wait(client().storage.from('profile-avatars').createSignedUrl(profile.avatarPath.slice(16), 3600), signal);
      if (!error && data?.signedUrl) profile.avatarPreview = data.signedUrl;
    } catch { /* Saved path stays intact when a temporary preview cannot load. */ }
  }
  if (signal.aborted) throw new ProfileEditFailure('The request timed out. Please retry.');
  return profile;
}
export async function uploadProfileAvatar(photo: LocalPhoto, id: string, signal: AbortSignal) {
  await owner(id, signal);
  if (!['image/jpeg','image/png','image/webp'].includes(photo.mime) || !Number.isSafeInteger(photo.size) || photo.size <= 0 || photo.size > MAX_PHOTO_BYTES || ![photo.width, photo.height].every(n => Number.isInteger(n) && n > 0 && n <= MAX_PHOTO_SIDE)) throw new ProfileEditFailure('Choose a valid prepared photo of 15 MB or smaller.');
  const bytes = await wait(readPreparedPhoto(photo), signal);
  if (bytes.byteLength !== photo.size) throw new ProfileEditFailure('The prepared avatar changed. Choose the photo again.');
  await owner(id, signal);
  const path = id + '/' + randomUUID() + (photo.mime === 'image/jpeg' ? '.jpg' : photo.mime === 'image/png' ? '.png' : '.webp');
  const { data, error } = await wait(client().storage.from('profile-avatars').upload(path, bytes, { contentType: photo.mime, upsert: false }), signal);
  if (error || data?.path !== path) throw new ProfileEditFailure('Avatar upload failed. Your profile has not been saved. Please retry.');
  return 'profile-avatars/' + path;
}
export async function updateOwnProfile(input: ProfileFields, id: string, signal: AbortSignal) {
  const fields = profileFields(input);
  await owner(id, signal);
  const current = await read(id, signal);
  let preview = current.avatarPreview;
  if (fields.avatarPath !== current.avatarPath && fields.avatarPath !== null) {
    if (!ownedAvatar(fields.avatarPath, id)) throw new ProfileEditFailure('Choose your own uploaded avatar.');
    const { data, error } = await wait(client().storage.from('profile-avatars').createSignedUrl(fields.avatarPath.slice(16), 3600), signal);
    if (error || !data?.signedUrl) throw new ProfileEditFailure('The uploaded avatar could not be verified. Please retry.');
    preview = data.signedUrl;
  }
  await owner(id, signal);
  const payload = { display_name: fields.displayName, username: fields.username, bio: fields.bio, avatar_path: fields.avatarPath };
  let result;
  try { result = await wait(client().from('profiles').update(payload).eq('id', id).select(columns).abortSignal(signal).maybeSingle(), signal); }
  catch { throw new ProfileEditFailure('Save result unconfirmed. Reload your saved profile before retrying.', true); }
  if (result.error) {
    if (result.error.code === '23505') throw new ProfileEditFailure('That username is already taken. Try another.');
    if (/^[0-9A-Z]{5}$/.test(result.error.code || '') && !result.error.code?.startsWith('PGRST')) throw new ProfileEditFailure('Profile could not be saved. Check your values and permissions, then retry.');
    throw new ProfileEditFailure('Save result unconfirmed. Reload your saved profile before retrying.', true);
  }
  if (!result.data) throw new ProfileEditFailure('Your profile could not be updated. Check your account permissions and retry.');
  let saved;
  try { saved = ownProfile(result.data, id); } catch { throw new ProfileEditFailure('Save result unconfirmed. Reload your saved profile before retrying.', true); }
  saved.avatarPreview = saved.avatarPath ? preview : null;
  return saved;
}
