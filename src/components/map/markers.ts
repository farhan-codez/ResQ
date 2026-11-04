import L from 'leaflet'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SEVERITY } from '../../lib/meta'
import type { Severity } from '../../lib/types'

const cache = new Map<string, L.DivIcon>()

const iconColor: Record<Severity, string> = { low: '#3d2900', medium: '#ffffff', high: '#ffffff' }

export function markerHtml(severity: Severity, selected = false, size = 32) {
  const svg = renderToStaticMarkup(createElement(SEVERITY[severity].icon, { size: Math.round(size * 0.5), strokeWidth: 2.25, color: iconColor[severity] }))
  const ring = selected ? `box-shadow:0 0 0 3px var(--surface),0 0 0 5px var(--fg);` : 'box-shadow:0 1px 3px rgb(0 0 0 / .35);'
  return `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:var(--${severity});border:2px solid #fff;display:flex;align-items:center;justify-content:center;${ring}">${svg}</div>`
}

export function severityIcon(severity: Severity, selected = false) {
  const key = `${severity}-${selected}`
  let icon = cache.get(key)
  if (!icon) {
    const size = selected ? 38 : 32
    icon = L.divIcon({ className: 'resq-marker', html: markerHtml(severity, selected, size), iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2 - 2] })
    cache.set(key, icon)
  }
  return icon
}

export const draftIcon = L.divIcon({
  className: 'resq-marker',
  html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--brand);border:2px solid #fff;box-shadow:0 2px 4px rgb(0 0 0 / .35);display:flex;align-items:center;justify-content:center"><span style="width:10px;height:10px;border-radius:9999px;background:#fff"></span></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 36],
})

export const meIcon = L.divIcon({
  className: 'resq-marker',
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgb(37 99 235 / .2)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

