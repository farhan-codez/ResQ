export type Severity = 'low' | 'medium' | 'high'
export type Status = 'pending' | 'investigating' | 'resolved'
export type Role = 'citizen' | 'regulator'

export interface TimelineEvent {
  id: string
  at: number
  label: string
  by: string
  status?: Status
}

export interface Report {
  id: string
  title: string
  description: string
  severity: Severity
  status: Status
  lat: number
  lng: number
  place: string
  region: string
  createdAt: number
  photos: string[]
  reporter: { name: string; anonymous: boolean }
  assignedTeam?: string
  timeline: TimelineEvent[]
}

export interface Detection {
  id: string
  name: string
  detectedAt: number
  confidence: number
  areaHa: number
  points: [number, number][]
}
