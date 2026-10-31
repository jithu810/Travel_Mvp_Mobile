export type LookupResult = { allowed: boolean; exists?: boolean; retry_after?: number };
export type LookupPort = (email: string, hash: string, signal: AbortSignal) => Promise<LookupResult>;
type Dependencies = { lookup: LookupPort; hashSecret?: string; crypto?: Crypto; timeoutMs?: number };
const MAX_BODY_BYTES = 1024;
function reply(status: number, body: object, retry?: number) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', ...(retry ? { 'Retry-After': String(retry) } : {}),
  } });
}
export function createRegistrationEmailHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return reply(200, {});
    if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
    if (!deps.hashSecret || deps.hashSecret.length < 32) return reply(503, { error: 'unavailable' });
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return reply(400, { error: 'invalid_email' });
    let email: string;
    try {
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: 'invalid_email' });
      let length = 0;
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > MAX_BODY_BYTES) { await reader.cancel(); return reply(400, { error: 'invalid_email' }); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (!body || typeof body !== 'object' || !('email' in body) || typeof body.email !== 'string') return reply(400, { error: 'invalid_email' });
      email = body.email.trim().toLowerCase();
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { error: 'invalid_email' });
    } catch { return reply(400, { error: 'invalid_email' }); }
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const crypto = deps.crypto ?? globalThis.crypto;
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(deps.hashSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('registration-email:' + email));
      const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { abort.abort(); reject(new Error('timeout')); }, deps.timeoutMs ?? 5000); });
      const result = await Promise.race([deps.lookup(email, hash, abort.signal), timeout]);
      if (result?.allowed === false && Number.isInteger(result.retry_after) && result.retry_after! > 0 && result.retry_after! <= 86400) return reply(429, { error: 'rate_limited' }, result.retry_after);
      if (result?.allowed !== true || typeof result.exists !== 'boolean') return reply(503, { error: 'unavailable' });
      return reply(200, { exists: result.exists });
    } catch { return reply(503, { error: 'unavailable' }); }
    finally { if (timer) clearTimeout(timer); }
  };
}
