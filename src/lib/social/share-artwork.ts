import type { PublicJourney } from '../../types/journey';
import { safePhoto } from '../discovery/model';
import { publicJourneyUrl } from './sharing';
export type ShareArtwork = { journeyId: string; memoryId: string | null; title: string; location: string; photo: string | null; url: string };
// Freeze visible selection at the user's Share tap, never substitute the cover/first photo.
export function createShareArtwork(journey: PublicJourney, selectedId: string | null | undefined, origin: string | undefined): ShareArtwork | null {
  const url = publicJourneyUrl(journey.id, origin);
  if (!url) return null;
  const memory = journey.stops.find(stop => stop.id === selectedId);
  return { journeyId: journey.id, memoryId: memory?.id ?? null, title: journey.title,
    location: memory?.name || journey.destination, photo: safePhoto(memory?.photo), url };
}
