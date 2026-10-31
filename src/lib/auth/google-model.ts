export const googleRedirect = 'journeycreator://auth/callback';
const pendingKey = 'journey-google-oauth-pending-v1';
const lifetime = 10 * 60 * 1000;
const failure = 'We could not complete Google sign-in. Please try again.';
export type GoogleDestination = { journeyId: string | null; returnTo?: 'create' };
type Pending = GoogleDestination & { startedAt: number; flowId: string | null };
type Ports = {
  storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };
  authorize(): Promise<{ url: string | null; flowId: string | null }>;
  exchange(code: string, flowId: string | null): Promise<boolean>;
  open(url: string): Promise<{ type: string; url?: string }>;
  now?: () => number;
};
const validJourney = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function parseGoogleCallback(raw: string): string {
  try {
    if (raw.split(/[?#]/, 1)[0] !== googleRedirect) throw new Error();
    const url = new URL(raw);
    if (url.protocol !== 'journeycreator:' || url.hostname !== 'auth' || url.pathname !== '/callback' || url.port || url.username || url.password || url.hash) throw new Error();
    if (url.searchParams.has('error') || url.searchParams.has('error_code')) throw new Error();
    const codes = url.searchParams.getAll('code');
    if (codes.length !== 1 || !codes[0] || codes[0].length > 4096 || /\s/.test(codes[0])) throw new Error();
    if (url.searchParams.has('access_token') || url.searchParams.has('refresh_token')) throw new Error();
    return codes[0];
  } catch { throw new Error(failure); }
}
// Both the native browser result and Router callback may receive the same link.
// Only an explicitly initiated, unexpired PKCE transaction may exchange it.
export function createGoogleSignIn(ports: Ports) {
  const now = ports.now ?? Date.now;
  let active = false;
  let exchanging = false;
  let ready = false;
  let completion: { raw: string; at: number; settled: boolean; promise: Promise<GoogleDestination> } | null = null;
  async function clearPending() {
    try { await ports.storage.removeItem(pendingKey); } catch { throw new Error(failure); }
  }
  async function readPending(): Promise<Pending> {
    const raw = await ports.storage.getItem(pendingKey);
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== 'object') throw new Error(failure);
    const entry = value as Partial<Pending>;
    if (typeof entry.startedAt !== 'number' || !Number.isFinite(entry.startedAt) || now() - entry.startedAt > lifetime || now() < entry.startedAt
      || (entry.journeyId !== null && !validJourney(entry.journeyId)) || (entry.flowId !== null && typeof entry.flowId !== 'string')
      || (entry.returnTo !== undefined && entry.returnTo !== 'create')) throw new Error(failure);
    return entry as Pending;
  }
  function complete(raw: string): Promise<GoogleDestination> {
    let code: string;
    try { code = parseGoogleCallback(raw); } catch { return Promise.reject(new Error(failure)); }
    if (active && !ready) return Promise.reject(new Error(failure));
    if (completion && (!completion.settled || now() - completion.at < 30000)) return completion.raw === raw ? completion.promise : Promise.reject(new Error(failure));
    exchanging = true;
    const promise = (async () => {
      try {
        const pending = await readPending();
        if (!await ports.exchange(code, pending.flowId)) throw new Error(failure);
        return { journeyId: pending.journeyId, ...(pending.returnTo === 'create' ? { returnTo: 'create' as const } : {}) };
      } catch { throw new Error(failure); }
      finally { try { await clearPending(); } finally { exchanging = false; if (completion) completion.settled = true; } }
    })();
    completion = { raw, at: now(), settled: false, promise };
    return promise;
  }
  async function start(journeyId: string | null, returnTo?: 'create'): Promise<GoogleDestination | null> {
    if (active || exchanging) throw new Error('Google sign-in is already in progress.');
    active = true; ready = false; completion = null;
    try {
      // Remove stale markers before starting a new verifier.
      await clearPending();
      if (returnTo !== undefined && returnTo !== 'create') throw new Error(failure);
      const { url, flowId } = await ports.authorize();
      if (!url || new URL(url).protocol !== 'https:') throw new Error(failure);
      const pending: Pending = { startedAt: now(), journeyId: validJourney(journeyId) ? journeyId : null, flowId, ...(returnTo === 'create' ? { returnTo } : {}) };
      await ports.storage.setItem(pendingKey, JSON.stringify(pending));
      ready = true;
      const result = await ports.open(url);
      if (result.type === 'success' && result.url) return await complete(result.url);
      // Router can win the race with the browser's dismiss event.
      if (completion) return await (completion as { promise: Promise<GoogleDestination> }).promise;
      return null;
    } catch { throw new Error(failure); }
    finally { try { await clearPending(); } finally { active = false; ready = false; } }
  }
  return { start, complete, isPending: () => active || exchanging };
}
