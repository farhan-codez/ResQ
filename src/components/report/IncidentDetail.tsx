import { useEffect, useRef, useState } from 'react'
import { Check, EyeOff, MapPin, ShieldCheck, Users, X, Clock, Map as MapIcon, ChevronDown } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { SeverityChip, StatusChip } from '@/components/ui/Chips'
import { Select } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { MapThumb } from '@/components/map/ReportsMap'
import { TEAMS } from '@/lib/data'
import { STATUS, STATUS_ORDER, cx, formatCoords, formatDateTime, timeAgo } from '@/lib/meta'
import { useApp } from '@/lib/store'
import { useDismiss } from '@/lib/useDismiss'
import type { Status } from '@/lib/types'

const dotTone: Record<Status, string> = {
  pending: 'bg-pending-fg',
  investigating: 'bg-investigating-fg',
  resolved: 'bg-resolved-fg',
}

function AssignTeam({ reportId, current }: { reportId: string; current?: string }) {
  const { assignTeam } = useApp()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))
  const choose = async (team: string) => {
    setOpen(false)
    const failToast = () => toast({ tone: 'error', title: "We couldn't assign the team.", description: 'Nothing was changed. Check your connection.', action: { label: 'Try again', onClick: () => choose(team) } })
    try {
      await assignTeam(reportId, team)
    } catch {
      return failToast()
    }
    toast({ tone: 'success', title: `Assigned to ${team}.`, description: 'The team lead has been notified.' })
  }
  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" icon={Users} iconRight={ChevronDown} block aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)}>
        {current ? 'Reassign team' : 'Assign team'}
      </Button>
      {open && (
        <div role="menu" className="animate-fade absolute right-0 bottom-full left-0 z-10 mb-2 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-overlay">
          {TEAMS.map((t) => (
            <button key={t} role="menuitem" type="button" onClick={() => choose(t)} className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 text-left text-sm text-fg hover:bg-surface-2 md:min-h-10">
              <span className="flex-1">{t}</span>
              {t === current && <Check className="size-4 text-brand-soft-fg" aria-label="Currently assigned" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function IncidentDetail({ id, onClose, onShowOnMap }: { id: string; onClose: () => void; onShowOnMap?: (id: string) => void }) {
  const { reports, role, updateStatus } = useApp()
  const toast = useToast()
  const report = reports.find((r) => r.id === id)
  const [loading, setLoading] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 450)
    return () => clearTimeout(t)
  }, [id])

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), select, a[href], input, [tabindex="0"]')
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [onClose])

  const changeStatus = async (s: Status) => {
    if (!report) return
    const failToast = () => toast({ tone: 'error', title: "We couldn't update the status.", description: 'Nothing was changed. Check your connection.', action: { label: 'Try again', onClick: () => changeStatus(s) } })
    try {
      await updateStatus(report.id, s)
    } catch {
      return failToast()
    }
    toast({ tone: 'success', title: `Status changed to ${STATUS[s].label}.`, description: 'The reporter will be notified.' })
  }

  return (
    <div className="fixed inset-0 z-[1100]">
      <div className="animate-fade absolute inset-0 bg-scrim" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-title"
        tabIndex={-1}
        className="animate-panel absolute outline-none inset-x-0 top-6 bottom-0 flex flex-col rounded-t-2xl border-border bg-surface shadow-overlay md:inset-x-auto md:top-0 md:right-0 md:w-[480px] md:rounded-none md:border-l"
      >
        <div className="flex justify-center pt-2 md:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-border-strong" />
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
          <p className="tabular text-sm font-medium text-fg-muted">{report?.id ?? 'Report'}</p>
          <IconButton ref={closeRef} icon={X} label="Close details" tooltipSide="left" onClick={onClose} />
        </div>

        {!report ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <p className="text-base font-medium text-fg">This report is no longer available.</p>
            <p className="mt-1 text-sm text-fg-muted">It may have been merged with another report.</p>
            <Button variant="secondary" className="mt-4" onClick={onClose}>
              Go back to the map
            </Button>
          </div>
        ) : loading ? (
          <div className="flex-1 space-y-5 overflow-hidden p-4 md:p-6" aria-busy="true" aria-label="Loading report">
            <Skeleton className="h-7 w-4/5" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-40 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6 p-4 md:p-6">
                <div>
                  <h2 id="incident-title" className="text-xl text-fg md:text-2xl">
                    {report.title}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <SeverityChip severity={report.severity} />
                    <StatusChip status={report.status} />
                    <span className="flex items-center gap-1 text-xs text-fg-muted">
                      <Clock className="size-3.5" aria-hidden /> {timeAgo(report.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <MapThumb report={report} />
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-sm text-fg-muted">
                      <MapPin className="size-4 shrink-0" aria-hidden />
                      <span>
                        {report.place}, {report.region} · <span className="tabular">{formatCoords(report.lat, report.lng)}</span>
                      </span>
                    </p>
                    {onShowOnMap && (
                      <Button variant="link" size="sm" icon={MapIcon} onClick={() => onShowOnMap(report.id)}>
                        Show on map
                      </Button>
                    )}
                  </div>
                </div>

                <section aria-labelledby="d-desc">
                  <h3 id="d-desc" className="text-sm font-medium text-fg-muted">
                    Description
                  </h3>
                  <p className="mt-1.5 text-base text-fg">{report.description}</p>
                </section>

                <section aria-labelledby="d-photos">
                  <h3 id="d-photos" className="text-sm font-medium text-fg-muted">
                    Photos
                  </h3>
                  {report.photos.length ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {report.photos.map((p, i) => (
                        <a key={p} href={p} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border">
                          <img src={p} alt={`Photo ${i + 1} from the reporter at ${report.place}`} className="aspect-[4/3] w-full object-cover transition-transform hover:scale-[1.02]" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-sm text-fg-muted">No photos were attached.</p>
                  )}
                </section>

                <section aria-labelledby="d-timeline">
                  <h3 id="d-timeline" className="text-sm font-medium text-fg-muted">
                    Timeline
                  </h3>
                  <ol className="mt-3">
                    {report.timeline
                      .slice()
                      .reverse()
                      .map((t, i, arr) => (
                        <li key={t.id} className="relative flex gap-3 pb-4 last:pb-0">
                          {i < arr.length - 1 && <span className="absolute top-4 bottom-0 left-[5px] w-px bg-border" aria-hidden />}
                          <span className={cx('relative mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-surface', t.status ? dotTone[t.status] : 'bg-border-strong')} aria-hidden />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-fg">{t.label}</p>
                            <p className="text-xs text-fg-muted">
                              {t.by} · {formatDateTime(t.at)}
                            </p>
                          </div>
                        </li>
                      ))}
                  </ol>
                </section>

                <section aria-labelledby="d-reporter">
                  <h3 id="d-reporter" className="text-sm font-medium text-fg-muted">
                    Reporter
                  </h3>
                  <div className="mt-2 flex items-center gap-3 rounded-lg border border-border p-3">
                    {report.reporter.anonymous ? (
                      <>
                        <span className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
                          <EyeOff className="size-5" aria-hidden />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-fg">Anonymous reporter</p>
                          <p className="text-xs text-fg-muted">Identity hidden at the reporter's request.</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-soft-fg">
                          {report.reporter.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-fg">{report.reporter.name}</p>
                          <p className="flex items-center gap-1 text-xs text-fg-muted">
                            <ShieldCheck className="size-3.5 text-resolved-fg" aria-hidden /> Verified with Ghana Card
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              </div>
            </div>

            {role === 'regulator' && (
              <div className="space-y-3 border-t border-border bg-surface-2 p-4 md:px-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-fg-muted">Regulator actions</p>
                  {report.assignedTeam && <p className="truncate pl-2 text-xs text-fg-muted">Team: {report.assignedTeam}</p>}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label htmlFor="d-status" className="sr-only">
                      Status
                    </label>
                    <Select id="d-status" value={report.status} onChange={(e) => changeStatus(e.target.value as Status)}>
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          Status: {STATUS[s].label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <AssignTeam reportId={report.id} current={report.assignedTeam} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
