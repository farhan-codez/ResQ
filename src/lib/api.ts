import type { Detection, Report, Role, Severity, Status, TimelineEvent, Category, DetectionStatus } from './types'
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
  voice_note: string | null
  category: string | null
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
    category: (c.category as Category) ?? 'other',
    severity: c.severity,
    status: c.status,
    lat: c.latitude,
    lng: c.longitude,
    place: c.place,
    region: c.region,
    createdAt,
    photos: c.photos ?? [],
    voiceNote: c.voice_note ?? undefined,
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
    status: d.status ?? 'pending_review',
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

export async function uploadVoiceNote(blob: Blob, userId: string): Promise<string> {
  const path = `${userId}/voice-${crypto.randomUUID()}.webm`
  const { error } = await supabase.storage.from('report-photos').upload(path, blob, { contentType: 'audio/webm' })
  if (error) throw error
  return supabase.storage.from('report-photos').getPublicUrl(path).data.publicUrl
}

export async function insertReport(r: Report, files: File[], userId: string, voiceNote?: Blob) {
  const photos = files.length ? await uploadReportPhotos(files, userId) : []
  const voiceUrl = voiceNote ? await uploadVoiceNote(voiceNote, userId) : null
  const { error } = await supabase.from('complaints').insert({
    id: r.id,
    title: r.title,
    description: r.description,
    latitude: r.lat,
    longitude: r.lng,
    severity: r.severity,
    category: r.category,
    place: r.place,
    region: r.region,
    photos,
    voice_note: voiceUrl,
    is_anonymous: r.reporter.anonymous,
    reporter_name: r.reporter.anonymous ? null : r.reporter.name,
    reporter_id: r.reporter.anonymous ? null : userId,
  })
  if (error) throw error
  return { photos, voiceUrl }
}

export async function setComplaintStatus(id: string, status: Status) {
  const { error } = await supabase.from('complaints').update({ status }).eq('id', id)
  if (error) throw error
}

export async function setComplaintTeam(id: string, team: string) {
  const { error } = await supabase.from('complaints').update({ assigned_team: team }).eq('id', id)
  if (error) throw error
}

export async function setDetectionStatus(id: string, status: DetectionStatus) {
  const { error } = await supabase.from('detections').update({ status }).eq('id', id)
  if (error) throw error
}

/** Create a complaint from a confirmed detection (regulator workflow) */
export async function createComplaintFromDetection(detectionId: string, userId: string): Promise<Report> {
  const { data: det, error } = await supabase.from('detections').select('*').eq('id', detectionId).maybeSingle()
  if (error) throw error
  if (!det) throw new Error('Detection not found')

  const reportId = newReportId()
  const now = new Date().toISOString()

  const { error: insErr } = await supabase.from('complaints').insert({
    id: reportId,
    title: `Satellite detection: ${det.name}`,
    description: `Auto-generated from Sentinel-2 detection (${Math.round(det.confidence * 100)}% confidence, ${det.area_ha} ha). Requires ground verification.`,
    latitude: det.points[0]?.[0] ?? 0,
    longitude: det.points[0]?.[1] ?? 0,
    severity: det.confidence > 0.85 ? 'high' : det.confidence > 0.7 ? 'medium' : 'low',
    category: 'galamsey',
    place: det.name,
    region: 'Unknown',
    photos: [],
    is_anonymous: false,
    reporter_name: 'Satellite Monitor',
    reporter_id: userId,
    status: 'pending',
  })
  if (insErr) throw insErr

  // Link detection to complaint
  const { error: linkErr } = await supabase.from('detections').update({ status: 'confirmed', complaint_id: reportId }).eq('id', detectionId)
  if (linkErr) throw linkErr

  const complaints = await fetchReports()
  const report = complaints.find((r) => r.id === reportId)
  if (!report) throw new Error('Failed to fetch created report')
  return report
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

/** Guest management */

export interface Guest {
  id: string
  face_descriptor: number[]
  created_at: string
  last_seen: string
  upgraded_to_citizen: boolean
  citizen_user_id: string | null
}

/** Generate a deterministic guest ID from face descriptor */
export function guestIdFromDescriptor(descriptor: number[]): string {
  let hash = 0
  for (const v of descriptor) {
    hash = (hash << 5) - hash + Math.round(v * 1000)
    hash |= 0
  }
  return `GST-${Math.abs(hash).toString(36).toUpperCase().padStart(8, '0')}`
}

export async function createGuest(descriptor: number[]): Promise<Guest> {
  const id = guestIdFromDescriptor(descriptor)
  const now = new Date().toISOString()
  const { data, error } = await supabase.from('guests').upsert({
    id,
    face_descriptor: descriptor,
    created_at: now,
    last_seen: now,
    upgraded_to_citizen: false,
  }).select().maybeSingle()
  if (error) throw error
  return data as Guest
}

export async function getGuest(id: string): Promise<Guest | null> {
  const { data, error } = await supabase.from('guests').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Guest | null
}

export async function updateGuestLastSeen(id: string): Promise<void> {
  const { error } = await supabase.from('guests').update({ last_seen: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function upgradeGuestToCitizen(guestId: string, citizenUserId: string): Promise<void> {
  const { error } = await supabase.from('guests').update({
    upgraded_to_citizen: true,
    citizen_user_id: citizenUserId,
  }).eq('id', guestId)
  if (error) throw error
  
  // Also update complaints from this guest to link to the citizen
  const { error: complaintErr } = await supabase.from('complaints').update({
    reporter_id: citizenUserId,
    guest_id: null,
    is_anonymous: false,
  }).eq('guest_id', guestId)
  if (complaintErr) throw complaintErr
}
