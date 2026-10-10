import { isJourneyId } from '../discovery/model';
import type { TravelerType, JourneyStop } from '../../types/journey';
export type Place = { name: string; label: string; latitude: number; longitude: number; mapboxId: string | null };
export type StopInput = { id: string; name: string; description: string; latitude: number | null; longitude: number | null; mapboxId: string | null; day: string; rating: string };
export type CreateForm = { id: string; title: string; description: string; destination: Place | null; traveler: TravelerType | ''; days: string; updatedAt: string | null; stops: StopInput[] };
export type SavePayload = ReturnType<typeof savePayload>;
export type Saved = { id: string; status: 'draft' | 'published'; updated_at: string };
export function newForm(id: string): CreateForm { return { id, title: '', description: '', destination: null, traveler: '', days: '1', updatedAt: null, stops: [] }; }
export function coordinates(latitude: unknown, longitude: unknown) {
  return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90 && typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}
export function slug(name: string) { return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'destination'; }
function optionalNumber(value: string) { return value.trim() ? Number(value) : null; }
export function validateForm(form: CreateForm, status: 'draft' | 'published'): string | null {
  if (status !== 'draft' && status !== 'published') return 'Invalid save action.';
  if (form.updatedAt !== null && !Number.isFinite(Date.parse(form.updatedAt))) return 'Invalid saved version. Check Account before saving.';
  if (!isJourneyId(form.id)) return 'The journey ID is invalid. Start a new journey.';
  if (!form.title.trim() || form.title.trim().length > 200) return 'Enter a journey title of 1–200 characters.';
  const destination = form.destination;
  if (!destination || !destination.name.trim() || destination.name.length > 200 || slug(destination.name).length > 200 || !coordinates(destination.latitude, destination.longitude)) return 'Search and select a destination.';
  if (!['solo','couple','friends','family'].includes(form.traveler)) return 'Select a traveler type.';
  const days = Number(form.days);
  if (!form.days.trim() || !Number.isInteger(days) || days < 1 || days > 365) return 'Duration must be 1–365 days.';
  if (form.description.length > 5000) return 'Description must be under 5,000 characters.';
  if (form.stops.length > 50 || (status === 'published' && !form.stops.length)) return 'Add at least one stop before publishing (maximum 50).';
  if (new Set(form.stops.map(stop => stop.id)).size !== form.stops.length) return 'Stops must have unique IDs.';
  for (const stop of form.stops) {
    if (!isJourneyId(stop.id) || !stop.name.trim() || stop.name.length > 200 || stop.description.length > 1000) return 'Check stop names and descriptions.';
    if (!(status === 'draft' && stop.latitude === null && stop.longitude === null) && !coordinates(stop.latitude, stop.longitude)) return 'Every published stop needs a selected location with valid coordinates.';
    const day = optionalNumber(stop.day), rating = optionalNumber(stop.rating);
    if (day !== null && (!Number.isInteger(day) || day < 1 || day > days)) return 'Stop days must fit within the journey duration.';
    if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > 5)) return 'Stop ratings must be between 0 and 5.';
    if (stop.mapboxId !== null && stop.mapboxId.length > 500) return 'Invalid place metadata.';
  }
  return null;
}
export function savePayload(form: CreateForm, status: 'draft' | 'published') {
  const destination = form.destination!;
  return { id: form.id, title: form.title.trim(), description: form.description, destination_slug: slug(destination.name),
    destination_name: destination.name, destination_latitude: destination.latitude, destination_longitude: destination.longitude,
    traveler_type: form.traveler, duration_days: Number(form.days), cover_image_path: null, status, updated_at: form.updatedAt,
    stops: form.stops.map((stop, index) => ({ id: stop.id, sequence: index + 1, name: stop.name.trim(), description: stop.description,
      latitude: stop.latitude, longitude: stop.longitude, mapbox_place_id: stop.mapboxId, photo_path: null, rating: optionalNumber(stop.rating), day_number: optionalNumber(stop.day) })) };
}
export function addStop(stops: StopInput[], place: Place, id: string): StopInput[] {
  if (stops.length >= 50 || !coordinates(place.latitude, place.longitude) || stops.some(stop => (place.mapboxId && stop.mapboxId === place.mapboxId) || (stop.latitude === place.latitude && stop.longitude === place.longitude))) return stops;
  return [...stops, { id, name: place.name, description: '', latitude: place.latitude, longitude: place.longitude, mapboxId: place.mapboxId, day: '', rating: '' }];
}
export function moveStop(stops: StopInput[], index: number, offset: number) {
  if (index < 0 || index >= stops.length || index + offset < 0 || index + offset >= stops.length) return stops;
  const next = [...stops]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next;
}
export function previewStops(stops: StopInput[]): JourneyStop[] {
  return stops.map((stop, index) => ({ id: stop.id, sequence: index + 1, name: stop.name, latitude: stop.latitude, longitude: stop.longitude,
    description: '', photo: null, rating: null, dayNumber: null }));
}
export class SaveFailure extends Error {
  constructor(message: string, readonly uncertain = false) { super(message); }
}
export function createSaveController(port: (payload: SavePayload, signal?: AbortSignal) => Promise<Saved>) {
  let busy = false, uncertain = false;
  let result: Saved | null = null;
  return {
    getResult: () => result, isUncertain: () => uncertain,
    async save(form: CreateForm, status: 'draft' | 'published', signal?: AbortSignal) {
      if (busy || uncertain) return { kind: 'blocked' as const };
      const error = validateForm(form, status);
      if (error) return { kind: 'error' as const, message: error };
      busy = true;
      try { result = await port(savePayload(form, status), signal); return { kind: 'saved' as const, saved: result }; }
      catch (cause) {
        uncertain = !(cause instanceof SaveFailure) || cause.uncertain;
        return { kind: 'error' as const, message: cause instanceof Error ? cause.message : 'Couldn’t confirm this save. Check Account before trying again.', uncertain };
      } finally { busy = false; }
    },
  };
}
