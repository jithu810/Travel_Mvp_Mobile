// V1 profile connections. No journey access or collaborative editing is granted.
export type FriendStatus = 'none' | 'incoming' | 'outgoing' | 'friends';
export type ConnectionSummary = {
  targetId: string;
  friendStatus: FriendStatus;
  requestId: string | null;
  requestRevision: number | null;
  following: boolean;
  followRevision: number;
  friendsCount: number;
  followingCount: number;
  unreadCount: number;
};
export type ConnectionPerson = {
  id: string;
  username: string | null;
  displayName: string;
  avatar: string | null;
};
export type ConnectionCollection = 'friends' | 'following' | 'incoming' | 'outgoing' | 'inbox';
export type ConnectionItem = {
  id: string;
  person: ConnectionPerson;
  requestId: string | null;
  revision: number | null;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'removed' | null;
  kind: 'friend_request' | 'friend_accepted' | null;
  readAt: string | null;
  createdAt: string;
};
export type ConnectionPage = { items: ConnectionItem[]; nextCursor: string | null };
export type ConnectionCommand =
  | { action: 'request'; requestId: string }
  | { action: 'accept' | 'decline' | 'cancel'; requestId: string; expectedRevision: number }
  | { action: 'remove'; requestId: string }
  | { action: 'follow'; enabled: boolean; expectedRevision: number }
  | { action: 'read'; notificationIds: string[] };
export type ConnectionPort = {
  read: (signal: AbortSignal) => Promise<ConnectionSummary>;
  list: (collection: ConnectionCollection, cursor: string | null, signal: AbortSignal) => Promise<ConnectionPage>;
  // Target may be a person in the owner's lists, distinct from the viewed profile.
  write: (targetId: string, command: ConnectionCommand, signal: AbortSignal) => Promise<ConnectionSummary>;
};
