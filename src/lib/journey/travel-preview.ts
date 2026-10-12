import { isJourneyId } from '../discovery/model';
import type { PublicJourney } from '../../types/journey';

// Eligibility for the UI preview only. Coordinates are optional; no session is created.
export function canOpenTravelMode(journey: PublicJourney | null): journey is PublicJourney {
  return Boolean(journey && isJourneyId(journey.id) && journey.title.trim() && journey.stops.length
    && new Set(journey.stops.map(stop => stop.id)).size === journey.stops.length
    && journey.stops.every(stop => stop.id.trim() && stop.name.trim() && Number.isSafeInteger(stop.sequence) && stop.sequence >= 0));
}
