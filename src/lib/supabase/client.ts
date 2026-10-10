import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Expo requires static property access to inline public environment values.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabaseConfigured = Boolean(url && key?.startsWith('sb_publishable_'));

// A missing configuration should not prevent the foundation screen from opening.
export const supabase = supabaseConfigured
  ? createClient(url!, key!, {
      global: { fetch: async (input, init) => {
        const controller = new AbortController();
        const signal = init?.signal;
        const abort = () => controller.abort();
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) controller.abort();
        const timer = setTimeout(abort, 15000);
        try { return await fetch(input, { ...init, signal: controller.signal }); }
        finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
      } },
      auth: {
        ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;


