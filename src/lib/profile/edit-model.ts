import { isJourneyId, object, safePhoto } from '../discovery/model';
import { validHandle } from './model';
import type { LocalPhoto } from '../create/photo-model';
export type ProfileFields = { displayName: string; username: string; bio: string; avatarPath: string | null };
export type OwnProfile = ProfileFields & { id: string; avatarPreview: string | null };
export class ProfileEditFailure extends Error {
  constructor(message: string, public uncertain = false) { super(message); }
}
export function ownedAvatar(path: string, owner: string) {
  return path.startsWith('profile-avatars/' + owner + '/') && path.length <= 500 && path.split('/').every(p => p && p !== '.' && p !== '..') && !/[\\?#\s]/.test(path);
}
export function profileFields(input: ProfileFields): ProfileFields {
  if (typeof input.displayName !== 'string' || input.displayName.trim().length > 80) throw new ProfileEditFailure('Display name must be 80 characters or fewer.');
  if (typeof input.username !== 'string' || !validHandle(input.username.trim())) throw new ProfileEditFailure('Use 3–30 letters, numbers or underscores for your username. “edit” is reserved.');
  if (typeof input.bio !== 'string' || input.bio.length > 500) throw new ProfileEditFailure('Bio must be 500 characters or fewer.');
  if (input.avatarPath !== null && (typeof input.avatarPath !== 'string' || input.avatarPath.length > 500)) throw new ProfileEditFailure('Choose a valid profile photo.');
  return { displayName: input.displayName.trim(), username: input.username.trim().toLowerCase(), bio: input.bio.trim(), avatarPath: input.avatarPath };
}
export function ownProfile(value: unknown, owner: string): OwnProfile {
  const row = object(value);
  if (!isJourneyId(owner) || !row || row.id !== owner) throw new ProfileEditFailure('Your profile is unavailable. Sign in again or retry.');
  for (const key of ['display_name','username','bio','avatar_path']) if (row[key] !== null && row[key] !== undefined && typeof row[key] !== 'string') throw new ProfileEditFailure('Your profile could not be read safely. Please retry.');
  const path = typeof row.avatar_path === 'string' ? row.avatar_path : null;
  const remote = safePhoto(path);
  if (path && !ownedAvatar(path, owner) && !remote?.startsWith('https:')) throw new ProfileEditFailure('Your saved avatar path is unavailable. Please retry.');
  return { id: owner, displayName: typeof row.display_name === 'string' ? row.display_name : '', username: typeof row.username === 'string' ? row.username : '', bio: typeof row.bio === 'string' ? row.bio : '', avatarPath: path, avatarPreview: remote?.startsWith('https:') ? remote : null };
}
export function createProfileSaver(port: { upload: (photo: LocalPhoto) => Promise<string>; update: (input: ProfileFields) => Promise<OwnProfile> }) {
  let locked = false;
  let uploaded: { photo: LocalPhoto; path: string } | null = null;
  return { async save(input: ProfileFields, photo?: LocalPhoto) {
    if (locked) throw new ProfileEditFailure('A profile save is already in progress.');
    const fields = profileFields(input);
    locked = true;
    try {
      if (photo) {
        if (uploaded?.photo !== photo) uploaded = { photo, path: await port.upload(photo) };
        fields.avatarPath = uploaded.path;
      }
      const result = await port.update(fields);
      if (result.displayName !== fields.displayName || result.username !== fields.username || result.bio !== fields.bio || result.avatarPath !== fields.avatarPath) throw new ProfileEditFailure('Save result unconfirmed. Reload your saved profile before retrying.', true);
      return result;
    } finally { locked = false; }
  } };
}
