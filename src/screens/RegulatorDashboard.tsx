import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, Filter, MapPin, MoreHorizontal, Search, Shield, Users } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { SeverityChip, StatusChip } from '@/components/ui/Chips'
import { Select } from '@/components/ui/Field'
import { MapThumb } from '@/components/map/ReportsMap'
import { TEAMS } from '@/lib/data'
import { STATUS, STATUS_ORDER, cx, formatCoords, formatDateTime, timeAgo } from '@/lib/meta'
import { useApp } from '@/lib/store'
import { useDismiss } from '@/lib/useDismiss'
import type { Status } from '@/lib/types'
import { ReportsMap, type MapHandle } from '@/components/map/ReportsMap'
import { IncidentDetail } from '@/components/report/IncidentDetail'
import { AppShell } from '@/components/layout/AppShell'

const dotTone: Record<Status, string> = {
  pending: 'bg-pending-fg',
  investigating: 'bg-investigating-fg',
  resolved: 'bg-resolved-fg',
}

function AssignTeam({ reportId, current }: { reportId: string; current?: string }) {
  const { assignTeam } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))
  const choose = async (team: string) => {
    setOpen(false)
    try {
      await assignTeam(reportId, team)
    } catch {
      // toast error handled by store
    }
  }
  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" icon={Users} iconRight={MoreHorizontal} block aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)}>
        {current ? 'Reassign team' : 'Assign team'}
      </Button>
      {open && (
        <div role="menu" className="animate-fade absolute right-0 bottom-full left-0 z-10 mb-2 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-overlay">
          {TEAMS.map((t) => (
            <button key={t} role="menuitem" type="button" onClick={() => choose(t)} className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 text-left text-sm text-fg hover:bg-surface-2 md:min-h-10">
              <span className="flex-1">{t}</span>
              {t === current && <Shield className="size-4 text-brand-soft-fg" aria-label="Currently assigned" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status, onChange }: { status: Status; onChange: (s: Status) => void }) {
  const STATUS_LABELS: Record<Status, string> = {
    pending: 'Pending',
    investigating: 'Investigating',
    resolved: 'Resolved',
  }
  return (
    <Select
      value={status}
      onChange={(e) => onChange(e.target.value as Status)}
      className="w-40"
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
      ))}
    </Select>
  )
}

function ReportRow({ report, onClick, onStatusChange, onAssignTeam }: { report: any; onClick: () => void; onStatusChange: (id: string, status: any) => void; onAssignTeam: (id: string, team: string) => void }) {
  return (
    <tr className="border-b border-border hover:bg-surface-2 cursor-pointer" onClick={onClick}>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-fg truncate max-w-[200px]">{report.title}</span>
          <SeverityChip severity={report.severity} />
          <StatusBadge status={report.status} onChange={(s) => onStatusChange(report.id, s)} />
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-fg-muted">
          <span className="flex items-center gap-1"><MapPin className="size-3" aria-hidden /> {report.place}, {report.region}</span>
          <span>{timeAgo(report.createdAt)}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-sm text-fg-muted">
        {report.assignedTeam ? (
          <span className="inline-flex items-center gap-1 text-brand-soft-fg">
            <Shield className="size-3" aria-hidden /> {report.assignedTeam}
          </span>
        ) : (
          <AssignTeam reportId={report.id} />
        )}
      </td>
    </tr>
  )
}

export function RegulatorDashboard() {
  const { reports, role, navigate, updateStatus, assignTeam, dispatchAlerts } = useApp()
  const isRegulator = role === 'regulator'
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(t)
  }, [])

  // Filter reports
  const filteredReports = reports.filter((r) => {
    const matchesSearch = !search || `${r.title} ${r.place} ${r.region} ${r.id}`.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    const matchesSeverity = severityFilter === 'all' || r.severity === severityFilter
    const matchesRegion = regionFilter === 'all' || r.region === regionFilter
    return matchesSearch && matchesStatus && matchesSeverity && matchesRegion
  })

  // Get unique regions for filter
  const regions = [...new Set(reports.map((r) => r.region))].sort()

  const handleStatusChange = async (id: string, status: any) => {
    await updateStatus(id, status)
  }

  const handleAssignTeam = async (id: string, team: string) => {
    await assignTeam(id, team)
  }

  const viewReport = (report: any) => {
    setSelectedReport(report)
  }

  const closeDetail = () => {
    setSelectedReport(null)
  }

  if (!isRegulator) {
    return (
      <AppShell active="reports" onReport={() => {}}>
        <div className="flex h-full items-center justify-center bg-bg">
          <div className="text-center p-8">
            <Shield className="size-16 mx-auto text-fg-muted" aria-hidden />
            <h2 className="mt-4 text-xl text-fg">Regulator Access Required</h2>
            <p className="mt-2 text-sm text-fg-muted">This page is only accessible to regulators.</p>
            <Button className="mt-6" onClick={() => navigate({ name: 'dashboard' })}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell active="reports" onReport={() => {}}>
      <div className="flex h-full flex-col bg-bg">
        {/* Toolbar */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
          <button type="button" onClick={() => navigate({ name: 'dashboard' })} className="flex items-center gap-2 text-sm font-medium text-brand-soft-fg hover:underline">
            <ChevronLeft className="size-4" aria-hidden /> Back to Map
          </button>
          <div className="flex-1 flex items-center gap-2">
            <Search className="pointer-events-none absolute left-3 size-5 text-fg-muted" aria-hidden />
            <input
              type="search"
              placeholder="Search reports by place, title, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full max-w-md pl-10 pr-4 rounded-lg border border-border bg-surface text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </Select>
            <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="w-36">
              <option value="all">All Severity</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="w-40">
              <option value="all">All Regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Reports Table */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="animate-spin size-8 border-2 border-brand border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <table className="w-full text-sm" role="table">
                  <thead className="sticky top-0 bg-surface/80 backdrop-blur-sm border-b border-border">
                    <tr className="text-left text-xs font-medium text-fg-muted">
                      <th className="px-3 py-2.5">Report</th>
                      <th className="px-3 py-2.5 w-48">Team / Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-3 py-12 text-center text-fg-muted">
                          No reports match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((r) => (
                        <ReportRow
                          key={r.id}
                          report={r}
                          onClick={() => viewReport(r)}
                          onStatusChange={handleStatusChange}
                          onAssignTeam={handleAssignTeam}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Side Panel - Report Detail or Map */}
          <div className="w-96 md:w-[400px] border-l border-border bg-surface flex flex-col">
            {selectedReport ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex h-12 items-center justify-between border-b border-border px-4">
                  <h3 className="font-medium text-fg">Report Detail</h3>
                  <button onClick={closeDetail} className="text-fg-muted hover:text-fg">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <IncidentDetail
                    id={selectedReport.id}
                    onClose={closeDetail}
                    onShowOnMap={() => {}}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex h-12 items-center justify-between border-b border-border px-4">
                  <h3 className="font-medium text-fg">Live Map</h3>
                </div>
                <div className="flex-1 relative">
                  <ReportsMap
                    variant="regulator"
                    reports={reports}
                    compact={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}