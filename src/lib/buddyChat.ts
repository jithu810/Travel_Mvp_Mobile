// DEV-ONLY: talks to the Buddy chat gateway at EXPO_PUBLIC_BUDDY_CHAT_URL: POST /v1/chat,
// POST /v1/chat/stream (SSE), POST /v1/agent (agent mode prototype) and GET /v1/usage.
// Identity comes from the Supabase access token; no user id or coordinates are sent.
// Never logs message text, replies or the token.
// `agent` marks turns of agent mode: they stay on screen but are never sent as normal chat history.
export type BuddyTurn = { role: 'user' | 'assistant'; content: string; agent?: true };
// This month's tokens for the signed-in user (GET /v1/usage). limit null = unlimited;
// enforced false = the server only counts (never refuses) yet.
export type BuddyUsage = { used: number; limit: number | null; period: string; enforced: boolean; resetsAt?: string };
export type BuddyErrorKind = 'not_configured' | 'sign_in' | 'unauthorized' | 'limit' | 'slow_down' | 'busy' | 'timeout' | 'generic';

export const BUDDY_CHAT_TIMEOUT_MS = 30000;
export const BUDDY_CHAT_MAX_INPUT = 2000;
const MAX_TURNS = 10;
// Gateway contract limits.
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;
const MAX_TOTAL_CHARS = 8000;

const MESSAGES: Record<BuddyErrorKind, string> = {
  not_configured: 'Buddy chat isn’t set up',
  sign_in: 'Please sign in to chat with Buddy',
  unauthorized: 'Please sign in again',
  limit: 'Monthly chat limit reached',
  slow_down: 'Too many messages — wait a moment',
  busy: 'Buddy is busy, try again shortly',
  timeout: 'Buddy took too long, try again',
  generic: 'Something went wrong',
};

export class BuddyChatError extends Error {
  kind: BuddyErrorKind;
  constructor(kind: BuddyErrorKind) { super(MESSAGES[kind]); this.name = 'BuddyChatError'; this.kind = kind; }
}

export function buddyErrorMessage(caught: unknown): string {
  return MESSAGES[caught instanceof BuddyChatError ? caught.kind : 'generic'];
}

// Expo inlines EXPO_PUBLIC_* only for static access, so keep the literal property read.
function buddyBase(): string | null {
  const base = (process.env.EXPO_PUBLIC_BUDDY_CHAT_URL ?? '').trim().replace(/\/+$/, '');
  return base && isAllowedBase(base) ? base : null;
}

// https only; plain http just for local hosts (loopback and the Android emulator's host alias).
const HTTP_HOSTS = new Set(['127.0.0.1', 'localhost', '10.0.2.2']);
function isAllowedBase(base: string): boolean {
  const match = /^(https?):\/\/([^/?#:@]+)(?::\d+)?(?:[/?#]|$)/i.exec(base);
  if (!match) return false;
  return match[1].toLowerCase() === 'https' || HTTP_HOSTS.has(match[2].toLowerCase());
}

export function buddyChatEndpoint(): string | null {
  const base = buddyBase();
  return base ? base + '/v1/chat' : null;
}

export function isBuddyConfigured(): boolean { return buddyChatEndpoint() !== null; }

// Keep the newest turns within the gateway limits; the last (user) message always stays.
// Empty turns are dropped (the gateway rejects them), except the last message.
export function clampBuddyMessages(messages: BuddyTurn[]): BuddyTurn[] {
  const chat = messages.filter((turn, index) => !turn.agent || index === messages.length - 1);
  const usable = chat.filter((turn, index) => turn.content.trim() !== '' || index === chat.length - 1);
  const recent = usable.slice(-Math.min(MAX_TURNS, MAX_MESSAGES)).map(turn => ({ role: turn.role, content: turn.content.slice(0, MAX_MESSAGE_CHARS) }));
  let total = recent.reduce((sum, turn) => sum + turn.content.length, 0);
  while (recent.length > 1 && total > MAX_TOTAL_CHARS) total -= recent.shift()!.content.length;
  return recent;
}

// Runs fetch with a timeout, also aborting when the caller's signal aborts.
async function timedFetch(url: string, init: RequestInit, timeoutMs: number, external?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  if (external?.aborted) controller.abort();
  external?.addEventListener('abort', onAbort);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    external?.removeEventListener('abort', onAbort);
  }
}

export async function sendBuddyChat(accessToken: string | null | undefined, messages: BuddyTurn[], external?: AbortSignal): Promise<{ reply: string }> {
  const url = buddyChatEndpoint();
  if (!url) throw new BuddyChatError('not_configured');
  if (!accessToken) throw new BuddyChatError('sign_in');
  let response: Response;
  try {
    response = await timedFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
      body: JSON.stringify({ messages: clampBuddyMessages(messages) }),
    }, BUDDY_CHAT_TIMEOUT_MS, external);
  } catch (caught) {
    if (external?.aborted) throw caught;
    throw new BuddyChatError((caught as { name?: string } | null)?.name === 'AbortError' ? 'timeout' : 'generic');
  }
  let data: { reply?: unknown; error?: unknown } = {};
  try { data = await response.json(); } catch { /* non-JSON body */ }
  throwForStatus(response.status, response.ok, data);
  return { reply: data.reply as string };
}

