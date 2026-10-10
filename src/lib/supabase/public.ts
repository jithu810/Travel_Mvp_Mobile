import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Covers Storage signing too, whose SDK API does not accept abortSignal.
async function publicFetch(input: Parameters<typeof fetch>[0] | URL, init?: Parameters<typeof fetch>[1]) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const external = init?.signal;
  external?.addEventListener('abort', abort, { once: true });
  if (external?.aborted) controller.abort();
  const timeout = setTimeout(abort, 12000);
  try { return await fetch(input instanceof URL ? input.toString() : input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timeout); external?.removeEventListener('abort', abort); }
}

// Public reads intentionally never attach the saved user's bearer token.
// The original persistent auth client and root session lifecycle stay intact.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
export const publicSupabase = url && key?.startsWith('sb_publishable_')
  ? createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'journey-creator-public-read',
      },
      global: { fetch: publicFetch },
    })
  : null;
