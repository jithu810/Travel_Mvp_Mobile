import { isJourneyId } from '../discovery/model';
export function publicJourneyUrl(id: string, origin: string | undefined): string | null {
  if (!isJourneyId(id)) return null;
  try {
    const url = new URL(origin?.trim() || '');
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/'
      || !host.includes('.') || host.endsWith('.localhost') || host.endsWith('.local') || host === 'localhost'
      || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) return null;
    return new URL('/journey/' + encodeURIComponent(id), url.origin).href;
  } catch { return null; }
}
export type SharePort = (content: { title: string; message: string; url?: string }) => Promise<{ action: string }>;
export async function sharePublicJourney(id: string, title: string, origin: string | undefined, platform: string, share: SharePort) {
  const url = publicJourneyUrl(id, origin);
  if (!url) return { kind: 'unavailable' as const, url: null };
  try {
    const result = await share({ title, message: platform === 'ios' ? title : title + '\n' + url, ...(platform === 'ios' || platform === 'web' ? { url } : {}) });
    // Android's sharedAction does not prove delivery (or distinguish dismissal).
    return { kind: result.action === 'dismissedAction' ? 'cancelled' as const : 'opened' as const, url };
  } catch (error) {
    return { kind: error instanceof Error && error.name === 'AbortError' ? 'cancelled' as const : 'unavailable' as const, url };
  }
}