// Shared status mapping for /v1/chat and /v1/chat/stream (errors before streaming starts).
function throwForStatus(status: number, ok: boolean, data: { reply?: unknown; error?: unknown }): void {
  if (status === 401) throw new BuddyChatError('unauthorized');
  if (status === 429) throw new BuddyChatError(data.error === 'limit_reached' ? 'limit' : 'slow_down');
  if (status === 503) throw new BuddyChatError('busy');
  if (status === 504) throw new BuddyChatError('timeout');
  if (!ok || typeof data.reply !== 'string' || data.reply.trim() === '') throw new BuddyChatError('generic');
}

export type SseEvent = { event: string; data: string };

// Incremental Server-Sent Events parser: feed text chunks (split anywhere), get complete events.
// Handles LF and CRLF line ends, ": comment" lines, multi-line data and the default "message" event.
export function createSseParser() {
  let buffer = '';
  let event = '';
  let data: string[] = [];
  return {
    feed(text: string): SseEvent[] {
      buffer += text;
      const out: SseEvent[] = [];
      let nl: number;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line === '') {
          if (data.length) out.push({ event: event || 'message', data: data.join('\n') });
          event = ''; data = [];
          continue;
        }
        if (line.startsWith(':')) continue;
        const colon = line.indexOf(':');
        const field = colon === -1 ? line : line.slice(0, colon);
        let value = colon === -1 ? '' : line.slice(colon + 1);
        if (value.startsWith(' ')) value = value.slice(1);
        if (field === 'event') event = value;
        else if (field === 'data') data.push(value);
      }
      return out;
    },
  };
}

export const BUDDY_STREAM_TIMEOUT_MS = 60000;
type StreamFetch = (url: string, init: RequestInit) => Promise<Response>;
let injectedStreamFetch: StreamFetch | null = null;
// Tests only: replace the streaming fetch (expo/fetch can't load under node).
export function __setBuddyStreamFetchForTests(fn: StreamFetch | null): void { injectedStreamFetch = fn; }

function resolveStreamFetch(): StreamFetch | null {
  if (injectedStreamFetch) return injectedStreamFetch;
  try {
    // Lazy so the node test runner can import this module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo/fetch') as { fetch?: unknown };
    return typeof mod.fetch === 'function' ? mod.fetch as StreamFetch : null;
  } catch {
    return null;
  }
}

const STREAM_ERRORS: Record<string, BuddyErrorKind> = { limit_reached: 'limit', busy: 'busy', timeout: 'timeout' };

// Streaming chat: onDelta gets the full text so far. Falls back to sendBuddyChat only when there was
// no usable streaming response (no expo/fetch, fetch failed before a response, 404/405, no body reader).
// Once a 200 event-stream response has arrived, later failures never fall back (no double charge).
export async function sendBuddyChatStream(accessToken: string | null | undefined, messages: BuddyTurn[], onDelta: (textSoFar: string) => void, external?: AbortSignal): Promise<{ reply: string }> {
  const base = buddyBase();
  if (!base) throw new BuddyChatError('not_configured');
  if (!accessToken) throw new BuddyChatError('sign_in');
  const streamFetch = resolveStreamFetch();
  if (!streamFetch) return sendBuddyChat(accessToken, messages, external);

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, BUDDY_STREAM_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  if (external?.aborted) controller.abort();
  external?.addEventListener('abort', onAbort);
  let reader: { read(): Promise<{ done: boolean; value?: Uint8Array }>; cancel(): Promise<void> } | null = null;
  // Abort/timeout are final; any other failure before a streaming response falls back to the plain call.
  const failBefore = async (): Promise<{ reply: string }> => {
    if (external?.aborted) throw new BuddyChatError('generic');
    if (timedOut) throw new BuddyChatError('timeout');
    return sendBuddyChat(accessToken, messages, external);
  };
  try {
    let response: Response;
    try {
      response = await streamFetch(base + '/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', Authorization: 'Bearer ' + accessToken },
        body: JSON.stringify({ messages: clampBuddyMessages(messages) }),
        signal: controller.signal,
      });
    } catch (caught) {
      if (external?.aborted) throw caught;
      return await failBefore();
    }
    if (response.status === 404 || response.status === 405) return await failBefore();
    const type = response.headers?.get?.('content-type') ?? '';
    if (response.status !== 200 || !type.includes('text/event-stream')) {
      let data: { reply?: unknown; error?: unknown } = {};
      try { data = await response.json(); } catch { /* non-JSON body */ }
      throwForStatus(response.status, response.ok, data);
      return { reply: data.reply as string };
    }
    const body = response.body as { getReader?: () => typeof reader } | null;
    reader = body?.getReader ? body.getReader() : null;
    if (!reader) return await failBefore();

    const decoder = new TextDecoder();
    const parser = createSseParser();
    let text = '';
    for (;;) {
      let chunk: { done: boolean; value?: Uint8Array };
      try {
        chunk = await reader.read();
      } catch (caught) {
        if (external?.aborted) throw caught;
        throw new BuddyChatError(timedOut ? 'timeout' : 'generic');
      }
      if (chunk.done) break;
      for (const item of parser.feed(decoder.decode(chunk.value, { stream: true }))) {
        let payload: { t?: unknown; reply?: unknown; error?: unknown } = {};
        try { payload = JSON.parse(item.data); } catch { /* ignore malformed */ }
        if (item.event === 'delta' && typeof payload.t === 'string') {
          text += payload.t;
          onDelta(text);
        } else if (item.event === 'done' && typeof payload.reply === 'string') {
          if (payload.reply.trim() === '') throw new BuddyChatError('generic');
          return { reply: payload.reply };
        } else if (item.event === 'error') {
          throw new BuddyChatError(STREAM_ERRORS[String(payload.error)] ?? 'generic');
        }
      }
    }
    // Stream ended without done/error: the model may already have been charged, so no fallback.
    throw new BuddyChatError(timedOut ? 'timeout' : 'generic');
  } finally {
    clearTimeout(timer);
    external?.removeEventListener('abort', onAbort);
    try { void reader?.cancel().catch(() => {}); } catch { /* already closed */ }
  }
}

