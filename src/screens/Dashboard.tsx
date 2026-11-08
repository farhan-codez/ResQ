import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronUp, Siren } from 'lucide-react'
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
  const { route, navigate, reports, role } = useApp()
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
  const incident = route.name === 'dashboard' ? route.incident : undefined
  const focus = route.name === 'dashboard' ? route.focus : undefined

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
    panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    titleRef.current?.focus()
  }, [isMobile])

  useEffect(() => {
    if (route.name === 'dashboard' && route.focus === 'report') {
      window.location.replace('#/dashboard')
      setTimeout(openReport, 750)
    }
  }, [route, openReport])

  const viewOnMap = (id: string) => {
    setSheetOpen(false)
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

  return (
    <AppShell active="map" onReport={openReport}>
      <div className="flex h-full">
        {!isRegulator && (
          <aside ref={panelRef} aria-label="Report form" className="hidden w-[400px] shrink-0 overflow-y-auto border-r border-border bg-surface md:block">
            {loading ? <PanelSkeleton /> : !isMobile && form(false)}
          </aside>
        )}
        <div className="relative min-w-0 flex-1">
          <ReportsMap
            ref={mapRef}
            variant={isRegulator ? 'regulator' : 'citizen'}
            reports={reports}
            selectedId={incident}
            onViewDetails={(id) => navigate({ name: 'dashboard', incident: id })}
            draft={location}
            pickMode={picking}
            onPick={onPick}
            onCancelPick={togglePick}
            compact={isMobile}
            loading={loading}
          />
          {/* Mobile peek: collapsed state of the report bottom sheet */}
          {!isRegulator && isMobile && !picking && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="absolute inset-x-0 bottom-0 z-[800] flex cursor-pointer flex-col items-stretch rounded-t-2xl border-t border-border bg-surface px-4 pt-2 pb-3 text-left shadow-overlay"
              aria-label="Open report form"
            >
              <span className="mx-auto h-1 w-10 rounded-full bg-border-strong" aria-hidden />
              <span className="mt-2 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-alert text-alert-fg">
                  <Siren className="size-5" aria-hidden />
                </span>
                <span className="flex-1">
                  <span className="block text-base font-medium text-fg">Report illegal mining</span>
                  <span className="block truncate text-xs text-fg-muted">{location.source === 'detected' ? 'Location detected: ' : 'Location set: '}{location.place}</span>
                </span>
                <ChevronUp className="size-5 text-fg-muted" aria-hidden />
              </span>
            </button>
          )}
        </div>
      </div>

      {!isRegulator && isMobile && (
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} label="Report illegal mining" full keepMounted>
          <div className="flex items-center justify-between border-b border-border px-4 pb-3">
            <h2 className="text-xl text-fg">Report illegal mining</h2>
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
