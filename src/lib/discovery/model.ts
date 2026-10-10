import type { JourneyStop, PublicJourney, TravelerType } from '../../types/journey';
import { travelerTypes } from '../../types/journey';

// Matches the public RPC's bound and the web's normalized substring semantics.
export const discoveryLimit = 100;
export const isJourneyId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
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

// Only call for get_public_journeys: the RPC guarantees published-only rows.
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
