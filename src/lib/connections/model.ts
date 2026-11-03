import type { ConnectionCollection, ConnectionCommand, ConnectionItem, ConnectionPage, ConnectionPort, ConnectionSummary } from './types';

export type ConnectionSnapshot = {
  summary: ConnectionSummary | null;
  loading: boolean;
  busy: ConnectionCommand['action'] | null;
  error: string | null;
  message: string | null;
  uncertain: boolean;
  collection: ConnectionCollection | null;
  items: ConnectionItem[];
  nextCursor: string | null;
  listLoading: boolean;
  listError: string | null;
};

const unavailable = 'Connections are not available in this build yet.';
function failure(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message === unavailable ? unavailable : fallback;
}
function validSummary(value: ConnectionSummary, targetId: string) {
  return value?.targetId === targetId && ['none', 'incoming', 'outgoing', 'friends'].includes(value.friendStatus)
    && typeof value.following === 'boolean'
    && [value.followRevision, value.friendsCount, value.followingCount, value.unreadCount].every(n => Number.isSafeInteger(n) && n >= 0)
    && (value.requestId === null || typeof value.requestId === 'string')
    && (value.requestRevision === null || (Number.isSafeInteger(value.requestRevision) && value.requestRevision >= 0));
}
function matchesResult(summary: ConnectionSummary, command: ConnectionCommand) {
  if (command.action === 'follow') return summary.following === command.enabled;
  if (command.action === 'request') return summary.friendStatus === 'outgoing' && summary.requestId === command.requestId;
  if (command.action === 'accept') return summary.friendStatus === 'friends' && summary.requestId === command.requestId;
  if (command.action === 'decline' || command.action === 'cancel' || command.action === 'remove') return summary.friendStatus === 'none';
  return true;
}

