import { isJourneyId } from '../discovery/model';
import { resolvePhotos } from '../discovery/queries';
import { createRequestCache } from '../discovery/request-cache';
import { publicSupabase } from '../supabase/public';
import type { PublicJourney } from '../../types/journey';
import { emptyMemoryMap, memoryMapJourneyLimit, normalizeMemoryMap, type MemoryMapModel, type MemoryPin } from './memory-map';

const journeyColumns = 'id,title,status,is_demo,user_id,updated_at,journey_stops(id,name,sequence,day_number,latitude,longitude,photo_path)';
// Process-memory only, viewer-independent anonymous data (like discovery's collection
// cache): returning from Story within 45 s reuses the same pins without a refetch.
export const memoryMapCacheTtl = 45000;
const maps = createRequestCache<MemoryMapModel>(4, memoryMapCacheTtl);
// Signing is best-effort and separately bounded; slow photos fall back to stop art.
export const memoryMapSigningBudget = 8000;

// Anonymous client only: the persistent authenticated client would also return the
// owner's drafts through RLS (user_id = auth.uid()). The explicit filters plus the
// client-side guard in normalizeMemoryMap keep every viewer on published-only data.
// fresh: pull-to-refresh / foreground refresh bypass the short cache.
export async function loadProfileMemoryMap(ownerId: string, signal: AbortSignal, options: { fresh?: boolean } = {}): Promise<MemoryMapModel> {
  if (!isJourneyId(ownerId)) return emptyMemoryMap();
  const client = publicSupabase;
  if (!client) throw new Error('Public profiles are not configured yet.');
  if (signal.aborted) throw new Error('Request cancelled.');
  if (options.fresh) maps.clear();
  return maps.get(ownerId.toLowerCase(), signal, async upstream => {
    const { data, error } = await client.from('journeys').select(journeyColumns)
      .eq('user_id', ownerId).eq('status', 'published').eq('is_demo', false)
      .order('updated_at', { ascending: false }).order('id')
      .order('sequence', { referencedTable: 'journey_stops', ascending: true })
      .limit(memoryMapJourneyLimit)
      .abortSignal(upstream);
    if (error) throw new Error('We couldn’t load the travel map. Check your connection and retry.');
    return normalizeMemoryMap(data, ownerId);
  });
}

const https = (value: string | null | undefined) => typeof value === 'string' && value.startsWith('https://') ? value : null;

// Signs featured photos through the shared bounded queue/cache, after the pins are
// already shown. Never rejects for photo problems: unsigned, failed, slow (beyond the
// budget) or unsafe photos resolve to null so the pin keeps its stop art. Rejects only
// when the caller cancels.
export async function signMemoryPins(pins: readonly MemoryPin[], signal: AbortSignal, budget = memoryMapSigningBudget): Promise<MemoryPin[]> {
  const featured = pins.filter(pin => pin.featured && pin.photoPath);
  const photos = new Map<string, { photo: string | null; photoThumbnail: string | null }>();
  if (featured.length) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) controller.abort();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    // Each pin travels as a one-stop card so results map back by stop id.
    const carriers: PublicJourney[] = featured.map(pin => ({
      id: pin.journeyId, title: pin.journeyTitle, description: '', destination: '', destinationSlug: '', creatorName: '', creatorUsername: null,
      travelerType: 'solo', durationDays: null, likes: null, cover: null,
      stops: [{ id: pin.stopId, name: pin.stopName, description: '', sequence: 0, dayNumber: null, photo: pin.photoPath, rating: null, latitude: pin.latitude, longitude: pin.longitude }],
    }));
    try {
      // Settles at the budget or as soon as the caller cancels, even if a transport ignores abort.
      const signed = await Promise.race([resolvePhotos(carriers, controller.signal), new Promise<null>(resolve => {
        timeout = setTimeout(() => { controller.abort(); resolve(null); }, budget);
        controller.signal.addEventListener('abort', () => resolve(null), { once: true });
      })]);
      signed?.forEach((carrier, index) => {
        const stop = carrier.stops[0], pin = featured[index];
        if (!stop || !pin || carrier.id !== pin.journeyId || stop.id !== pin.stopId) return;
        photos.set(pin.key, { photo: https(stop.photo), photoThumbnail: https(stop.photoThumbnail) });
      });
    } catch { /* Photos are optional; art remains. */ }
    finally { clearTimeout(timeout); signal.removeEventListener('abort', abort); }
  }
  if (signal.aborted) throw new Error('Request cancelled.');
  return pins.map(pin => {
    const media = pin.featured ? photos.get(pin.key) : undefined;
    return { ...pin, photo: media?.photo ?? null, photoThumbnail: media?.photoThumbnail ?? null };
  });
}
