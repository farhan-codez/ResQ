import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Inbox, MapPin, MoreHorizontal, Search, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SeverityChip } from '@/components/ui/Chips'
import { Select } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { TEAMS } from '@/lib/data'
import { STATUS_ORDER, timeAgo } from '@/lib/meta'
import { useApp } from '@/lib/store'
import { useDismiss } from '@/lib/useDismiss'
import type { Status } from '@/lib/types'
import { ReportsMap } from '@/components/map/ReportsMap'
import { IncidentDetail } from '@/components/report/IncidentDetail'
import { AppShell } from '@/components/layout/AppShell'
import { SatelliteDetectionsPanel } from '@/components/regulator/SatelliteDetectionsPanel'
import { useToast } from '@/components/ui/Toast'

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
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
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
    <div onClick={(e) => e.stopPropagation()}>
      <Select
        value={status}
        onChange={(e) => onChange(e.target.value as Status)}
        className="w-40"
        aria-label="Report status"
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </Select>
    </div>
  )
}

function ReportRow({ report, onClick, onStatusChange, onAssignTeam }: { report: any; onClick: () => void; onStatusChange: (id: string, status: any) => void; onAssignTeam: (id: string, team: string) => void }) {
  return (
    <tr
      tabIndex={0}
      className="cursor-pointer border-b border-border transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <td className="max-w-0 px-4 py-3">
        <div className="truncate font-medium text-fg">{report.title}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-muted">
          <MapPin className="size-3 shrink-0" aria-hidden />
          <span className="truncate">
            {report.place}
            <span className="lg:hidden">, {report.region}</span>
          </span>
          <span aria-hidden>·</span>
          <span className="shrink-0 tabular">{timeAgo(report.createdAt)}</span>
        </div>
      </td>
      <td className="px-3 py-3">
        <SeverityChip severity={report.severity} />
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={report.status} onChange={(s) => onStatusChange(report.id, s)} />
      </td>
      <td className="hidden px-3 py-3 text-sm text-fg-muted lg:table-cell">{report.region}</td>
      <td className="px-3 py-3">
        {report.assignedTeam ? (
          <div className="flex w-52 items-center gap-1.5 text-sm text-brand-soft-fg">
            <Shield className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{report.assignedTeam}</span>
          </div>
        ) : (
          <div className="w-52">
            <AssignTeam reportId={report.id} />
          </div>
        )}
      </td>
    </tr>
  )
}

