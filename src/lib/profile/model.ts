import { isJourneyId, normalizePublicJourney, object, safePhoto } from '../discovery/model';
export const validHandle = (handle: string) => /^[a-zA-Z0-9_]{3,30}$/.test(handle) && handle.toLowerCase() !== 'edit';
export type PublicProfile = { id: string; username: string; displayName: string | null; bio: string | null; avatar: string | null };
const optionalText = (value: unknown, max: number) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
export function normalizePublicProfile(value: unknown, handle: string): PublicProfile | null {
  const row = object(value);
  if (!validHandle(handle) || !row || typeof row.id !== 'string' || !isJourneyId(row.id)
    || typeof row.username !== 'string' || !validHandle(row.username) || row.username.toLowerCase() !== handle.toLowerCase()) return null;
  let avatar = safePhoto(row.avatar_path);
  if (typeof row.avatar_path === 'string' && row.avatar_path.startsWith('profile-avatars/' + row.id + '/')) {
    const parts = row.avatar_path.split('/');
    if (parts.length >= 3 && parts.every(part => part && part !== '.' && part !== '..')) avatar = row.avatar_path;
  }
  return { id: row.id, username: row.username, displayName: optionalText(row.display_name, 80), bio: optionalText(row.bio, 500),
    avatar: avatar?.startsWith('journey-media/') ? null : avatar };
}
export function normalizeProfileJourneys(value: unknown, ownerId: string) {
  if (!Array.isArray(value)) throw new Error('Public journeys are temporarily unavailable.');
  return value.flatMap(item => {
    const row = object(item);
    if (!row || row.status !== 'published' || row.creator_id !== ownerId) return [];
    const journey = normalizePublicJourney(row);
    return journey ? [journey] : [];
  });
}
