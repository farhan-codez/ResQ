import { supabase } from './supabaseClient'
import type { Report, Category, Authority, DispatchAlert } from './types'

/** Default authority mapping by category and region */
const AUTHORITY_MAP: Record<Category, string[]> = {
  galamsey: ['minerals_commission', 'epa', 'forestry'],
  water_pollution: ['epa', 'nadmo'],
  medical: ['ambulance', 'nadmo'],
  fire: ['fire', 'nadmo'],
  security: ['police', 'nadmo'],
  other: ['nadmo'],
}

/** Get authorities that can handle a report based on category and region */
export async function getAuthoritiesForReport(report: Report): Promise<Authority[]> {
  const authorityTypes = AUTHORITY_MAP[report.category] ?? ['nadmo']
  const { data, error } = await supabase
    .from('authorities')
    .select('*')
    .in('type', authorityTypes)
    .eq('region', report.region)
    .order('coverage_radius_km', { ascending: true })

  if (error) throw error
  return (data ?? []) as Authority[]
}

/** Create dispatch alerts for a newly submitted report */
export async function createDispatchAlerts(report: Report): Promise<DispatchAlert[]> {
  const authorities = await getAuthoritiesForReport(report)
  if (!authorities.length) return []

  const alerts: DispatchAlert[] = authorities.map((a) => ({
    id: `DA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    reportId: report.id,
    authorityId: a.id,
    createdAt: Date.now(),
    status: 'dispatched',
  }))

  const { error } = await supabase.from('dispatch_alerts').insert(
    alerts.map((al) => ({
      id: al.id,
      report_id: al.reportId,
      authority_id: al.authorityId,
      created_at: new Date(al.createdAt).toISOString(),
      status: al.status,
    }))
  )

  if (error) throw error
  return alerts
}

/** Update alert status (called by authority when they acknowledge/arrive) */
export async function updateAlertStatus(alertId: string, status: DispatchAlert['status']): Promise<void> {
  const { error } = await supabase.from('dispatch_alerts').update({ status }).eq('id', alertId)
  if (error) throw error
}

/** Fetch alerts for a report (regulator view) */
export async function fetchAllDispatchAlerts(): Promise<DispatchAlert[]> {
  const { data, error } = await supabase
    .from('dispatch_alerts')
    .select('*, authorities(*)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row: any) => ({
    id: row.id,
    reportId: row.report_id,
    authorityId: row.authority_id,
    createdAt: new Date(row.created_at).getTime(),
    status: row.status,
    notes: row.notes,
  }))
}

export async function fetchAlertsForReport(reportId: string): Promise<DispatchAlert[]> {
  const { data, error } = await supabase
    .from('dispatch_alerts')
    .select('*, authorities(*)')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row: any) => ({
    id: row.id,
    reportId: row.report_id,
    authorityId: row.authority_id,
    createdAt: new Date(row.created_at).getTime(),
    status: row.status,
    notes: row.notes,
  }))
}