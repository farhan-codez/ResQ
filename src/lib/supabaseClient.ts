import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Report } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Only create a client when both env vars exist — createClient throws on empty strings.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export interface ComplaintRow {
  id: string;
  created_at: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  severity: 'low' | 'medium' | 'high';
  status: string;
  is_satellite_verified: boolean;
}

export function complaintToReport(c: ComplaintRow): Report {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    severity: c.severity,
    status: (c.status ?? 'pending') as any,
    lat: c.latitude,
    lng: c.longitude,
    place: 'Ghana',
    region: 'Ghana',
    createdAt: new Date(c.created_at).getTime(),
    photos: [],
    reporter: { name: 'Citizen', anonymous: true },
    timeline: [
      {
        id: `${c.id}-t0`,
        at: new Date(c.created_at).getTime(),
        label: 'Report submitted',
        by: 'Citizen',
        status: (c.status ?? 'pending') as any,
      },
    ],
  };
}
