/* global Deno */
// Copy this reviewed function directory as registration-email-check during approved rollout.
import { createRegistrationEmailHandler } from './handler.ts';
const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const hashSecret = Deno.env.get('EMAIL_LOOKUP_HASH_SECRET');
Deno.serve(createRegistrationEmailHandler({
  hashSecret,
  lookup: async (email, hash, signal) => {
    if (!url || !serviceKey) throw new Error('Lookup unavailable');
    const endpoint = new URL('/rest/v1/rpc/registration_email_check', url);
    if (endpoint.protocol !== 'https:' && endpoint.hostname !== '127.0.0.1' && endpoint.hostname !== 'localhost') throw new Error('Invalid server configuration');
    const result = await fetch(endpoint, { method: 'POST', signal, headers: {
      'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
    }, body: JSON.stringify({ p_email: email, p_email_hash: hash }) });
    if (!result.ok) throw new Error('Lookup unavailable');
    return result.json();
  },
}));
