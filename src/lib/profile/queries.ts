import { isJourneyId } from '../discovery/model';
import { publicSupabase } from '../supabase/public';
import { resolvePhotos } from '../discovery/queries';
import { normalizeProfileJourneys, normalizePublicProfile, validHandle } from './model';

export async function loadPublicProfile(handle: string, signal: AbortSignal) {
  if (!validHandle(handle)) return null;
  const client = publicSupabase;
  if (!client) throw new Error('Public profiles are not configured yet.');
  const { data, error } = await client.rpc('get_public_profile', { handle }).abortSignal(signal);
  if (error) throw new Error('We couldn’t load this creator. Check your connection and retry.');
  if (!data) return null;
  const profile = normalizePublicProfile(data, handle);
  if (!profile) throw new Error('This creator profile is temporarily unavailable.');
  const { data: rows, error: journeyError } = await client.rpc('get_account_journeys', { owner_id: profile.id, collection: 'published' }).abortSignal(signal);
  if (journeyError) throw new Error('We couldn’t load this creator’s public journeys. Please try again.');
  const journeys = await resolvePhotos(normalizeProfileJourneys(rows, profile.id), signal);
  if (profile.avatar?.startsWith('profile-avatars/')) {
    try {
      const { data: media } = await client.storage.from('profile-avatars')
        .createSignedUrls([profile.avatar.slice('profile-avatars/'.length)], 3600);
      profile.avatar = media?.[0]?.signedUrl && !media[0].error ? media[0].signedUrl : null;
    } catch { profile.avatar = null; }
  }
  if (signal.aborted) throw new Error('Request cancelled.');
  return { profile, journeys };
}

// Same anonymous published collection contract used by public creator profiles.
export async function loadPublishedProfileJourneys(ownerId: string, signal: AbortSignal) {
  if (!isJourneyId(ownerId)) return [];
  const client = publicSupabase;
  if (!client) throw new Error('Public profiles are not configured yet.');
  const { data, error } = await client.rpc('get_account_journeys', { owner_id: ownerId, collection: 'published' }).abortSignal(signal);
  if (error) throw new Error('We couldn’t load your published journeys. Please try again.');
  return resolvePhotos(normalizeProfileJourneys(data, ownerId), signal);
}
