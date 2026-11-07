import type { Detection, Report, Role, Severity, Status, TimelineEvent } from './types'
import { supabase } from './supabaseClient'

interface ComplaintRow {
  id: string
  created_at: string
  title: string
  description: string | null
  latitude: number
  longitude: number
  severity: Severity
  status: Status
  place: string
  region: string
  photos: string[] | null
  reporter_name: string | null
  is_anonymous: boolean
  assigned_team: string | null
}

interface EventRow {
  id: string
  complaint_id: string
  created_at: string
  label: string
  by_name: string
  status: Status | null
}

const toEvent = (e: EventRow): TimelineEvent => ({
  id: e.id,
  at: new Date(e.created_at).getTime(),
  label: e.label,
  by: e.by_name,
  status: e.status ?? undefined,
})

export function toReport(c: ComplaintRow, events: EventRow[] = []): Report {
  const name = c.is_anonymous ? 'Anonymous' : (c.reporter_name ?? 'Citizen')
  const createdAt = new Date(c.created_at).getTime()
  const timeline = events.map(toEvent).sort((a, b) => a.at - b.at)
  return {
    id: c.id,
    title: c.title,
    description: c.description ?? '',
    severity: c.severity,
    status: c.status,
    lat: c.latitude,
    lng: c.longitude,
    place: c.place,
    region: c.region,
    createdAt,
    photos: c.photos ?? [],
    reporter: { name, anonymous: c.is_anonymous },
    assignedTeam: c.assigned_team ?? undefined,
    timeline: timeline.length ? timeline : [{ id: `${c.id}-t0`, at: createdAt, label: 'Report submitted', by: name, status: 'pending' }],
  }
}

export function newReportId() {
  const bytes = crypto.getRandomValues(new Uint32Array(1))[0]
  return `RQ-${bytes.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`
}

export async function fetchReports(): Promise<Report[]> {
  const [c, e] = await Promise.all([
    supabase.from('complaints').select('*').order('created_at', { ascending: false }),
    supabase.from('complaint_events').select('*').order('created_at', { ascending: true }),
  ])
  if (c.error) throw c.error
  if (e.error) throw e.error
  const byComplaint = new Map<string, EventRow[]>()
  for (const ev of (e.data ?? []) as EventRow[]) byComplaint.set(ev.complaint_id, [...(byComplaint.get(ev.complaint_id) ?? []), ev])
  return ((c.data ?? []) as ComplaintRow[]).map((row) => toReport(row, byComplaint.get(row.id)))
}

export async function fetchEvents(complaintId: string): Promise<EventRow[]> {
  const { data, error } = await supabase.from('complaint_events').select('*').eq('complaint_id', complaintId).order('created_at')
  if (error) throw error
  return (data ?? []) as EventRow[]
}

export async function fetchDetections(): Promise<Detection[]> {
  const { data, error } = await supabase.from('detections').select('*').order('detected_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((d: any) => ({
    id: d.id,
    name: d.name,
    detectedAt: new Date(d.detected_at).getTime(),
    confidence: d.confidence,
    areaHa: d.area_ha,
    points: d.points as [number, number][],
  }))
}

export async function uploadReportPhotos(files: File[], userId: string): Promise<string[]> {
  const urls: string[] = []
  for (const f of files) {
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${userId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('report-photos').upload(path, f, { contentType: f.type || undefined })
    if (error) throw error
    urls.push(supabase.storage.from('report-photos').getPublicUrl(path).data.publicUrl)
  }
  return urls
}

export async function insertReport(r: Report, files: File[], userId: string) {
  const photos = files.length ? await uploadReportPhotos(files, userId) : []
  const { error } = await supabase.from('complaints').insert({
    id: r.id,
    title: r.title,
    description: r.description,
    latitude: r.lat,
    longitude: r.lng,
    severity: r.severity,
    place: r.place,
    region: r.region,
    photos,
    is_anonymous: r.reporter.anonymous,
    reporter_name: r.reporter.anonymous ? null : r.reporter.name,
    reporter_id: r.reporter.anonymous ? null : userId,
  })
  if (error) throw error
  return photos
}

export async function setComplaintStatus(id: string, status: Status) {
  const { error } = await supabase.from('complaints').update({ status }).eq('id', id)
  if (error) throw error
}

export async function setComplaintTeam(id: string, team: string) {
  const { error } = await supabase.from('complaints').update({ assigned_team: team }).eq('id', id)
  if (error) throw error
}

export async function fetchProfile(userId: string): Promise<{ name: string; email: string; role: Role } | null> {
  const { data, error } = await supabase.from('profiles').select('full_name,email,role').eq('id', userId).maybeSingle()
  if (error || !data) return null
  return { name: data.full_name, email: data.email, role: data.role as Role }
}

export async function uploadGhanaCard(blob: Blob, userId: string) {
  const path = `${userId}/ghana-card-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('ghana-cards').upload(path, blob, { contentType: blob.type || 'image/jpeg' })
  if (error) throw error
  const { error: pErr } = await supabase.from('profiles').update({ ghana_card_path: path }).eq('id', userId)
  if (pErr) throw pErr
}
