import { supabase } from '../supabase/client';
import { publicSupabase } from '../supabase/public';
import { isJourneyId, object } from '../discovery/model';
import type { ConnectionCollection, ConnectionCommand, ConnectionItem, ConnectionPage, ConnectionPort, ConnectionSummary } from './types';

const unavailable = 'Connections are not available in this build yet.';
const collections: ConnectionCollection[] = ['friends', 'following', 'incoming', 'outgoing', 'inbox'];
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const uuid = (value: unknown): value is string => typeof value === 'string' && isJourneyId(value);
const nullableId = (value: unknown): value is string | null => value === null || uuid(value);
const date = (value: unknown): value is string => typeof value === 'string' && value.length <= 64 && Number.isFinite(Date.parse(value));

export function normalizeConnectionSummary(value: unknown, targetId: string): ConnectionSummary | null {
  const row = object(value);
  if (!row || row.targetId !== targetId || !isJourneyId(targetId)
    || !['none', 'incoming', 'outgoing', 'friends'].includes(String(row.friendStatus))
    || !nullableId(row.requestId) || !(row.requestRevision === null || (integer(row.requestRevision) && row.requestRevision > 0))
    || typeof row.following !== 'boolean' || !integer(row.followRevision)
    || !integer(row.friendsCount) || !integer(row.followingCount) || !integer(row.unreadCount)) return null;
  if ((row.friendStatus === 'none') !== (row.requestId === null && row.requestRevision === null)
    || (row.friendStatus !== 'none' && (row.requestId === null || row.requestRevision === null))) return null;
  return { targetId, friendStatus: row.friendStatus as ConnectionSummary['friendStatus'], requestId: row.requestId,
    requestRevision: row.requestRevision, following: row.following, followRevision: row.followRevision,
    friendsCount: row.friendsCount, followingCount: row.followingCount, unreadCount: row.unreadCount };
}

function normalizeItem(value: unknown, collection: ConnectionCollection): ConnectionItem | null {
  const row = object(value), person = object(row?.person);
  if (!row || !person || !uuid(row.id) || !uuid(person.id)
    || !(person.username === null || (typeof person.username === 'string' && /^[a-zA-Z0-9_]{3,30}$/.test(person.username)))
    || typeof person.displayName !== 'string' || person.displayName.length > 100
    || !(person.avatar === null || (typeof person.avatar === 'string' && person.avatar.length <= 2048))
    || !nullableId(row.requestId) || !(row.revision === null || integer(row.revision))
    || ![null, 'pending', 'accepted', 'declined', 'cancelled', 'removed'].includes(row.status as null)
    || ![null, 'friend_request', 'friend_accepted'].includes(row.kind as null)
    || !(row.readAt === null || date(row.readAt)) || !date(row.createdAt)) return null;
  if (collection === 'following' ? (row.requestId !== null || !integer(row.revision) || row.revision < 1 || row.status !== null || row.kind !== null)
    : (row.requestId === null || !integer(row.revision) || row.revision < 1 || row.status === null)) return null;
  if ((collection === 'incoming' || collection === 'outgoing') && row.status !== 'pending') return null;
  if (collection === 'friends' && row.status !== 'accepted') return null;
  if ((collection === 'inbox') !== (row.kind !== null)) return null;
  let avatar = person.avatar as string | null;
  if (avatar && !avatar.startsWith('profile-avatars/' + person.id + '/') && !/^https:\/\/[^\s]+$/.test(avatar)) avatar = null;
  return { id: row.id, person: { id: person.id, username: person.username, displayName: person.displayName.trim() || person.username || 'Traveler', avatar },
    requestId: row.requestId, revision: row.revision, status: row.status as ConnectionItem['status'],
    kind: row.kind as ConnectionItem['kind'], readAt: row.readAt, createdAt: row.createdAt };
}

export function normalizeConnectionPage(value: unknown, collection: ConnectionCollection): ConnectionPage | null {
  const row = object(value);
  if (!row || !Array.isArray(row.items) || row.items.length > 50
    || !(row.nextCursor === null || (typeof row.nextCursor === 'string' && row.nextCursor.length <= 512))) return null;
  const items = row.items.map(item => normalizeItem(item, collection));
  if (items.some(item => !item) || new Set(items.map(item => item?.id)).size !== items.length) return null;
  return { items: items as ConnectionItem[], nextCursor: row.nextCursor };
}

function validCommand(command: ConnectionCommand) {
  switch (command.action) {
    case 'request': case 'remove': return isJourneyId(command.requestId);
    case 'accept': case 'decline': case 'cancel': return isJourneyId(command.requestId) && integer(command.expectedRevision) && command.expectedRevision > 0;
    case 'follow': return typeof command.enabled === 'boolean' && integer(command.expectedRevision);
    case 'read': return Array.isArray(command.notificationIds) && command.notificationIds.length > 0 && command.notificationIds.length <= 50 && command.notificationIds.every(isJourneyId);
    default: return false;
  }
}