// ---- Agent mode (DEV prototype): POST /v1/agent runs the Goa mini-agent once ----
// Only the latest message is sent (the prototype agent uses no history). The steps are the agent's own
// executed steps with real timings, returned after the run (no live streaming).
export type BuddyAgentStep = { id: string; status: string; ms: number };
export type BuddyAgentResult = { reply: string; status: string; steps: BuddyAgentStep[] };
export const BUDDY_AGENT_TIMEOUT_MS = 60000;
const AGENT_STEP_LABELS: Record<string, string> = {
  understand: 'Understanding your request',
  search: 'Searching places',
  plan: 'Preparing your trip',
  validate: 'Validating results',
};

export async function sendBuddyAgent(accessToken: string | null | undefined, text: string, external?: AbortSignal): Promise<BuddyAgentResult> {
  const base = buddyBase();
  if (!base) throw new BuddyChatError('not_configured');
  if (!accessToken) throw new BuddyChatError('sign_in');
  let response: Response;
  try {
    response = await timedFetch(base + '/v1/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
      body: JSON.stringify({ messages: [{ role: 'user', content: text.slice(0, MAX_MESSAGE_CHARS) }] }),
    }, BUDDY_AGENT_TIMEOUT_MS, external);
  } catch (caught) {
    if (external?.aborted) throw caught;
    throw new BuddyChatError((caught as { name?: string } | null)?.name === 'AbortError' ? 'timeout' : 'generic');
  }
  let data: { reply?: unknown; error?: unknown; status?: unknown; steps?: unknown } = {};
  try { data = await response.json(); } catch { /* non-JSON body */ }
  throwForStatus(response.status, response.ok, data);
  const steps = Array.isArray(data.steps) ? data.steps.flatMap(item => {
    const s = item as { id?: unknown; status?: unknown; ms?: unknown };
    return typeof s?.id === 'string' && typeof s.status === 'string' && typeof s.ms === 'number' ? [{ id: s.id, status: s.status, ms: s.ms }] : [];
  }) : [];
  return { reply: data.reply as string, status: typeof data.status === 'string' ? data.status : '', steps };
}

// One plain-text chat bubble: executed steps with timings, a blank line, then Buddy's reply.
// A run that did not end ok marks the validation step as the place where it stopped.
export function formatBuddyAgentReply(result: BuddyAgentResult): string {
  const lines = result.steps.filter(step => step.id in AGENT_STEP_LABELS).map(step => {
    const failed = step.status !== 'ok' || (step.id === 'validate' && result.status !== 'ok');
    const seconds = (Math.max(0, step.ms) / 1000).toFixed(1);
    // Non-breaking spaces keep "· 0.7 s" on one line when the label wraps.
    return (failed ? '✗ ' : '✓ ') + AGENT_STEP_LABELS[step.id] + ' · ' + seconds + ' s';
  });
  return lines.length ? lines.join('\n') + '\n\n' + result.reply : result.reply;
}

// Usage meter: any failure returns null so the panel simply hides the meter.
export async function getBuddyUsage(accessToken: string | null | undefined, external?: AbortSignal): Promise<BuddyUsage | null> {
  const base = buddyBase();
  if (!base || !accessToken) return null;
  try {
    const response = await timedFetch(base + '/v1/usage', { method: 'GET', headers: { Authorization: 'Bearer ' + accessToken } }, 10000, external);
    if (!response.ok) return null;
    const data = await response.json() as Partial<Record<keyof BuddyUsage, unknown>>;
    if (typeof data.used !== 'number' || (data.limit !== null && typeof data.limit !== 'number')) return null;
    return { used: data.used, limit: data.limit as number | null, period: typeof data.period === 'string' ? data.period : '', enforced: data.enforced === true, resetsAt: typeof data.resetsAt === 'string' ? data.resetsAt : undefined };
  } catch {
    return null;
  }
}
