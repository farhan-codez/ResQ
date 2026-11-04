import { Info, OctagonAlert, TriangleAlert, Circle, Search as SearchIcon, CircleCheck, type LucideIcon } from 'lucide-react'
import type { Severity, Status } from './types'

export const SEVERITY: Record<Severity, { label: string; icon: LucideIcon; desc: string }> = {
  low: { label: 'Low', icon: Info, desc: 'Activity seen, no immediate danger' },
  medium: { label: 'Medium', icon: TriangleAlert, desc: 'Ongoing damage to land or water' },
  high: { label: 'High', icon: OctagonAlert, desc: 'Danger to people or a river now' },
}

export const STATUS: Record<Status, { label: string; icon: LucideIcon }> = {
  pending: { label: 'Pending', icon: Circle },
  investigating: { label: 'Investigating', icon: SearchIcon },
  resolved: { label: 'Resolved', icon: CircleCheck },
}

export const SEVERITY_ORDER: Severity[] = ['low', 'medium', 'high']
export const STATUS_ORDER: Status[] = ['pending', 'investigating', 'resolved']

export function timeAgo(ts: number, nowTs = Date.now()) {
  const s = Math.max(0, Math.round((nowTs - ts) / 1000))
  if (s < 45) return 'Just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d === 1) return 'Yesterday'
  if (d < 30) return `${d} days ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function formatCoords(lat: number, lng: number) {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`
}

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}
