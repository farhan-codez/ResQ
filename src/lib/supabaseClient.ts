import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** False until both env vars are set. The app then runs in its original demo mode (seed data, simulated auth). */
export const isSupabaseConfigured = Boolean(url && key && !key.startsWith('your-'))

export const supabase = createClient(isSupabaseConfigured ? url! : 'http://localhost', isSupabaseConfigured ? key! : 'unconfigured', {
  // PKCE keeps OAuth tokens out of the URL hash, which the app uses for routing.
  auth: { flowType: 'pkce', persistSession: isSupabaseConfigured, autoRefreshToken: isSupabaseConfigured, detectSessionInUrl: isSupabaseConfigured },
})
