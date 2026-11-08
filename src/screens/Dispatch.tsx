import { useEffect, useState } from 'react'
import { ChevronLeft, AlertTriangle, CheckCircle, Truck, MapPin, XCircle, Loader2 } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { SeverityChip, StatusChip } from '@/components/ui/Chips'
import { MapThumb } from '@/components/map/ReportsMap'
import { STATUS, STATUS_ORDER, cx, formatCoords, formatDateTime, timeAgo } from '@/lib/meta'
import { useApp } from '@/lib/store'
import { useDismiss } from '@/lib/useDismiss'
import type { Report, DispatchAlert } from '@/lib/types'

const dotTone: Record<string, string> = {
  dispatched: 'bg-alert-fg',
  acknowledged: 'bg-warning-fg',
  en_route: 'bg-brand-fg',
  on_scene: 'bg-info-fg',
  closed: 'bg-resolved-fg',
}

const statusLabel: Record<string, string> = {
  dispatched: 'Dispatched',
  acknowledged: 'Acknowledged',
  en_route: 'En route',
  on_scene: 'On scene',
  closed: 'Closed',
}

const statusOrder = ['dispatched', 'acknowledged', 'en_route', 'on_scene', 'closed']

function StatusBadge({ status }: { status: DispatchAlert['status'] }) {
  const label = statusLabel[status] ?? status
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium', dotTone[status])}>
      <span className={`size-1.5 rounded-full bg-current`} aria-hidden />
      {label}
    </span>
  )
}

function StatusActions({ alert, onUpdate }: { alert: DispatchAlert; onUpdate: (id: string, status: DispatchAlert['status']) => void }) {
  const isTerminal = alert.status === 'closed'

  if (isTerminal) {
    return <span className="text-xs text-fg-muted">Completed</span>
  }

  const nextStatus = (() => {
    switch (alert.status) {
      case 'dispatched': return 'acknowledged'
      case 'acknowledged': return 'en_route'
      case 'en_route': return 'on_scene'
      case 'on_scene': return 'closed'
      default: return null
    }
  })()

  const nextLabel = (() => {
    switch (alert.status) {
      case 'dispatched': return 'Acknowledge'
      case 'acknowledged': return 'En route'
      case 'en_route': return 'On scene'
      case 'on_scene': return 'Close'
      default: return ''
    }
  })()

  const nextIcon = (() => {
    switch (alert.status) {
      case 'dispatched': return CheckCircle
      case 'acknowledged': return Truck
      case 'en_route': return MapPin
      case 'on_scene': return XCircle
      default: return undefined
    }
  })()

  if (!nextStatus) return null

  const Icon = nextIcon
  return (
    <Button size="sm" variant="secondary" icon={Icon} onClick={() => onUpdate(alert.id, nextStatus!)}>
      {nextLabel}
    </Button>
  )
}

export function DispatchList({ onClose }: { onClose: () => void }) {
  const { dispatchAlerts, reports, role, navigate, updateDispatchStatus } = useApp()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(t)
  }, [])

  const sortedAlerts = [...dispatchAlerts].sort((a, b) => {
    const ai = statusOrder.indexOf(a.status)
    const bi = statusOrder.indexOf(b.status)
    if (ai !== bi) return ai - bi
    return b.createdAt - a.createdAt
  })

  return (
    <div className="fixed inset-0 z-[1100]">
      <div className="animate-fade absolute inset-0 bg-scrim" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Dispatch alerts" className="animate-slide-up fixed inset-0 max-w-2xl mx-auto flex flex-col rounded-t-2xl border-t border-border bg-surface shadow-overlay md:rounded-xl md:max-h-[90vh] md:my-8 md:mx-auto md:shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="min-h-11 cursor-pointer px-2 text-sm font-medium text-brand-soft-fg">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <h2 className="text-xl text-fg">Dispatch Alerts</h2>
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-alert-soft px-2 text-xs font-semibold text-alert-fg">
              {dispatchAlerts.length}
            </span>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 cursor-pointer px-2 text-sm font-medium text-brand-soft-fg">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-4 p-4" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-fade flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
                  <div className="resq-skeleton h-8 w-8 rounded-full bg-surface-3" aria-hidden />
                  <div className="flex-1 space-y-2">
                    <div className="resq-skeleton h-4 w-3/4 bg-surface-3" />
                    <div className="resq-skeleton h-3 w-1/2 bg-surface-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <AlertTriangle className="size-12 text-fg-muted" aria-hidden />
              <p className="mt-4 text-lg text-fg-muted">No dispatch alerts yet</p>
              <p className="mt-1 text-sm text-fg-muted">New alerts from citizen reports will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {sortedAlerts.map((alert) => {
                const report = reports.find((r) => r.id === alert.reportId)
                return (
                  <li key={alert.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-alert-soft text-alert-fg">
                        <AlertTriangle className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-fg truncate">Report {alert.reportId.slice(0, 12)}</span>
                            <StatusBadge status={alert.status} />
                          </div>
                          <StatusActions alert={alert} onUpdate={updateDispatchStatus} />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
                          <span className="flex items-center gap-1">{alert.authorityId}</span>
                          <span className="flex items-center gap-1">{timeAgo(alert.createdAt)}</span>
                          {report && <span className="flex items-center gap-1">{report.category}</span>}
                        </div>
                        {report && (
                          <button
                            type="button"
                            onClick={() => { onClose(); navigate({ name: 'dashboard', incident: report.id }) }}
                            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-soft-fg hover:underline"
                          >
                            <MapPin className="size-4" aria-hidden /> View report on map
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}