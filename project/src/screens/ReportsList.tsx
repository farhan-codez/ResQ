import { useEffect, useMemo, useState } from 'react'
import { Eye, FilterX, Inbox, MapPin, SearchX, Siren, ShieldAlert, Map as MapIcon } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { IncidentDetail } from '@/components/report/IncidentDetail'
import { Button, IconButton } from '@/components/ui/Button'
import { SeverityChip, StatusChip } from '@/components/ui/Chips'
import { Select } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { SEVERITY, SEVERITY_ORDER, STATUS, STATUS_ORDER, cx, formatDateTime, timeAgo } from '@/lib/meta'
import { useApp } from '@/lib/store'
import type { Report, Severity, Status } from '@/lib/types'

type DateFilter = 'any' | '24h' | '7d' | '30d'
const DATE_MS: Record<Exclude<DateFilter, 'any'>, number> = { '24h': 86_400_000, '7d': 7 * 86_400_000, '30d': 30 * 86_400_000 }
const DATE_LABEL: Record<DateFilter, string> = { any: 'Any time', '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days' }

function EmptyState({ icon: Icon, title, body, action }: { icon: typeof Inbox; title: string; body?: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg-muted">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="mt-4 max-w-sm text-base font-medium text-fg">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-fg-muted">{body}</p>}
      <div className="mt-5">{action}</div>
    </div>
  )
}

