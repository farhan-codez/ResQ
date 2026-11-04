import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Polygon, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Check, Crosshair, Layers, LocateFixed, Minus, Plus, Satellite, X } from 'lucide-react'
import { IconButton, Button } from '../../components/ui/Button'
import { SeverityChip, StatusChip } from '../../components/ui/Chips'
import { useToast } from '../../components/ui/Toast'
import { DETECTIONS, GHANA_CENTER } from '../../lib/data'
import { SEVERITY, SEVERITY_ORDER, cx, timeAgo } from '../../lib/meta'
import { useDismiss } from '../../lib/useDismiss'
import { useApp } from '../../lib/store'
import type { Report } from '../../lib/types'
import { draftIcon, markerHtml, meIcon, severityIcon } from './markers'

export interface MapHandle {
  focusReport: (id: string, openPopup?: boolean) => void
  flyTo: (lat: number, lng: number, zoom?: number) => void
}

interface Props {
  reports: Report[]
  selectedId?: string
  onViewDetails: (id: string) => void
  draft?: { lat: number; lng: number }
  pickMode?: boolean
  onPick?: (lat: number, lng: number) => void
  onCancelPick?: () => void
  compact?: boolean
  loading?: boolean
}

export const TILE = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}
const HIGH = { light: '#d42c1f', dark: '#e0412f' }
export const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

function Bridge({ onReady, pickMode, onPick }: { onReady: (m: L.Map) => void; pickMode?: boolean; onPick?: (lat: number, lng: number) => void }) {
  const map = useMap()
  useEffect(() => {
    onReady(map)
  }, [map, onReady])
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(map.getContainer())
    return () => ro.disconnect()
  }, [map])
  useMapEvents({
    click(e) {
      if (pickMode) onPick?.(e.latlng.lat, e.latlng.lng)
    },
  })
  useEffect(() => {
    const el = map.getContainer()
    el.style.cursor = pickMode ? 'crosshair' : ''
  }, [map, pickMode])
  return null
}

