import { publicSupabase } from '../supabase/public';
import type { PublicJourney } from '../../types/journey';
import { discoveryLimit, isJourneyId, normalizePublicDetail, normalizePublicJourney } from './model';
import { createRequestCache } from './request-cache';
import { storedThumbnailsEnabled, thumbnailStoragePath } from '../media/image-variants';

const collections = createRequestCache<PublicJourney[]>(1, 45000);
const signed = createRequestCache<string>(512, 3300000);
type Signing = { path: string; signal: AbortSignal; resolve: (url: string) => void; reject: (error: Error) => void };
const signingQueue: Signing[] = [];
let signingActive = 0;
let signingTransports = 0;
let signingScheduled = false;
function flushSigning() {
  signingScheduled = false;
  if (signingTransports >= 4) {
    signingQueue.splice(0).forEach(job => job.reject(new Error('Photo service unavailable. Please retry.')));
    return;
  }
  while (signingActive < 2 && signingTransports < 4 && signingQueue.length) {
    const batch = signingQueue.splice(0, 32).filter(job => {
      if (!job.signal.aborted) return true;
      job.reject(new Error('Request cancelled.')); return false;
    });
    if (!batch.length) continue;
    signingActive++;
    signingTransports++;
    let deadline: ReturnType<typeof setTimeout>;
    const transport = Promise.resolve().then(() => client().storage.from('journey-media').createSignedUrls(batch.map(job => job.path), 3600));
    // The client fetch is independently bounded; this deadline also protects
    // worker slots from broken/mock transports that never settle. At most four
    // underlying calls may remain outstanding, including timed-out calls.
    void transport.then(() => { signingTransports--; flushSigning(); }, () => { signingTransports--; flushSigning(); });
    void Promise.race([transport, new Promise<never>((_resolve, reject) => {
      deadline = setTimeout(() => reject(new Error('Photo service timed out.')), 12000);
    })])
      .then(({ data }) => batch.forEach((job, index) => {
        const item = data?.[index];
        if (!job.signal.aborted && item?.signedUrl && !item.error) job.resolve(item.signedUrl);
        else job.reject(new Error('Photo unavailable.'));
      }), () => batch.forEach(job => job.reject(new Error('Photo unavailable.'))))
      .finally(() => { clearTimeout(deadline); signingActive--; flushSigning(); });
  }
}
function signedPhoto(path: string, signal: AbortSignal) {
  // The module's isolated public client fixes project/bucket/original variant.
  return signed.get('journey-media/original/' + path, signal, upstream => new Promise<string>((resolve, reject) => {
    if (signingQueue.length >= 512) { reject(new Error('Photo queue full.')); return; }
    signingQueue.push({ path, signal: upstream, resolve, reject });
    if (!signingScheduled) { signingScheduled = true; queueMicrotask(flushSigning); }
  }));
}
export function invalidatePublicJourneys() { collections.clear(); signed.clear(); }

function client() {
  if (!publicSupabase) throw new Error('Public journey browsing is not configured yet.');
  return publicSupabase;
}

export async function resolvePhotos(journeys: PublicJourney[], signal: AbortSignal): Promise<PublicJourney[]> {
  const thumbnailPath = (path: string | null) => storedThumbnailsEnabled() && path ? thumbnailStoragePath(path) : null;
  const paths = [...new Set(journeys.flatMap(j => [j.cover, thumbnailPath(j.cover), ...j.stops.flatMap(s => [s.photo, thumbnailPath(s.photo)])])
    .filter((path): path is string => Boolean(path?.startsWith('journey-media/'))))];
  const resolved = new Map<string, string>();
  // Existing private media bucket uses its public-journey RLS policy. Signing
  // grants temporary read access only; no media is uploaded or modified.
  if (paths.length && !signal.aborted) {
    await Promise.all(paths.map(async path => {
      try { resolved.set(path, await signedPhoto(path.slice('journey-media/'.length), signal)); }
      catch { /* Individual unavailable photos retain the existing fallback. */ }
    }));
  }
  if (signal.aborted) throw new Error('Request cancelled.');
  const photo = (path: string | null) => path?.startsWith('journey-media/') ? resolved.get(path) || null : path;
  return journeys.map(j => ({ ...j, cover: photo(j.cover), ...(thumbnailPath(j.cover) ? { coverThumbnail: photo(thumbnailPath(j.cover)) } : {}), stops: j.stops.map(s => ({ ...s, photo: photo(s.photo), ...(thumbnailPath(s.photo) ? { photoThumbnail: photo(thumbnailPath(s.photo)) } : {}) })) }));
}

export async function loadPublicJourneys(signal: AbortSignal): Promise<PublicJourney[]> {
  const journeys = await collections.get('public', signal, async upstream => {
    const { data, error } = await client().rpc('get_public_journeys', {}).abortSignal(upstream);
    if (error) throw new Error('We couldn’t load journeys. Check your connection and try again.');
    if (!Array.isArray(data)) throw new Error('Journey browsing is temporarily unavailable.');
    return data.slice(0, discoveryLimit).flatMap(value => {
      const journey = normalizePublicJourney(value);
      return journey ? [journey] : [];
    });
  });
  return resolvePhotos(journeys.map(journey => ({ ...journey, stops: journey.stops.map(stop => ({ ...stop })) })), signal);
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
