import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Subscribe to realtime INSERTs on the complaints table.
 * Whenever a new report is injected, the callback fires instantly with the new row.
 * Returns an unsubscribe function.
 */
export const subscribeToComplaints = (onNewComplaint) => {
  if (!isSupabaseConfigured) {
    console.warn(
      '[ResQ] Supabase not configured: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing. ' +
        'Realtime subscription disabled.'
    );
    return () => {};
  }

  const channel = supabase
    .channel('realtime:complaints')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'complaints' },
      (payload) => {
        const complaint = payload.new;
        if (complaint && onNewComplaint) {
          onNewComplaint(complaint);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};