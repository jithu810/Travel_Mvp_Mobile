import { publicSupabase } from '../supabase/public';
import type { PublicJourney } from '../../types/journey';
import { discoveryLimit, isJourneyId, normalizePublicDetail, normalizePublicJourney } from './model';

function client() {
  if (!publicSupabase) throw new Error('Public journey browsing is not configured yet.');
  return publicSupabase;
}

export async function resolvePhotos(journeys: PublicJourney[], signal: AbortSignal): Promise<PublicJourney[]> {
  const paths = [...new Set(journeys.flatMap(j => [j.cover, ...j.stops.map(s => s.photo)])
    .filter((path): path is string => Boolean(path?.startsWith('journey-media/'))))];
  const resolved = new Map<string, string>();
  // Existing private media bucket uses its public-journey RLS policy. Signing
  // grants temporary read access only; no media is uploaded or modified.
  if (paths.length && !signal.aborted) {
    try {
      const { data } = await client().storage.from('journey-media')
        .createSignedUrls(paths.map(path => path.slice('journey-media/'.length)), 3600);
      data?.forEach((item, index) => {
        if (item.signedUrl && !item.error) resolved.set(paths[index], item.signedUrl);
      });
    } catch { /* Unavailable photos use a neutral fallback; browsing still works. */ }
  }
  if (signal.aborted) throw new Error('Request cancelled.');
  const photo = (path: string | null) => path?.startsWith('journey-media/') ? resolved.get(path) || null : path;
  return journeys.map(j => ({ ...j, cover: photo(j.cover), stops: j.stops.map(s => ({ ...s, photo: photo(s.photo) })) }));
}

export async function loadPublicJourneys(signal: AbortSignal): Promise<PublicJourney[]> {
  const { data, error } = await client().rpc('get_public_journeys', {}).abortSignal(signal);
  if (error) throw new Error('We couldn’t load journeys. Check your connection and try again.');
  if (!Array.isArray(data)) throw new Error('Journey browsing is temporarily unavailable.');
  const journeys = data.slice(0, discoveryLimit).flatMap(value => {
    const journey = normalizePublicJourney(value);
    return journey ? [journey] : [];
  });
  return resolvePhotos(journeys, signal);
}

export async function loadPublicJourney(id: string, signal: AbortSignal): Promise<PublicJourney | null> {
  if (!isJourneyId(id)) return null;
  const api = client();
  const { data: cards, error: cardError } = await api.rpc('get_public_journeys', { journey_filter: id }).abortSignal(signal);
  if (cardError) throw new Error('We couldn’t load this journey. Please try again.');
  const card = Array.isArray(cards) ? cards.map(normalizePublicJourney).find(j => j?.id === id) : null;
  if (!card) return null;
  const { data, error } = await api.rpc('get_journey_detail', { target_id: id }).abortSignal(signal);
  if (error) throw new Error('We couldn’t load this journey. Please try again.');
  const detail = normalizePublicDetail(data, card);
  return detail ? (await resolvePhotos([detail], signal))[0] : null;
}
