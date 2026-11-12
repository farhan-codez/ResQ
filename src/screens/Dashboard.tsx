import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronUp, ClipboardList, Satellite, Shield, Siren, Truck, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AppShell, BottomSheet } from '@/components/layout/AppShell'
import { ReportsMap, type MapHandle } from '@/components/map/ReportsMap'
import { ReportForm, type DraftLocation } from '@/components/report/ReportForm'
import { IncidentDetail } from '@/components/report/IncidentDetail'
import { Skeleton } from '@/components/ui/Skeleton'
import { DEFAULT_LOCATION, INITIAL_REPORTS } from '@/lib/data'
import { useApp } from '@/lib/store'
import { useIsMobile } from '@/lib/useMediaQuery'

function nearestPlace(lat: number, lng: number) {
  let best = INITIAL_REPORTS[0]
  let bestD = Infinity
  for (const r of INITIAL_REPORTS) {
    const d = (r.lat - lat) ** 2 + (r.lng - lng) ** 2
    if (d < bestD) {
      bestD = d
      best = r
    }
  }
  return `Near ${best.place}, ${best.region} Region`
}

function PanelSkeleton() {
  return (
    <div className="space-y-5 p-6" aria-busy="true" aria-label="Loading report form">
      <div className="space-y-2">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className={i ? 'h-28' : 'h-10'} />
        </div>
      ))}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </div>
      <Skeleton className="h-16" />
      <Skeleton className="h-20" />
      <Skeleton className="h-11" />
    </div>
  )
}