// Token is an opaque hook/controller identity key. Never log or persist it here.
export function connectionPort(targetId: string, userId: string, _accessToken?: string): ConnectionPort {
  void _accessToken;
  const client = supabase;
  if (!client || !isJourneyId(targetId) || !isJourneyId(userId)) throw new Error('Sign in to use connections.');
  async function request<T>(signal: AbortSignal, write: boolean, operation: (inner: AbortSignal) => Promise<T>) {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    const { data: { subscription } } = client!.auth.onAuthStateChange((_event, session) => { if (session?.user.id !== userId) cancel(); });
    let timer: ReturnType<typeof setTimeout> | undefined;
    let rejectAbort: (() => void) | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      rejectAbort = () => reject(new Error(write ? 'Connection update unconfirmed. Refresh before trying again.' : 'Connections request cancelled. Please retry.'));
      controller.signal.addEventListener('abort', rejectAbort, { once: true });
      timer = setTimeout(cancel, 15000);
      if (controller.signal.aborted) rejectAbort();
    });
    const check = () => { if (controller.signal.aborted) throw new Error('Connections request cancelled.'); };
    async function verify() {
      check();
      const { data, error } = await client!.auth.getUser();
      check();
      if (error || data.user?.id !== userId) throw new Error('Sign in to use connections.');
    }
    try {
      return await Promise.race([(async () => { await verify(); const result = await operation(controller.signal); check(); await verify(); return result; })(), deadline]);
    } catch (reason) {
      const safeMessages = [unavailable, 'Sign in to use connections.', 'Connection changed. Refresh before trying again.',
        'Too many friend requests. Please try later.', 'Connections request cancelled. Please retry.', 'Invalid connections list.', 'Invalid connection action.',
        'Couldn’t load connections. Please retry.', 'Couldn’t verify connections. Please retry.', 'Connection update unconfirmed. Refresh before trying again.'];
      const message = reason instanceof Error && safeMessages.includes(reason.message) ? reason.message
        : write ? 'Connection update unconfirmed. Refresh before trying again.' : 'Couldn’t load connections. Please retry.';
      throw new Error(message);
    } finally {
      clearTimeout(timer); subscription.unsubscribe(); signal.removeEventListener('abort', cancel);
      if (rejectAbort) controller.signal.removeEventListener('abort', rejectAbort);
      cancel();
    }
  }
  async function rpc(name: string, args: Record<string, unknown>, signal: AbortSignal, write: boolean) {
    const { data, error } = await client!.rpc(name, args).abortSignal(signal);
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') throw new Error(unavailable);
      if (write && error.code === '40001') throw new Error('Connection changed. Refresh before trying again.');
      if (write && error.code === '54000') throw new Error('Too many friend requests. Please try later.');
      throw new Error(write ? 'Connection update unconfirmed. Refresh before trying again.' : 'Couldn’t load connections. Please retry.');
    }
    return data;
  }
  async function summary(id: string, signal: AbortSignal) {
    const row = normalizeConnectionSummary(await rpc('get_profile_connections', { target_id: id }, signal, false), id);
    if (!row) throw new Error('Couldn’t verify connections. Please retry.');
    return row;
  }
  return {
    read: signal => request(signal, false, inner => summary(targetId, inner)),
    list: (collection, cursor, signal) => request(signal, false, async inner => {
      if (!collections.includes(collection) || !(cursor === null || (typeof cursor === 'string' && cursor.length <= 512))) throw new Error('Invalid connections list.');
      const page = normalizeConnectionPage(await rpc('list_profile_connections', { collection, cursor, page_limit: 20 }, inner, false), collection);
      if (!page) throw new Error('Couldn’t verify connections. Please retry.');
      const paths = [...new Set(page.items.map(item => item.person.avatar).filter((path): path is string => Boolean(path?.startsWith('profile-avatars/'))))];
      const signed = new Map<string, string>();
      if (paths.length && publicSupabase && !inner.aborted) {
        try {
          const { data } = await publicSupabase.storage.from('profile-avatars').createSignedUrls(paths.map(path => path.slice('profile-avatars/'.length)), 3600);
          paths.forEach((path, index) => { const item = data?.[index]; if (item?.signedUrl && !item.error && /^https:\/\//.test(item.signedUrl)) signed.set(path, item.signedUrl); });
        } catch { /* Existing public avatar policy may deny removed media: show initials. */ }
      }
      return { ...page, items: page.items.map(item => ({ ...item, person: { ...item.person, avatar: item.person.avatar?.startsWith('profile-avatars/') ? signed.get(item.person.avatar) ?? null : item.person.avatar } })) };
    }),
    write: (id, command, signal) => request(signal, true, async inner => {
      if (!isJourneyId(id) || !validCommand(command)) throw new Error('Invalid connection action.');
      const args = { target_id: id, action: command.action,
        request_id: 'requestId' in command ? command.requestId : null,
        expected_revision: 'expectedRevision' in command ? command.expectedRevision : null,
        enabled: command.action === 'follow' ? command.enabled : null,
        notification_ids: command.action === 'read' ? command.notificationIds : null };
      const value = normalizeConnectionSummary(await rpc('mutate_profile_connection', args, inner, true), id);
      if (!value) throw new Error('Connection update unconfirmed. Refresh before trying again.');
      return value;
    }),
  };
}
