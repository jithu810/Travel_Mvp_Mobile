import type { JourneyStop } from '../../types/journey';
import { coordinates, requestRoadRoute, type RoadRoute } from '../journey/navigation';
export type Selection = { decisions: Record<string, boolean>; cursor: number; history: { id: string; previous: boolean | undefined; cursor: number }[] };
export const emptySelection = (): Selection => ({ decisions: {}, cursor: 0, history: [] });
export function orderedStops(stops: readonly JourneyStop[]) { return [...stops].sort((a, b) => a.sequence - b.sequence); }
export function decide(state: Selection, stops: readonly JourneyStop[], keep: boolean): Selection {
  const stop = orderedStops(stops)[state.cursor];
  if (!stop) return state;
  return { decisions: { ...state.decisions, [stop.id]: keep }, cursor: state.cursor + 1,
    history: [...state.history, { id: stop.id, previous: state.decisions[stop.id], cursor: state.cursor }] };
}
export function undoSelection(state: Selection): Selection {
  const last = state.history.at(-1);
  if (!last) return state;
  const decisions = { ...state.decisions };
  if (last.previous === undefined) delete decisions[last.id]; else decisions[last.id] = last.previous;
  return { decisions, cursor: last.cursor, history: state.history.slice(0, -1) };
}
export function selectedStops(stops: readonly JourneyStop[], state: Selection) { return orderedStops(stops).filter(stop => state.decisions[stop.id] === true); }
export function selectionIssue(stops: readonly JourneyStop[]) {
  if (!stops.length) return 'Keep at least one stop to create your draft.';
  if (stops.length > 50) return 'Keep no more than 50 stops.';
  if (new Set(stops.map(stop => stop.id)).size !== stops.length) return 'This journey has duplicate stops. Reload before continuing.';
  if (stops.some(stop => !coordinates(stop))) return 'Every selected stop needs a valid map location. Skip stops without a location before continuing.';
  return null;
}
export async function requestSelectedRoute(stops: readonly JourneyStop[], token: string | undefined, signal: AbortSignal,
  request = requestRoadRoute): Promise<RoadRoute | null> {
  const ordered = orderedStops(stops);
  const issue = selectionIssue(ordered);
  if (issue) throw new Error(issue);
  let route: RoadRoute | null = null;
  for (let index = 1; index < ordered.length; index++) {
    if (signal.aborted) throw new Error('Route preview cancelled.');
    const start = ordered[index - 1], end = ordered[index];
    if (!coordinates(start) || !coordinates(end)) throw new Error('Stop locations unavailable.');
    const leg = await request(start, end, token, signal);
    if (signal.aborted) throw new Error('Route preview cancelled.');
    route = route ? { geometry: { type: 'LineString', coordinates: [...route.geometry.coordinates, ...leg.geometry.coordinates.slice(1)] },
      distance: route.distance + leg.distance, duration: route.duration === null || leg.duration === null ? null : route.duration + leg.duration } : leg;
  }
  return route;
}