export function Dashboard() {
  const { route, navigate, reports, detections, dispatchAlerts, role } = useApp()
  const isRegulator = role === 'regulator'
  const isMobile = useIsMobile()
  const mapRef = useRef<MapHandle>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState<DraftLocation>({ ...DEFAULT_LOCATION, source: 'detected' })
  const [picking, setPicking] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetAfterPick, setSheetAfterPick] = useState(false)
  const [showForm, setShowForm] = useState(true)
  const incident = route.name === 'dashboard' ? route.incident : undefined
  const focus = route.name === 'dashboard' ? route.focus : undefined

  const handleLocationFound = useCallback((lat: number, lng: number, place: string) => {
    if (!isRegulator) {
      setLocation({ lat, lng, place, source: 'detected' })
    }
  }, [isRegulator])

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!focus || loading) return
    const t = setTimeout(() => {
      mapRef.current?.focusReport(focus)
      window.location.replace('#/dashboard')
    }, 150)
    return () => clearTimeout(t)
  }, [focus, loading])

  const openReport = useCallback(() => {
    if (isMobile) {
      setSheetOpen(true)
      return
    }
    setShowForm(true)
    panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    titleRef.current?.focus()
  }, [])

  useEffect(() => {
    if (route.name === 'dashboard' && route.focus === 'report') {
      window.location.replace('#/dashboard')
      setTimeout(openReport, 750)
    }
  }, [route, openReport])

  const viewOnMap = (id: string) => {
    setSheetOpen(false)
    setShowForm(false)
    setTimeout(() => mapRef.current?.focusReport(id), isMobile ? 250 : 0)
  }

  const togglePick = () => {
    if (picking) {
      setPicking(false)
      if (sheetAfterPick) setSheetOpen(true)
      return
    }
    setPicking(true)
    mapRef.current?.flyTo(location.lat, location.lng, 10)
    if (isMobile) {
      setSheetAfterPick(true)
      setSheetOpen(false)
    }
  }

  const onPick = (lat: number, lng: number) => {
    setLocation({ lat, lng, place: nearestPlace(lat, lng), source: 'manual' })
    setPicking(false)
    if (sheetAfterPick) {
      setSheetAfterPick(false)
      setTimeout(() => setSheetOpen(true), 300)
    }
  }

  const form = (compact: boolean) => (
    <ReportForm compact={compact} location={location} picking={picking} onChangeLocation={togglePick} onViewOnMap={isRegulator ? viewOnMap : undefined} titleRef={titleRef} />
  )

  // Regulator desk: live queue counts for the map page
  const deskRows = [
    {
      icon: ClipboardList,
      label: 'Reports awaiting a team',
      count: reports.filter((r) => r.status === 'pending' && !r.assignedTeam).length,
      onClick: () => navigate({ name: 'reports' }),
    },
    {
      icon: Satellite,
      label: 'Satellite leads to review',
      count: detections.filter((d) => d.status === 'pending_review').length,
      onClick: () => navigate({ name: 'reports' }),
    },
    {
      icon: Truck,
      label: 'Active dispatches',
      count: dispatchAlerts.filter((a) => a.status !== 'closed').length,
      onClick: () => navigate({ name: 'dispatch' }),
    },
  ]

  return (
    <AppShell active="map" onReport={openReport}>
      <div className="relative flex h-full">
        <div className="relative min-w-0 flex-1">
          <ReportsMap
            ref={mapRef}
            variant={isRegulator ? 'regulator' : 'citizen'}
            reports={reports}
            selectedId={incident}
            onViewDetails={(id) => navigate({ name: 'dashboard', incident: id })}
            draft={isRegulator ? location : undefined}
            pickMode={isRegulator && picking}
            onPick={onPick}
            onCancelPick={togglePick}
            onLocationFound={handleLocationFound}
            compact={isMobile}
            loading={loading}
          />
          {/* Floating report form (desktop) */}
          {(!isRegulator && !isMobile && (
            <div
              ref={panelRef}
              className="absolute left-6 top-6 z-[100] max-h-[calc(100%-3rem)] w-full max-w-sm origin-top-right scale-95 transform overflow-y-auto rounded-2xl border border-border bg-surface shadow-lg"
              role="dialog"
              aria-modal="true"
              aria-labelledby="form-title"
            >
              <h2 id="form-title" className="text-xl text-fg font-medium p-4 border-b border-border text-left">
                Report an issue
              </h2>
              <div className="p-4">
                {loading ? <PanelSkeleton /> : form(false)}
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="absolute top-2 right-2 rounded-lg bg-surface/70 p-1 hover:bg-surface/90"
                aria-label="Close report form"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          {isRegulator && !incident && (
            <div
              ref={panelRef}
              className="absolute left-6 top-6 z-[100] w-full max-w-sm origin-top-right scale-95 transform rounded-2xl border border-border bg-surface shadow-lg"
              role="region"
              aria-labelledby="reg-desk-title"
            >
              <h2 id="reg-desk-title" className="flex items-center gap-2 border-b border-border p-4 text-left text-xl font-medium text-fg">
                <Shield className="size-5 text-brand-soft-fg" aria-hidden />
                Regulator desk
              </h2>
              <div className="p-2">
                {deskRows.map((row) => (
                  <button
                    key={row.label}
                    type="button"
                    onClick={row.onClick}
                    className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-fg hover:bg-surface-2 focus-visible:bg-surface-2"
                  >
                    <row.icon className="size-4 shrink-0 text-fg-muted" aria-hidden />
                    <span className="flex-1">{row.label}</span>
                    <span className={row.count ? 'tabular font-semibold text-fg' : 'tabular font-semibold text-fg-muted'}>
                      {row.count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="border-t border-border p-3">
                <Button block onClick={() => navigate({ name: 'reports' })}>
                  Open reports queue
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isRegulator && isMobile && (
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} label="Report an issue" full keepMounted>
          <div className="flex items-center justify-between border-b border-border px-4 pb-3">
            <h2 className="text-xl text-fg">Report an issue</h2>
            <button type="button" onClick={() => setSheetOpen(false)} className="min-h-11 cursor-pointer px-2 text-sm font-medium text-brand-soft-fg">
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{form(true)}</div>
        </BottomSheet>
      )}

      {isRegulator && incident && (
        <IncidentDetail id={incident} onClose={() => navigate({ name: 'dashboard' })} onShowOnMap={(id) => {
          navigate({ name: 'dashboard' })
          setTimeout(() => mapRef.current?.focusReport(id), 300)
        }} />
      )}
    </AppShell>
  )
}
