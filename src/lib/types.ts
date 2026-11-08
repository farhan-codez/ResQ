export type Severity = 'low' | 'medium' | 'high'
export type Status = 'pending' | 'investigating' | 'resolved'
export type Role = 'citizen' | 'regulator' | 'guest'
export type Category = 'galamsey' | 'water_pollution' | 'medical' | 'fire' | 'security' | 'other'

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
  category: Category
  severity: Severity
  status: Status
  lat: number
  lng: number
  place: string
  region: string
  createdAt: number
  photos: string[]
  voiceNote?: string
  reporter: { name: string; anonymous: boolean }
  assignedTeam?: string
  timeline: TimelineEvent[]
}

export type DetectionStatus = 'pending_review' | 'confirmed' | 'dismissed'

export interface Detection {
  id: string
  name: string
  detectedAt: number
  confidence: number
  areaHa: number
  points: [number, number][]
  status: DetectionStatus
}

/** Authority that can be dispatched to handle a report */
export interface Authority {
  id: string
  name: string
  type: 'epa' | 'minerals_commission' | 'forestry' | 'nadmo' | 'police' | 'fire' | 'ambulance' | 'other'
  region: string
  contactPhone?: string
  contactEmail?: string
  coverageRadiusKm?: number
}

/** Dispatch alert created when a report is submitted */
export interface DispatchAlert {
  id: string
  reportId: string
  authorityId: string
  createdAt: number
  status: 'dispatched' | 'acknowledged' | 'en_route' | 'on_scene' | 'closed'
  notes?: string
}

/** Guest user (no Ghana Card) — identified by facial scan */
export interface Guest {
  id: string
  faceDescriptor: number[] // Face-api.js descriptor
  createdAt: number
  lastSeen: number
}
