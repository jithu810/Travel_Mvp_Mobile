import { isJourneyId } from '../discovery/model';
export type ActionIntent = { token: number; journeyId: string; action: 'like' | 'save' | 'remix' };
export function createIntentStore() {
  let current: ActionIntent | null = null;
  let serial = 0;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  return {
    getSnapshot: () => current,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    begin(journeyId: string, action: ActionIntent['action']) {
      if (current || !isJourneyId(journeyId) || !['like', 'save', 'remix'].includes(action)) return false;
      current = { token: ++serial, journeyId, action }; notify(); return true;
    },
    consume(token: number) {
      if (current?.token !== token) return null;
      const result = current; current = null; notify(); return result;
    },
    cancel() { current = null; notify(); },
  };
}
