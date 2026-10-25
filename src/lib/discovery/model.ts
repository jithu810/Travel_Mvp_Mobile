import type { JourneyStop, PublicJourney, TravelerType } from '../../types/journey';
import { travelerTypes } from '../../types/journey';

// Matches the public RPC's bound and the web's normalized substring semantics.
export const discoveryLimit = 100;
export const isJourneyId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
// Same UUID shape check, named for user/creator ids.
export const isUuid = isJourneyId;
type Row = Record<string, unknown>;
export function object(value: unknown): Row | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : null;
}
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;

export function safePhoto(value: unknown): string | null {
  const path = text(value);
  if (path.startsWith('journey-media/')) {
    const parts = path.split('/');
    return parts.length > 2 && parts.every(part => part && part !== '..' && part !== '.') ? path : null;
  }
  try { const url = new URL(path); return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null; }
  catch { return null; }
}
export function normalizeStops(value: unknown, detail = false): JourneyStop[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const row = object(item);
    if (!row || !text(row.id) || !text(row.name)) return [];
    const sequence = count(detail ? row.sequence : row.position);
    if (sequence === null) return [];
    return [{
      id: text(row.id), name: text(row.name), description: text(row.description), sequence,
      dayNumber: detail && count(row.day_number) ? count(row.day_number) : null,
      photo: detail ? safePhoto(row.photo_path) : null,
      latitude: detail && typeof row.latitude === 'number' && Number.isFinite(row.latitude) && Math.abs(row.latitude) <= 90 ? row.latitude : null,
      longitude: detail && typeof row.longitude === 'number' && Number.isFinite(row.longitude) && Math.abs(row.longitude) <= 180 ? row.longitude : null,
      rating: detail && typeof row.rating === 'number' && Number.isFinite(row.rating) && row.rating >= 0 && row.rating <= 5 ? row.rating : null,
    }];
  }).sort((a, b) => a.sequence - b.sequence);
}

// get_public_journeys guarantees published-only rows. Authenticated account
// Saved rows also qualify after explicit published/non-demo/saved=true guards.
// Never normalize arbitrary journeys-table or owner-visible detail rows as cards.
export function normalizePublicJourney(value: unknown): PublicJourney | null {
  const row = object(value);
  if (!row || !isJourneyId(text(row.id)) || row.is_demo !== false
    || (row.status !== undefined && row.status !== 'published')
    || !text(row.title) || !travelerTypes.includes(row.traveler_type as TravelerType)) return null;
  const slug = text(row.destination_slug);
  const destination = text(row.destination_name) || slug.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  return {
    id: text(row.id), title: text(row.title), description: text(row.description),
    destination: destination || 'Destination not specified', destinationSlug: slug,
    creatorName: text(row.creator_name) || 'Traveler', creatorUsername: text(row.creator_username) || null,
    travelerType: row.traveler_type as TravelerType, durationDays: count(row.duration_days) || null,
    likes: count(row.likes_count), cover: safePhoto(row.cover_image_path), stops: normalizeStops(row.stops),
  };
}

// Discovery keeps the RPC's creator_id beside, never inside, the public card so
// PublicJourney stays free of owner ids. A missing/invalid id keeps the journey.
export type DiscoveryEntry = { journey: PublicJourney; creatorId: string | null };
export function normalizeDiscoveryEntry(value: unknown): DiscoveryEntry | null {
  const journey = normalizePublicJourney(value);
  if (!journey) return null;
  const creatorId = text(object(value)?.creator_id);
  return { journey, creatorId: isUuid(creatorId) ? creatorId.toLowerCase() : null };
}
// Session state to discovery viewer. Loading holds the viewer-specific view;
// an unrestorable session, or a restore that outlasts its limit (timedOut), is
// treated as signed out (fail-open, matching Web).
export function discoveryViewer(auth: { session: { user: { id: string } } | null; loading: boolean; error: string | null }, timedOut = false) {
  if (auth.loading) return { pending: !timedOut, id: null };
  const id = !auth.error && auth.session ? auth.session.user.id : null;
  return { pending: false, id: id && isUuid(id) ? id.toLowerCase() : null };
}
// Per-viewer, render-time filter over the shared anonymous collection; order kept.
export function hideViewerJourneys(entries: readonly DiscoveryEntry[], viewerId: string | null | undefined): PublicJourney[] {
  const viewer = viewerId && isUuid(viewerId) ? viewerId.toLowerCase() : null;
  return entries.flatMap(entry => viewer && entry.creatorId === viewer ? [] : [entry.journey]);
}
export const onlyViewerJourneysCopy = 'Only your journeys so far. Find them in Search.';
// Browsing hides the viewer's own journeys; a typed search covers all of them.
export function discoveryJourneys(entries: readonly DiscoveryEntry[], viewerId: string | null | undefined, query: string): PublicJourney[] {
  return hideViewerJourneys(entries, query.trim() ? null : viewerId);
}

export function normalizePublicDetail(value: unknown, card: PublicJourney): PublicJourney | null {
  const row = object(value);
  // Anonymous transport AND a public-card gate protect detail. Fail closed on
  // drafts, missing status, different IDs and entries withdrawn during loading.
  if (!row || row.id !== card.id || row.status !== 'published' || row.is_demo !== false) return null;
  return {
    ...card,
    description: typeof row.description === 'string' ? row.description.trim() : card.description,
    cover: safePhoto(row.cover_image_path),
    stops: normalizeStops(row.stops, true),
  };
}

export function searchJourneys(journeys: PublicJourney[], query: string): PublicJourney[] {
  const term = query.trim().slice(0, 120).normalize('NFKC').toLocaleLowerCase('en');
  if (!term) return journeys;
  return journeys.filter(journey => [
    journey.title, journey.destination, journey.destinationSlug,
    journey.creatorName, journey.creatorUsername, ...journey.stops.map(stop => stop.name),
  ].join(' ').normalize('NFKC').toLocaleLowerCase('en').includes(term));
}
export const travelerLabel = (type: TravelerType) => ({ solo: 'Solo', couple: 'Couple', friends: 'Friends', family: 'Family' })[type];
export function journeyFacts(journey: PublicJourney) {
  return [journey.durationDays ? journey.durationDays + (journey.durationDays === 1 ? ' day' : ' days') : null,
    journey.stops.length + (journey.stops.length === 1 ? ' stop' : ' stops')].filter(Boolean).join(' · ');
}
