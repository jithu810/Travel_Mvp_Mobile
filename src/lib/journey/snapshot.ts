import type { PublicJourney } from '../../types/journey';

// Same public-fact rules as the web Journey Intelligence. No route/GPS input.
// Geographic spread is omitted because this mobile projection has no coordinates.
export function storySnapshot(journey: PublicJourney) {
  const seen = new Set<string>();
  const stops = journey.stops.filter(stop => {
    if (!stop.id?.trim() || ['undefined', 'null'].includes(stop.id) || seen.has(stop.id)
      || !stop.name?.trim() || !Number.isInteger(stop.sequence) || stop.sequence < 0) return false;
    seen.add(stop.id);
    return true;
  });
  const assigned = stops.filter(stop => Number.isInteger(stop.dayNumber) && stop.dayNumber! > 0);
  const dayCount = stops.length && assigned.length === stops.length
    ? new Set(assigned.map(stop => stop.dayNumber)).size : null;
  const averageStopsPerDay = dayCount ? stops.length / dayCount : null;
  const pace = averageStopsPerDay === null ? null : averageStopsPerDay <= 2 ? 'Relaxed'
    : averageStopsPerDay <= 4 ? 'Balanced' : 'Packed';
  const photos = stops.filter(stop => Boolean(stop.photo?.trim())).length;
  const descriptions = stops.filter(stop => Boolean(stop.description?.trim())).length;
  const signals = [
    ...(photos >= 2 && photos / stops.length >= 0.5 ? ['Photo-rich'] : []),
    ...(descriptions >= 2 && descriptions / stops.length >= 0.5 ? ['Detailed stops'] : []),
  ];
  return { stopCount: stops.length, dayCount, averageStopsPerDay, pace, signals };
}

export const futureActions = ['Start Journey'] as const;

export function hasStory(journey: PublicJourney) {
  return Boolean(journey.description.trim());
}