// Every operation belongs to one focused session/target. No optimistic relationship
// state is published, and a timed-out mutation can only be reconciled by a read.
export function createConnectionsController(port: ConnectionPort | null, targetId: string, viewerId: string | null, uuid: () => string, timeoutMs = 15000) {
  let snapshot: ConnectionSnapshot = { summary: null, loading: false, busy: null, error: null, message: null, uncertain: false,
    collection: null, items: [], nextCursor: null, listLoading: false, listError: null };
  const listeners = new Set<() => void>(), pending = new Set<AbortController>();
  let active = false, disposed = false, generation = 0, listVersion = 0;
  let listCancel: AbortController | null = null;
  const publish = (update: Partial<ConnectionSnapshot>) => {
    if (disposed) return;
    snapshot = { ...snapshot, ...update };
    listeners.forEach(listener => listener());
  };
  function invalidate() {
    generation++; listVersion++;
    pending.forEach(controller => controller.abort());
    pending.clear();
  }
  async function request<T>(operation: (signal: AbortSignal) => Promise<T>, list = false): Promise<T> {
    const controller = new AbortController(); pending.add(controller);
    if (list) { listCancel?.abort(); listCancel = controller; }
    let rejectAbort: (() => void) | undefined;
    const cancelled = new Promise<never>((_resolve, reject) => {
      rejectAbort = () => reject(new Error('Connection request cancelled.'));
      controller.signal.addEventListener('abort', rejectAbort, { once: true });
    });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try { return await Promise.race([operation(controller.signal), cancelled]); }
    finally {
      clearTimeout(timer); pending.delete(controller);
      if (listCancel === controller) listCancel = null;
      if (rejectAbort) controller.signal.removeEventListener('abort', rejectAbort);
      controller.abort();
    }
  }
  const current = (version: number) => active && !disposed && generation === version;
  async function loadCollection(collection: ConnectionCollection, more = false) {
    if (!active || !port || snapshot.busy || snapshot.listLoading || !snapshot.summary || targetId !== viewerId) return;
    const cursor = more ? snapshot.nextCursor : null;
    if (more && (!cursor || snapshot.collection !== collection)) return;
    const version = generation, list = ++listVersion;
    const previous = more ? snapshot.items : [];
    publish({ collection, items: previous, nextCursor: null, listLoading: true, listError: null });
    try {
      const page: ConnectionPage = await request(signal => port.list(collection, cursor, signal), true);
      if (!current(version) || list !== listVersion || snapshot.collection !== collection) return;
      if (!Array.isArray(page.items) || (page.nextCursor !== null && typeof page.nextCursor !== 'string')) throw new Error('Invalid collection.');
      const items = new Map(previous.map(item => [item.id, item]));
      page.items.forEach(item => items.set(item.id, item));
      publish({ items: [...items.values()], nextCursor: page.nextCursor, listLoading: false });
    } catch (reason) {
      if (current(version) && list === listVersion && snapshot.collection === collection)
        publish({ items: previous, nextCursor: cursor, listLoading: false, listError: failure(reason, 'Couldn’t load this collection. Retry to check it again.') });
    }
  }
  async function load() {
    if (!active || !port || snapshot.busy || snapshot.loading) return;
    invalidate(); const version = generation;
    publish({ summary: null, loading: true, error: null, message: null, listLoading: false, items: [], nextCursor: null, listError: null });
    try {
      const summary = await request(signal => port.read(signal));
      if (!current(version)) return;
      if (!validSummary(summary, targetId)) throw new Error('Invalid connection state.');
      publish({ summary, loading: false, uncertain: false });
      if (snapshot.collection) void loadCollection(snapshot.collection);
    } catch (reason) {
      if (current(version)) publish({ summary: null, loading: false, error: failure(reason, 'Couldn’t check connections. Retry before making changes.') });
    }
  }
  function allowed(peerId: string, command: ConnectionCommand) {
    const summary = snapshot.summary;
    if (!summary || !viewerId || (peerId === viewerId && command.action !== 'read')) return false;
    if (command.action === 'read') return peerId === viewerId && targetId === viewerId && command.notificationIds.length > 0
      && command.notificationIds.every(id => snapshot.collection === 'inbox' && snapshot.items.some(item => item.id === id && item.readAt === null));
    if (peerId === targetId) {
      if (command.action === 'request') return summary.friendStatus === 'none';
      if (command.action === 'follow') return command.expectedRevision === summary.followRevision && command.enabled !== summary.following;
      if (command.action === 'remove') return summary.friendStatus === 'friends' && command.requestId === summary.requestId;
      return command.requestId === summary.requestId && command.expectedRevision === summary.requestRevision
        && (command.action === 'cancel' ? summary.friendStatus === 'outgoing' : summary.friendStatus === 'incoming');
    }
    if (targetId !== viewerId || snapshot.listLoading || snapshot.listError) return false;
    const item = snapshot.items.find(row => row.person.id === peerId && (command.action === 'follow' || row.requestId === command.requestId));
    if (!item) return false;
    if (command.action === 'follow') return snapshot.collection === 'following' && !command.enabled && command.expectedRevision === item.revision;
    if (command.action === 'remove') return snapshot.collection === 'friends' && item.status === 'accepted';
    if (command.action === 'request') return false;
    return item.status === 'pending' && item.revision === command.expectedRevision
      && (command.action === 'cancel' ? snapshot.collection === 'outgoing' : snapshot.collection === 'incoming' || (snapshot.collection === 'inbox' && item.kind === 'friend_request'));
  }
  async function act(peerId: string, command: ConnectionCommand) {
    if (!active || !port || snapshot.busy || snapshot.loading || snapshot.uncertain || !allowed(peerId, command)) return;
    invalidate(); const version = generation;
    publish({ busy: command.action, error: null, message: null, listLoading: false });
    try {
      const peer = await request(signal => port.write(peerId, command, signal));
      if (!current(version)) return;
      if (!validSummary(peer, peerId) || !matchesResult(peer, command)) throw new Error('Invalid update.');
      const root = peerId === targetId ? peer : await request(signal => port.read(signal));
      if (!current(version)) return;
      if (!validSummary(root, targetId)) throw new Error('Invalid connection state.');
      publish({ summary: root, busy: null, uncertain: false, message: command.action === 'read' ? 'Notifications marked as read.' : 'Connection updated.' });
      if (snapshot.collection) void loadCollection(snapshot.collection);
    } catch (reason) {
      if (current(version)) publish({ summary: null, busy: null, uncertain: true, items: [], nextCursor: null,
        error: failure(reason, 'The update couldn’t be confirmed. It may have reached the server. Retry to check the current state before changing it again.') });
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    resume() { if (disposed) return; active = true; void load(); },
    suspend() {
      active = false; invalidate();
      publish({ summary: null, items: [], nextCursor: null, loading: false, busy: null, listLoading: false, message: null });
    },
    dispose() { active = false; invalidate(); disposed = true; listeners.clear(); },
    load,
    select(collection: ConnectionCollection) {
      if (snapshot.busy || targetId !== viewerId) return;
      // Invalidate collection completion without cancelling an independent summary read.
      listVersion++; listCancel?.abort(); publish({ collection, items: [], nextCursor: null, listLoading: false, listError: null });
      void loadCollection(collection);
    },
    close() { listVersion++; listCancel?.abort(); publish({ collection: null, items: [], nextCursor: null, listLoading: false, listError: null }); },
    more() { if (snapshot.collection) void loadCollection(snapshot.collection, true); },
    retryList() { if (snapshot.collection) void loadCollection(snapshot.collection); },
    act,
    requestFriend() {
      if (!active || snapshot.busy || snapshot.loading || snapshot.uncertain || !snapshot.summary || snapshot.summary.friendStatus !== 'none' || viewerId === targetId) return;
      return act(targetId, { action: 'request', requestId: uuid() });
    },
  };
}
