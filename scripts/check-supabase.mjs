import { createClient } from '@supabase/supabase-js';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url?.startsWith('https://') || !key?.startsWith('sb_publishable_')) throw Error('Public Supabase configuration missing.');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const { data, error } = await client.auth.getSession();
if (error || data.session !== null) throw Error('Unexpected anonymous client state.');
// Auth settings is a GET: no accounts, database rows, or sessions are created.
const response = await fetch(new URL('/auth/v1/settings', url), { headers: { apikey: key }, signal: AbortSignal.timeout(15000) });
if (!response.ok) throw Error('Supabase connectivity failed: HTTP ' + response.status);
await response.json();
console.log('PASS: Supabase client initialized with no session; anonymous Auth settings GET returned HTTP ' + response.status + '. No writes performed.');

