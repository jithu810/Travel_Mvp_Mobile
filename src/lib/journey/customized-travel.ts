import { randomUUID } from '../create/id';
import { tripStore } from './trip-session';
import type { Place } from '../create/model';
import { canOpenTravelMode } from './travel-preview';
import type { PublicJourney } from '../../types/journey';

// Process memory only: these IDs are never submitted to a backend query or write.
const itineraries = new Map<string, PublicJourney>();
const sourceIds = new Map<string, string>();
export function customizedTravel(id: string) { return itineraries.get(id) ?? null; }
export function customizedSourceId(id: string) { return sourceIds.get(id) ?? null; }
export function customizedTravelIssue(source: PublicJourney, selectedIds: readonly string[]) {
  if (!canOpenTravelMode(source) || !selectedIds.length || selectedIds.length > 50
    || new Set(selectedIds).size !== selectedIds.length || selectedIds.some(id => typeof id !== 'string')) {
    return 'Select between 1 and 50 valid stops to travel.';
  }
  if (selectedIds.some(id => !source.stops.some(stop => stop.id === id))) return 'Selected stops are unavailable. Please select them again.';
  return null;
}
export function createCustomizedTravel(source: PublicJourney, selectedIds: readonly string[]) {
  const issue = customizedTravelIssue(source, selectedIds);
  if (issue) throw new Error(issue);
  const ids = new Set(selectedIds);
  const stops = [...source.stops].sort((a, b) => a.sequence - b.sequence).filter(stop => ids.has(stop.id));
  // The selection screen retains this token while its selected stop IDs stay unchanged.
  const id = randomUUID();
  if (id === source.id || itineraries.has(id)) throw new Error('Could not create a separate local trip. Please try again.');
  const journey = { ...source, id, stops: stops.map(stop => ({ ...stop })) };
  if (!canOpenTravelMode(journey)) throw new Error('Selected stops are unavailable.');
  itineraries.set(id, journey);
  sourceIds.set(id, sourceIds.get(source.id) ?? source.id);
  return id;
}

// Remove only from this in-memory selection; captured trips and the source stay intact.
export function removeCustomizedStop(expected: PublicJourney, stopId: string) {
  if (customizedTravel(expected.id) !== expected) throw new Error('This route changed. Open the selected journey again.');
  const session = tripStore.get(expected.id);
  if (session.status === 'active' || session.status === 'paused') throw new Error('Finish this trip in Travel Mode before removing a stop.');
  if (!expected.stops.some(stop => stop.id === stopId)) throw new Error('This stop is no longer selected.');
  if (expected.stops.length <= 1) throw new Error('Keep at least one stop for your journey.');
  const id = createCustomizedTravel(expected, expected.stops.filter(stop => stop.id !== stopId).map(stop => stop.id));
  const next = itineraries.get(id)!;
  for (const [key, value] of itineraries) if (value === expected) itineraries.set(key, next);
  return id;
}

// Append a searched place without modifying a captured trip or any public journey.
export function appendCustomizedStop(expected: PublicJourney, place: Place) {
  if (customizedTravel(expected.id) !== expected) throw new Error('This route changed. Search for the place again.');
  const session = tripStore.get(expected.id);
  if (session.status === 'active' || session.status === 'paused') throw new Error('Finish this trip in Travel Mode before adding a stop.');
  if (expected.stops.length >= 50) throw new Error('A temporary route can include up to 50 stops.');
  if (!place || typeof place.name !== 'string' || !place.name.trim() || place.name.length > 200
    || typeof place.latitude !== 'number' || !Number.isFinite(place.latitude) || Math.abs(place.latitude) > 90
    || typeof place.longitude !== 'number' || !Number.isFinite(place.longitude) || Math.abs(place.longitude) > 180) {
    throw new Error('Choose a named search result with a valid map location.');
  }
  const stopId = randomUUID();
  if (expected.stops.some(stop => stop.id === stopId)) throw new Error('Could not identify this stop. Please try again.');
  const sequence = Math.max(...expected.stops.map(stop => stop.sequence)) + 1;
  if (!Number.isSafeInteger(sequence)) throw new Error('This route cannot accept another stop.');
  const updated = { ...expected, stops: [...expected.stops, { id: stopId, name: place.name.trim(), latitude: place.latitude,
    longitude: place.longitude, sequence, description: '', photo: null, rating: null, dayNumber: null }] };
  const id = createCustomizedTravel(updated, updated.stops.map(stop => stop.id));
  const next = itineraries.get(id)!;
  // Old preview tokens follow edits, so returning through Customize can still reach the trip.
  for (const [key, value] of itineraries) if (value === expected) itineraries.set(key, next);
  return id;
}