export const ReportsMap = forwardRef<MapHandle, Props>(function ReportsMap(
  { reports, selectedId, onViewDetails, draft, pickMode, onPick, onCancelPick, compact, loading },
  ref,
) {
  const { theme } = useApp()
  const toast = useToast()
  const mapRef = useRef<L.Map | null>(null)
  const markerRefs = useRef(new Map<string, L.Marker>())
  const [showReports, setShowReports] = useState(true)
  const [showDetections, setShowDetections] = useState(true)
  const [layersOpen, setLayersOpen] = useState(false)
  const [legendOpen, setLegendOpen] = useState(!compact)
  const [me, setMe] = useState<[number, number] | null>(null)
  const [locating, setLocating] = useState(false)
  const layersRef = useRef<HTMLDivElement>(null)
  useDismiss(layersRef, layersOpen, () => setLayersOpen(false))

  useImperativeHandle(ref, () => ({
    focusReport(id, openPopup = true) {
      const r = reports.find((x) => x.id === id)
      const map = mapRef.current
      if (!r || !map) return
      setShowReports(true)
      map.flyTo([r.lat, r.lng], Math.max(map.getZoom(), 11), { duration: 0.8 })
      if (openPopup) map.once('moveend', () => markerRefs.current.get(id)?.openPopup())
    },
    flyTo(lat, lng, zoom = 12) {
      mapRef.current?.flyTo([lat, lng], zoom, { duration: 0.8 })
    },
  }))

  const locate = () => {
    if (!navigator.geolocation) {
      toast({ tone: 'error', title: 'Location is not available in this browser.', description: 'Move the map by hand to find your area.' })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setMe(p)
        mapRef.current?.flyTo(p, 13, { duration: 0.8 })
      },
      () => {
        setLocating(false)
        toast({
          tone: 'error',
          title: "We couldn't find your location.",
          description: 'Allow location access in your browser, then try again.',
          action: { label: 'Try again', onClick: locate },
        })
      },
      { timeout: 8000 },
    )
  }

  return (
    <div className="relative isolate h-full w-full overflow-hidden bg-surface-2" aria-label="Incident map" role="region">
      <MapContainer center={GHANA_CENTER} zoom={compact ? 7 : 8} minZoom={6} maxZoom={17} zoomControl={false} className="h-full w-full" attributionControl>
        <TileLayer key={theme} url={TILE[theme]} attribution={ATTRIBUTION} subdomains="abcd" />
        <Bridge onReady={(m) => {
          mapRef.current = m
        }} pickMode={pickMode} onPick={onPick} />
        {showDetections &&
          DETECTIONS.map((d) => (
            <Polygon
              key={d.id}
              positions={d.points}
              pathOptions={{ color: HIGH[theme], weight: 1.5, dashArray: '4 3', fillColor: HIGH[theme], fillOpacity: theme === 'dark' ? 0.28 : 0.22 }}
              eventHandlers={{ click: (e) => pickMode && L.DomEvent.stopPropagation(e) }}
            >
              {!pickMode && (
                <Popup>
                  <div className="p-4 pr-10">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                      <Satellite className="size-4" aria-hidden /> Sentinel-2 detection
                    </p>
                    <p className="mt-1 text-sm font-semibold text-fg">{d.name}</p>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="text-fg-muted">Area</dt>
                        <dd className="tabular font-medium text-fg">{d.areaHa} ha</dd>
                      </div>
                      <div>
                        <dt className="text-fg-muted">Confidence</dt>
                        <dd className="tabular font-medium text-fg">{Math.round(d.confidence * 100)}%</dd>
                      </div>
                      <div>
                        <dt className="text-fg-muted">Detected</dt>
                        <dd className="font-medium text-fg">{timeAgo(d.detectedAt)}</dd>
                      </div>
                    </dl>
                  </div>
                </Popup>
              )}
            </Polygon>
          ))}
        {showReports &&
          reports.map((r) => (
            <Marker
              key={r.id}
              position={[r.lat, r.lng]}
              icon={severityIcon(r.severity, r.id === selectedId)}
              title={`${r.title}. ${SEVERITY[r.severity].label} severity`}
              alt={`${r.title}. ${SEVERITY[r.severity].label} severity`}
              keyboard
              ref={(m) => {
                if (m) markerRefs.current.set(r.id, m)
                else markerRefs.current.delete(r.id)
              }}
              interactive={!pickMode}
            >
              <Popup>
                <div className="p-4">
                  <p className="pr-8 text-sm font-semibold text-fg">{r.title}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {r.place}, {r.region}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <SeverityChip severity={r.severity} />
                    <StatusChip status={r.status} />
                    <span className="ml-auto text-xs text-fg-muted">{timeAgo(r.createdAt)}</span>
                  </div>
                  <Button size="sm" variant="secondary" block className="mt-3" onClick={() => onViewDetails(r.id)}>
                    View details
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}
        {draft && <Marker position={[draft.lat, draft.lng]} icon={draftIcon} interactive={false} keyboard={false} />}
        {me && <Marker position={me} icon={meIcon} interactive={false} keyboard={false} />}
      </MapContainer>

      {/* Live indicator */}
      <div className={cx('absolute top-4 right-4 z-[500] flex h-8 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-fg', compact && 'top-3 right-3')}>
        <span className="resq-pulse relative size-2 rounded-full bg-resolved-fg" aria-hidden />
        Live
        <span className="sr-only">. Reports update in real time.</span>
      </div>

      {/* Controls */}
      <div className={cx('absolute right-4 z-[500] flex flex-col gap-2', compact ? 'top-14 right-3' : 'top-16')}>
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <IconButton tone="map" label="Zoom in" tooltipSide="left" icon={Plus} className="rounded-none" onClick={() => mapRef.current?.zoomIn()} />
          <span className="h-px bg-border" />
          <IconButton tone="map" label="Zoom out" tooltipSide="left" icon={Minus} className="rounded-none" onClick={() => mapRef.current?.zoomOut()} />
        </div>
        <div className="rounded-lg border border-border bg-surface">
          <IconButton tone="map" label={locating ? 'Finding your location' : 'Locate me'} tooltipSide="left" icon={LocateFixed} onClick={locate} className={locating ? 'animate-pulse' : ''} />
        </div>
        <div ref={layersRef} className="relative">
          <div className="rounded-lg border border-border bg-surface">
            <IconButton tone="map" label="Map layers" tooltipSide="left" icon={Layers} aria-expanded={layersOpen} aria-haspopup="true" onClick={() => setLayersOpen((v) => !v)} />
          </div>
          {layersOpen && (
            <div className="animate-fade absolute top-0 right-full mr-2 w-60 rounded-lg border border-border bg-surface p-2 shadow-overlay" role="group" aria-label="Map layers">
              <p className="px-2 pt-1 pb-2 text-xs font-medium text-fg-muted">Show on map</p>
              {[
                { label: 'Citizen reports', sub: `${reports.length} reports`, on: showReports, set: setShowReports },
                { label: 'Satellite detections', sub: 'Sentinel-2, last 30 days', on: showDetections, set: setShowDetections },
              ].map((l) => (
                <label key={l.label} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-surface-2">
                  <input type="checkbox" className="peer sr-only" checked={l.on} onChange={(e) => l.set(e.target.checked)} />
                  <span
                    className={cx(
                      'flex size-5 items-center justify-center rounded-md border peer-focus-visible:focus-ring',
                      l.on ? 'border-brand bg-brand text-brand-fg' : 'border-border-strong bg-surface',
                    )}
                    aria-hidden
                  >
                    {l.on && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-fg">{l.label}</span>
                    <span className="text-xs text-fg-muted">{l.sub}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className={cx('absolute z-[500]', compact ? 'top-3 left-3' : 'bottom-6 left-4')}>
        {compact && !legendOpen ? (
          <button type="button" onClick={() => setLegendOpen(true)} className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-fg">
            <span className="flex -space-x-1" aria-hidden>
              {SEVERITY_ORDER.map((s) => (
                <span key={s} className="size-3 rounded-full border border-surface" style={{ background: `var(--${s})` }} />
              ))}
            </span>
            Legend
          </button>
        ) : (
          <div className="w-56 rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-fg-muted">Legend</p>
              {compact && (
                <button type="button" aria-label="Hide legend" onClick={() => setLegendOpen(false)} className="-m-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-surface-2">
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
            <ul className="mt-2 space-y-2">
              {SEVERITY_ORDER.slice()
                .reverse()
                .map((s) => (
                  <li key={s} className="flex items-center gap-2 text-sm text-fg">
                    <span className="shrink-0" dangerouslySetInnerHTML={{ __html: markerHtml(s, false, 20) }} aria-hidden />
                    {SEVERITY[s].label} severity
                  </li>
                ))}
              <li className="flex items-center gap-2 border-t border-border pt-2 text-sm text-fg">
                <span className="h-4 w-5 shrink-0 rounded-sm border border-dashed border-high bg-high/20" aria-hidden />
                Satellite detection
              </li>
            </ul>
          </div>
        )}
      </div>

      {pickMode && (
        <div className="absolute top-4 left-1/2 z-[600] flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-surface py-2 pr-2 pl-4 shadow-overlay">
          <Crosshair className="size-5 text-brand-soft-fg" aria-hidden />
          <p className="text-sm font-medium text-fg">Click the map to set the report location</p>
          <Button size="sm" variant="ghost" onClick={onCancelPick}>
            Cancel
          </Button>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-[700] flex items-center justify-center bg-surface-2" aria-hidden>
          <div className="resq-skeleton absolute inset-0 bg-surface-3" />
          <div className="relative rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg-muted">Loading map</div>
        </div>
      )}
    </div>
  )
})

export function MapThumb({ report }: { report: Report }) {
  const { theme } = useApp()
  return (
    <div className="h-40 overflow-hidden rounded-lg border border-border">
      <MapContainer
        key={report.id}
        center={[report.lat, report.lng]}
        zoom={11}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
        boxZoom={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer key={theme} url={TILE[theme]} subdomains="abcd" />
        <Marker position={[report.lat, report.lng]} icon={severityIcon(report.severity)} interactive={false} keyboard={false} />
      </MapContainer>
    </div>
  )
}

