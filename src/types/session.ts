import type { Session } from '@supabase/supabase-js';

export type SessionState = {
  session: Session | null;
  loading: boolean;
  error: string | null;
};