export function ReportsList() {
  const { reports, navigate, route, role } = useApp()
  const [loading, setLoading] = useState(true)
  const [sev, setSev] = useState<Severity | 'all'>('all')
  const [status, setStatus] = useState<Status | 'all'>('all')
  const [date, setDate] = useState<DateFilter>('any')
  const incident = route.name === 'reports' ? route.incident : undefined

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  const filtered = useMemo(() => {
    const now = Date.now()
    return reports
      .filter((r) => (sev === 'all' || r.severity === sev) && (status === 'all' || r.status === status) && (date === 'any' || now - r.createdAt <= DATE_MS[date]))
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [reports, sev, status, date])

  const active = sev !== 'all' || status !== 'all' || date !== 'any'
  const clear = () => {
    setSev('all')
    setStatus('all')
    setDate('any')
  }
  const report = () => navigate({ name: 'dashboard', focus: 'report' })
  const showOnMap = (id: string) => navigate({ name: 'dashboard', focus: id })
  const open = (id: string) => navigate({ name: 'reports', incident: id })

  const counts = useMemo(
    () => ({
      highOpen: reports.filter((r) => r.severity === 'high' && r.status !== 'resolved').length,
      pending: reports.filter((r) => r.status === 'pending').length,
      investigating: reports.filter((r) => r.status === 'investigating').length,
    }),
    [reports],
  )

  if (role !== 'regulator') {
    return (
      <AppShell active="reports" onReport={report}>
        <EmptyState
          icon={ShieldAlert}
          title="The reports list is for regulators."
          body="You can still see every report on the live map."
          action={
            <Button icon={MapIcon} onClick={() => navigate({ name: 'dashboard' })}>
              Go to live map
            </Button>
          }
        />
      </AppShell>
    )
  }

  return (
    <AppShell active="reports" onReport={report}>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border bg-surface px-4 pt-5 pb-4 md:px-8 md:pt-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl text-fg">Reports</h1>
                <p className="mt-1 flex items-center gap-2 text-sm text-fg-muted">
                  <span className="resq-pulse relative size-2 rounded-full bg-resolved-fg" aria-hidden />
                  {reports.length} reports · updating in real time
                </p>
              </div>
              <dl className="hidden gap-6 md:flex">
                {[
                  { k: 'High severity, open', v: counts.highOpen, tone: 'text-high-fg' },
                  { k: 'Pending', v: counts.pending, tone: 'text-fg' },
                  { k: 'Investigating', v: counts.investigating, tone: 'text-fg' },
                ].map((c) => (
                  <div key={c.k} className="text-right">
                    <dt className="text-xs text-fg-muted">{c.k}</dt>
                    <dd className={cx('tabular text-xl font-semibold', c.tone)}>{loading ? '–' : c.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 md:flex md:items-end" role="group" aria-label="Filters">
              <div className="flex flex-col gap-1.5 md:w-48">
                <label htmlFor="f-sev" className="text-xs font-medium text-fg-muted">
                  Severity
                </label>
                <Select id="f-sev" value={sev} onChange={(e) => setSev(e.target.value as Severity | 'all')}>
                  <option value="all">All severities</option>
                  {SEVERITY_ORDER.slice()
                    .reverse()
                    .map((s) => (
                      <option key={s} value={s}>
                        {SEVERITY[s].label}
                      </option>
                    ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 md:w-48">
                <label htmlFor="f-status" className="text-xs font-medium text-fg-muted">
                  Status
                </label>
                <Select id="f-status" value={status} onChange={(e) => setStatus(e.target.value as Status | 'all')}>
                  <option value="all">All statuses</option>
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS[s].label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 md:w-48">
                <label htmlFor="f-date" className="text-xs font-medium text-fg-muted">
                  Reported
                </label>
                <Select id="f-date" value={date} onChange={(e) => setDate(e.target.value as DateFilter)}>
                  {(Object.keys(DATE_LABEL) as DateFilter[]).map((d) => (
                    <option key={d} value={d}>
                      {DATE_LABEL[d]}
                    </option>
                  ))}
                </Select>
              </div>
              {active && (
                <Button variant="ghost" icon={FilterX} onClick={clear}>
                  Clear filters
                </Button>
              )}
              <p className="text-sm text-fg-muted md:ml-auto md:pb-2.5" aria-live="polite">
                {!loading && `Showing ${filtered.length} of ${reports.length}`}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto md:px-8 md:py-6">
          <div className="mx-auto max-w-7xl">
            {loading ? (
              <TableSkeleton />
            ) : reports.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No reports yet. New reports show up here in real time."
                action={
                  <Button variant="alert" icon={Siren} onClick={report}>
                    Report emergency
                  </Button>
                }
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No reports match these filters."
                action={
                  <Button variant="secondary" icon={FilterX} onClick={clear}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <>
                <ReportsTable rows={filtered} onOpen={open} onMap={showOnMap} />
                <ul className="divide-y divide-border bg-surface md:hidden">
                  {filtered.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => open(r.id)} className="flex w-full cursor-pointer flex-col gap-2 px-4 py-4 text-left active:bg-surface-2">
                        <span className="flex items-start justify-between gap-3">
                          <span className="text-base font-medium text-fg">{r.title}</span>
                          <span className="shrink-0 pt-0.5 text-xs text-fg-muted">{timeAgo(r.createdAt)}</span>
                        </span>
                        <span className="flex items-center gap-1 text-sm text-fg-muted">
                          <MapPin className="size-4" aria-hidden /> {r.place}, {r.region}
                        </span>
                        <span className="flex gap-1.5">
                          <SeverityChip severity={r.severity} />
                          <StatusChip status={r.status} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
      {incident && <IncidentDetail id={incident} onClose={() => navigate({ name: 'reports' })} onShowOnMap={showOnMap} />}
    </AppShell>
  )
}

export function ReportsTable({ rows, onOpen, onMap, className }: { rows: Report[]; onOpen: (id: string) => void; onMap: (id: string) => void; className?: string }) {
  return (
    <div className={cx('hidden rounded-lg border border-border bg-surface md:block', className)}>
      <table className="w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:border-b [&>th]:border-border [&>th]:bg-surface-2 [&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-medium [&>th]:text-fg-muted">
            <th scope="col" className="rounded-tl-lg">
              Title
            </th>
            <th scope="col">Severity</th>
            <th scope="col">Status</th>
            <th scope="col">Location</th>
            <th scope="col">Reported</th>
            <th scope="col" className="rounded-tr-lg text-right">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <ReportRow key={r.id} r={r} onOpen={onOpen} onMap={onMap} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ReportRow({ r, onOpen, onMap, forceHover }: { r: Report; onOpen: (id: string) => void; onMap: (id: string) => void; forceHover?: boolean }) {
  return (
    <tr
      onClick={() => onOpen(r.id)}
      className={cx(
        'group cursor-pointer transition-colors hover:bg-surface-2 [&>td]:border-b [&>td]:border-border [&>td]:px-4 [&>td]:py-3 last:[&>td]:border-b-0',
        forceHover && 'bg-surface-2',
      )}
    >
      <td className="max-w-80">
        <p className="truncate font-medium text-fg">{r.title}</p>
        <p className="tabular text-xs text-fg-muted">{r.id}</p>
      </td>
      <td>
        <SeverityChip severity={r.severity} />
      </td>
      <td>
        <StatusChip status={r.status} />
      </td>
      <td className="text-fg">
        {r.place}
        <span className="block text-xs text-fg-muted">{r.region}</span>
      </td>
      <td className="whitespace-nowrap text-fg" title={formatDateTime(r.createdAt)}>
        {timeAgo(r.createdAt)}
      </td>
      <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <IconButton icon={Eye} label="View details" onClick={() => onOpen(r.id)} />
        <IconButton icon={MapPin} label="Show on map" onClick={() => onMap(r.id)} />
      </td>
    </tr>
  )
}

function TableSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading reports">
      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
        <div className="h-11 border-b border-border bg-surface-2" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-border px-4 py-4 last:border-b-0">
            <div className="flex-[2] space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-border bg-surface md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2 px-4 py-4">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
