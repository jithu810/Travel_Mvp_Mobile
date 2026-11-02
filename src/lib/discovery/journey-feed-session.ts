import { discoveryLimit, isJourneyId } from './model';

type FeedSession = { ids: readonly string[]; index: number; account: string; expires: number; stops: Map<string, string> };
export function createJourneyFeedSessions(clock = Date.now) {
  const sessions = new Map<string, FeedSession>();
  let serial = 0;
  function create(ids: string[], selected: string, account: string) {
    const ordered = [...new Set(ids.filter(isJourneyId))].slice(0, discoveryLimit);
    const index = ordered.indexOf(selected);
    if (index < 0) return null;
    const token = `${clock().toString(36)}-${++serial}`;
    sessions.set(token, { ids: Object.freeze(ordered), index, account, expires: clock() + 30 * 60 * 1000, stops: new Map() });
    while (sessions.size > 3) sessions.delete(sessions.keys().next().value!);
    return token;
  }
  function get(token: string, account: string) {
    const session = sessions.get(token);
    if (!session || session.expires <= clock() || session.account !== account) { sessions.delete(token); return null; }
    return session;
  }
  function selectStop(token: string, account: string, id: string, stop: string) {
    const session = get(token, account);
    if (!session?.ids.includes(id)) return;
    session.stops.delete(id); session.stops.set(id, stop);
    while (session.stops.size > 12) session.stops.delete(session.stops.keys().next().value!);
  }
  return { create, get, selectStop };
}
export const journeyFeedSessions = createJourneyFeedSessions();

// Direction lock deliberately yields horizontal cards, multi-touch and fallback scroll.
export function feedGesture(dx: number, dy: number, touches: number, allowed: boolean) {
  return allowed && touches === 1 && Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx) * 1.7;
}