export function RegulatorDashboard() {
  const { reports, detections, role, navigate, updateStatus, assignTeam, setDetectionStatus } = useApp()
  const toast = useToast()
  const isRegulator = role === 'regulator'
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'reports' | 'detections'>('reports')

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

  const filtersActive = !!search || statusFilter !== 'all' || severityFilter !== 'all' || regionFilter !== 'all'
  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setSeverityFilter('all')
    setRegionFilter('all')
  }

  const pendingDetections = detections.filter((d) => d.status === 'pending_review')

  const handleStatusChange = async (id: string, status: any) => {
    await updateStatus(id, status)
  }

  const handleAssignTeam = async (id: string, team: string) => {
    await assignTeam(id, team)
  }

  const handleConfirmDetection = async (detectionId: string) => {
    await setDetectionStatus(detectionId, 'confirmed')
    toast({ tone: 'success', title: 'Lead confirmed', description: 'Marked for field follow-up.' })
  }

  const handleDismissDetection = async (detectionId: string) => {
    await setDetectionStatus(detectionId, 'dismissed')
    toast({ tone: 'info', title: 'Lead dismissed', description: 'Removed from the review queue.' })
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
          <div className="p-8 text-center">
            <Shield className="mx-auto size-12 text-fg-muted" aria-hidden />
            <h2 className="mt-4 text-xl text-fg">Regulator access required</h2>
            <p className="mt-2 text-sm text-fg-muted">This workspace is only available to regulator accounts.</p>
            <Button className="mt-6" onClick={() => navigate({ name: 'dashboard' })}>
              Go to map
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
        <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface px-4 py-2.5">
          <button
            type="button"
            onClick={() => navigate({ name: 'dashboard' })}
            className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-brand-soft-fg hover:underline"
          >
            <ChevronLeft className="size-4" aria-hidden /> Map
          </button>
          <div className="relative min-w-52 flex-1 md:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
            <input
              type="search"
              placeholder="Search by place, title, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search reports"
              className="h-10 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm text-fg outline-none placeholder:text-fg-muted focus:border-brand focus:ring-2 focus:ring-brand/20 [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" className="w-36">
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </Select>
            <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} aria-label="Filter by severity" className="w-36">
              <option value="all">All severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} aria-label="Filter by region" className="w-40">
              <option value="all">All regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
            <Button variant={activeTab === 'reports' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('reports')}>
              Reports
            </Button>
            <Button variant={activeTab === 'detections' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('detections')}>
              Satellite
              {pendingDetections.length > 0 && (
                <span className="tabular ml-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-alert px-1 text-[10px] leading-4 font-semibold text-alert-fg">
                  {pendingDetections.length}
                </span>
              )}
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {activeTab === 'detections' ? (
            <div className="flex-1 overflow-hidden">
              <SatelliteDetectionsPanel
                detections={detections}
                onConfirm={(d) => handleConfirmDetection(d.id)}
                onDismiss={handleDismissDetection}
              />
            </div>
          ) : (
            <>
              {/* Reports list */}
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4">
                  <p className="text-xs text-fg-muted" aria-live="polite">
                    {loading
                      ? 'Loading reports…'
                      : filteredReports.length === reports.length
                        ? <span className="tabular">{reports.length} reports</span>
                        : <span className="tabular">{filteredReports.length} of {reports.length} reports</span>}
                  </p>
                  {!loading && filtersActive && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="cursor-pointer text-xs font-medium text-brand-soft-fg hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  {loading ? (
                    <div aria-busy="true" aria-label="Loading reports">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3.5">
                          <Skeleton className="h-5 flex-1" />
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-8 w-40" />
                          <Skeleton className="hidden h-5 w-28 lg:block" />
                          <Skeleton className="h-5 w-52" />
                        </div>
                      ))}
                    </div>
                  ) : filteredReports.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                      <Inbox className="size-10 text-fg-subtle" aria-hidden />
                      <div>
                        <p className="font-medium text-fg">No reports match your filters</p>
                        <p className="mt-1 text-sm text-fg-muted">
                          {reports.length === 0
                            ? 'Reports from citizens will appear here as they are submitted.'
                            : 'Adjust the search or filters to see more of the queue.'}
                        </p>
                      </div>
                      {filtersActive && (
                        <Button variant="secondary" size="sm" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full text-sm" role="table">
                      <thead className="sticky top-0 z-10 border-b border-border bg-surface">
                        <tr className="text-left text-xs font-medium text-fg-muted">
                          <th scope="col" className="px-4 py-2.5 font-medium">Report</th>
                          <th scope="col" className="w-24 px-3 py-2.5 font-medium">Severity</th>
                          <th scope="col" className="w-44 px-3 py-2.5 font-medium">Status</th>
                          <th scope="col" className="hidden w-40 px-3 py-2.5 font-medium lg:table-cell">Region</th>
                          <th scope="col" className="w-52 px-3 py-2.5 font-medium">Team</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReports.map((r) => (
                          <ReportRow
                            key={r.id}
                            report={r}
                            onClick={() => viewReport(r)}
                            onStatusChange={handleStatusChange}
                            onAssignTeam={handleAssignTeam}
                          />
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Side Panel - Live Map */}
              <div className="hidden w-96 flex-col border-l border-border bg-surface xl:flex xl:w-[400px]">
                <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
                  <h3 className="text-sm font-semibold text-fg">Live map</h3>
                </div>
                <div className="relative flex-1">
                  <ReportsMap
                    variant="regulator"
                    reports={reports}
                    compact={false}
                  />
                </div>
              </div>

              {/* Report detail - the component renders its own modal chrome */}
              {selectedReport && (
                <IncidentDetail
                  id={selectedReport.id}
                  onClose={closeDetail}
                  onShowOnMap={(id) => navigate({ name: 'dashboard', incident: id, focus: id })}
                />
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
