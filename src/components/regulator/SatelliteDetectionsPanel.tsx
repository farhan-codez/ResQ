import { useState } from 'react'
import { CheckCircle, XCircle, Image, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { timeAgo } from '@/lib/meta'
import type { Detection } from '@/lib/types'

interface SatelliteDetectionsPanelProps {
  detections: Detection[]
  onConfirm: (detection: Detection) => void
  onDismiss: (id: string) => void
}

export function SatelliteDetectionsPanel({ detections, onConfirm, onDismiss }: SatelliteDetectionsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const ordered = [...detections].sort(
    (a, b) => Number(b.status === 'pending_review') - Number(a.status === 'pending_review'),
  )

  if (detections.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <Image className="mb-4 size-16 text-fg-muted" aria-hidden />
        <h3 className="mb-1 text-lg font-semibold text-fg">No satellite leads yet</h3>
        <p className="max-w-md text-sm text-fg-muted">
          The detection worker adds leads here after each satellite pass. Confirm or dismiss each lead after review.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <h3 className="mb-4 font-semibold text-fg">Satellite leads ({detections.length})</h3>
      <div className="space-y-3">
        {ordered.map((detection) => {
          const isExpanded = expandedId === detection.id

          return (
            <div
              key={detection.id}
              className={`rounded-lg border bg-surface-2 transition-colors ${isExpanded ? 'border-brand-soft-fg/60' : 'border-border'}`}
            >
              <button
                type="button"
                onClick={() => toggleExpand(detection.id)}
                className="flex w-full items-start gap-3 p-4 text-left"
                aria-expanded={isExpanded}
              >
                {detection.imageUrl ? (
                  <img
                    src={detection.imageUrl}
                    alt={`Satellite view of ${detection.name}`}
                    className="size-20 shrink-0 rounded border border-border object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex size-20 shrink-0 items-center justify-center rounded border border-border bg-surface">
                    <Image className="size-6 text-fg-muted" aria-hidden />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-fg">{detection.name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" aria-hidden /> {detection.region || 'Ghana'}
                    </span>
                    <span>{detection.areaHa} ha</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" aria-hidden /> {timeAgo(detection.detectedAt)}
                    </span>
                    <span className="rounded-md bg-surface-3 px-2 py-0.5 font-medium text-fg">
                      {Math.round(detection.confidence * 100)}% confidence
                    </span>
                  </span>
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 pb-4">
                  <dl className="mt-4 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <dt className="text-fg-muted">Lead ID</dt>
                      <dd className="font-mono text-fg">{detection.id}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-muted">Confidence</dt>
                      <dd className="font-mono text-fg">{Math.round(detection.confidence * 100)}%</dd>
                    </div>
                    <div>
                      <dt className="text-fg-muted">Area</dt>
                      <dd className="font-mono text-fg">{detection.areaHa} ha</dd>
                    </div>
                    <div>
                      <dt className="text-fg-muted">Detected</dt>
                      <dd className="font-mono text-fg">{new Date(detection.detectedAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-muted">Source</dt>
                      <dd className="font-mono text-fg">{detection.source || 'Sentinel-2'}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-muted">Status</dt>
                      <dd className="font-mono capitalize text-fg">{detection.status.replace('_', ' ')}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onConfirm(detection)}
                      disabled={detection.status !== 'pending_review'}
                    >
                      <CheckCircle className="size-4" /> Confirm lead
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onDismiss(detection.id)}
                      disabled={detection.status !== 'pending_review'}
                    >
                      <XCircle className="size-4" /> Dismiss
                    </Button>
                    {detection.imageUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(detection.imageUrl, '_blank', 'noopener')}
                      >
                        <Image className="size-4" /> View full image
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
