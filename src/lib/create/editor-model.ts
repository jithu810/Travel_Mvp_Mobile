import { object, isJourneyId } from '../discovery/model';
import { coordinates, slug, type CreateForm, type Place, type StopInput } from './model';

export function suggestedTitle(destination: Place) { return (destination.name + ' journey').slice(0, 200); }
export function selectDestination(form: CreateForm, destination: Place, titleEdited: boolean): CreateForm {
  return { ...form, destination, destinationSlug: slug(destination.name), title: titleEdited ? form.title : suggestedTitle(destination) };
}
function nullableText(value: unknown, limit: number): value is string | null {
  return value === null || typeof value === 'string' && value.length <= limit;
}
function optionalNumeric(value: unknown, min: number, max: number, integer = false): value is number | null {
  return value === null || typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
}
// This is an editor projection, never the signed-photo display projection.
// Fail closed rather than silently filtering stops or discarding media/versions.
export function hydrateDraft(value: unknown, values: unknown, id: string, owner: string): CreateForm {
  const row = object(value);
  if (!row || row.id !== id || !isJourneyId(id) || row.user_id !== owner || row.status !== 'draft' || row.is_demo !== false
    || typeof row.updated_at !== 'string' || !Number.isFinite(Date.parse(row.updated_at))
    || typeof row.title !== 'string' || !nullableText(row.description, 5000) || !nullableText(row.cover_image_path, 2000)
    || !nullableText(row.destination_slug, 200) || !nullableText(row.destination_name, 200)
    || !optionalNumeric(row.destination_latitude, -90, 90) || !optionalNumeric(row.destination_longitude, -180, 180)
    || !optionalNumeric(row.duration_days, 1, 365, true) || row.duration_days === null
    || !(row.traveler_type === null || ['solo', 'couple', 'friends', 'family'].includes(String(row.traveler_type)))
    || !Array.isArray(values) || values.length > 50) throw new Error('This private draft cannot be safely loaded for editing. Check Account or retry.');
  const stops: StopInput[] = [];
  const ordered = values.map(object);
  if (ordered.some(stop => !stop)) throw new Error('Draft stop data is incomplete. Nothing has been changed.');
  ordered.sort((a, b) => Number(a!.sequence) - Number(b!.sequence));
  for (const [index, stop] of ordered.entries()) {
    if (!stop || !isJourneyId(String(stop.id)) || stop.journey_id !== id || stop.sequence !== index + 1
      || typeof stop.name !== 'string' || !nullableText(stop.description, 1000) || !nullableText(stop.photo_path, 2000)
      || !nullableText(stop.mapbox_place_id, 500) || !optionalNumeric(stop.rating, 0, 5)
      || !optionalNumeric(stop.day_number, 1, 365, true)
      || !((stop.latitude === null && stop.longitude === null) || coordinates(stop.latitude, stop.longitude))) {
      throw new Error('Draft stop data is incomplete. Nothing has been changed.');
    }
    stops.push({ id: stop.id as string, name: stop.name, description: stop.description ?? '', descriptionWasNull: stop.description === null,
      latitude: stop.latitude as number | null, longitude: stop.longitude as number | null, mapboxId: stop.mapbox_place_id,
      photoPath: stop.photo_path, day: stop.day_number === null ? '' : String(stop.day_number), rating: stop.rating === null ? '' : String(stop.rating) });
  }
  if (new Set(stops.map(stop => stop.id)).size !== stops.length) throw new Error('Draft stop IDs are duplicated. Nothing has been changed.');
  const destination = row.destination_name && coordinates(row.destination_latitude, row.destination_longitude)
    ? { name: row.destination_name, label: row.destination_name, latitude: row.destination_latitude as number, longitude: row.destination_longitude as number, mapboxId: null } : null;
  return { id, title: row.title, description: row.description ?? '', descriptionWasNull: row.description === null,
    destination, destinationSlug: row.destination_slug ?? undefined, traveler: (row.traveler_type ?? '') as CreateForm['traveler'],
    days: String(row.duration_days), updatedAt: row.updated_at, coverPath: row.cover_image_path, stops };
}