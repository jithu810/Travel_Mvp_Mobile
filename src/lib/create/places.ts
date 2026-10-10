import { object } from '../discovery/model';
import { coordinates, type Place } from './model';
export function normalizePlace(value: unknown): Place | null {
  const row = object(value), properties = object(row?.properties), geometry = object(row?.geometry);
  const point = geometry?.coordinates;
  const name = properties?.name ?? properties?.full_address;
  if (!row || typeof name !== 'string' || !name.trim() || name.length > 200 || !Array.isArray(point) || !coordinates(point[1], point[0])) return null;
  return { name, label: typeof properties?.full_address === 'string' ? properties.full_address : name, latitude: point[1] as number, longitude: point[0] as number,
    mapboxId: typeof properties?.mapbox_id === 'string' ? properties.mapbox_id : typeof row.id === 'string' ? row.id : null };
}
export async function searchPlaces(query: string, destinationOnly: boolean, proximity: Place | null, signal: AbortSignal, token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim(), request: typeof fetch = fetch): Promise<Place[]> {
  if (!token?.startsWith('pk.')) throw new Error('Mapbox place search is not configured.');
  const term = query.trim();
  if (term.length < 3 || term.length > 200 || term.includes(';') || term.split(/\s+/).length > 20) throw new Error('Enter 3–200 characters, up to 20 words, without semicolons.');
  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
  url.search = new URLSearchParams({ q: term, access_token: token, autocomplete: 'true', permanent: 'true', limit: '5', language: 'en',
    ...(destinationOnly ? { types: 'country,region,district,place,locality,neighborhood' } : {}),
    ...(proximity ? { proximity: proximity.longitude + ',' + proximity.latitude } : {}) }).toString();
  const controller = new AbortController(), abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort();
  const timer = setTimeout(abort, 15000);
  try {
    const response = await request(url.toString(), { signal: controller.signal });
    if (!response.ok) throw new Error('Place search is unavailable. Please try again.');
    const data = object(await response.json());
    if (!Array.isArray(data?.features)) throw new Error('Place search returned an invalid response.');
    return data.features.flatMap(value => { const place = normalizePlace(value); return place ? [place] : []; });
  } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
}
