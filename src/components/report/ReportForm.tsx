import { useEffect, useRef, useState } from 'react'
import { CircleCheck, ImagePlus, MapPin, RotateCcw, Send, CloudOff, X, Map as MapIcon, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FieldError, Hint, Input, Label, Textarea } from '@/components/ui/Field'
import { SeverityChip, StatusChip } from '@/components/ui/Chips'
import { useToast } from '@/components/ui/Toast'
import { SEVERITY, cx, formatCoords } from '@/lib/meta'
import { newReportId } from '@/lib/api'
import { useApp } from '@/lib/store'
import type { Report, Severity } from '@/lib/types'
import { SeverityPicker } from './SeverityPicker'

type Field = 'title' | 'description' | 'severity'
type Errors = Partial<Record<Field, string>>

function validate(v: { title: string; description: string; severity: Severity | null }): Errors {
  const e: Errors = {}
  if (!v.title.trim()) e.title = 'Add a short title, like "Excavators on the Pra River".'
  else if (v.title.trim().length < 5) e.title = 'Use at least 5 characters so regulators can scan it.'
  if (!v.description.trim()) e.description = 'Describe what you saw: machines, people, water colour.'
  else if (v.description.trim().length < 20) e.description = `Add a little more detail. ${20 - v.description.trim().length} more characters.`
  if (!v.severity) e.severity = 'Choose how urgent this is.'
  return e
}

export interface DraftLocation {
  lat: number
  lng: number
  place: string
  source: 'detected' | 'manual'
}

export function ReportForm({
  location,
  onChangeLocation,
  picking,
  onViewOnMap,
  titleRef,
  compact,
}: {
  location: DraftLocation
  onChangeLocation: () => void
  picking?: boolean
  /** Omitted for citizens: their map shows only their own location, not incidents. */
  onViewOnMap?: (id: string) => void
  titleRef?: React.RefObject<HTMLInputElement | null>
  compact?: boolean
}) {
  const { addReport, user } = useApp()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<Severity | null>(null)
  const [anonymous, setAnonymous] = useState(false)
  const [photos, setPhotos] = useState<{ url: string; name: string; file: File }[]>([])
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [failed, setFailed] = useState(false)
  const [sent, setSent] = useState<Report | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const sevRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLHeadingElement>(null)

  const errors = validate({ title, description, severity })
  const show = (f: Field) => (touched[f] ? errors[f] : undefined)
  const blur = (f: Field) => setTouched((t) => ({ ...t, [f]: true }))

  useEffect(() => {
    if (sent) successRef.current?.focus()
  }, [sent])

  const reset = () => {
    setTitle('')
    setDescription('')
    setSeverity(null)
    setAnonymous(false)
    setPhotos([])
    setTouched({})
    setFailed(false)
    setSent(null)
    setTimeout(() => titleRef?.current?.focus(), 0)
  }

  const submit = () => {
    setTouched({ title: true, description: true, severity: true })
    if (errors.title) return titleRef?.current?.focus()
    if (errors.description) return descRef.current?.focus()
    if (errors.severity) return (sevRef.current?.querySelector('[tabindex="0"]') as HTMLElement | null)?.focus()
    setSubmitting(true)
    setFailed(false)
    void (async () => {
      const showFailure = () => {
        setSubmitting(false)
        setFailed(true)
        setTimeout(() => errorRef.current?.focus(), 0)
      }
      const id = newReportId()
      const now = Date.now()
      const [place, region = 'Ghana'] = location.place.split(',').map((s) => s.trim().replace(/ Region$/, ''))
      const report: Report = {
        id,
        title: title.trim(),
        description: description.trim(),
        severity: severity!,
        status: 'pending',
        lat: location.lat,
        lng: location.lng,
        place,
        region,
        createdAt: now,
        photos: photos.map((p) => p.url),
        reporter: { name: anonymous ? 'Anonymous' : user.name, anonymous },
        timeline: [{ id: `${id}-t0`, at: now, label: 'Report submitted', by: anonymous ? 'Anonymous' : user.name, status: 'pending' }],
      }
      try {
        await addReport(report, photos.map((p) => p.file))
      } catch {
        return showFailure()
      }
      setSubmitting(false)
      setSent(report)
      toast({
        tone: 'success',
        title: 'Report sent. Regulators can see it now.',
        ...(onViewOnMap && { action: { label: 'View on map', onClick: () => onViewOnMap(id) } }),
      })
    })()
  }

  if (sent) {
    return (
      <div className={cx('flex flex-col', compact ? 'p-4' : 'p-6')}>
        <div className="flex size-12 items-center justify-center rounded-full bg-resolved-soft text-resolved-fg">
          <CircleCheck className="size-6" strokeWidth={2} aria-hidden />
        </div>
        <h2 ref={successRef} tabIndex={-1} className="mt-4 text-xl text-fg outline-none">
          Report sent. Regulators can see it now.
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          {anonymous
            ? 'Your report is with the regulators responsible for this area. It was sent anonymously, so there is no address to reply to.'
            : `Your report is with the regulators responsible for this area. We'll email ${user.email} when its status changes.`}
        </p>
        <div className="mt-6 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="tabular text-xs font-medium text-fg-muted">{sent.id}</span>
            <span className="text-xs text-fg-muted">Just now</span>
          </div>
          <p className="mt-1 text-sm font-medium text-fg">{sent.title}</p>
          <div className="mt-3 flex gap-1.5">
            <SeverityChip severity={sent.severity} />
            <StatusChip status={sent.status} />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-fg-muted">
            <MapPin className="size-4" aria-hidden /> {formatCoords(sent.lat, sent.lng)}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          {onViewOnMap && (
            <Button icon={MapIcon} block onClick={() => onViewOnMap(sent.id)}>
              View on map
            </Button>
          )}
          <Button variant={onViewOnMap ? 'secondary' : undefined} icon={PenLine} block onClick={reset}>
            Write another report
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className={cx('flex flex-col gap-5', compact ? 'p-4' : 'p-6')}
      aria-labelledby="report-form-title"
    >
      {!compact && (
        <div>
          <h2 id="report-form-title" className="text-xl text-fg">
            Report illegal mining
          </h2>
          <p className="mt-1 text-sm text-fg-muted">Tell regulators what you see. Stay at a safe distance.</p>
        </div>
      )}
      {compact && (
        <h2 id="report-form-title" className="sr-only">
          Report illegal mining
        </h2>
      )}

      {failed && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="flex gap-3 rounded-lg border border-high/40 bg-high-soft p-4 outline-none">
          <CloudOff className="size-5 shrink-0 text-high-fg" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-medium text-fg">We couldn't send your report.</p>
            <p className="mt-0.5 text-sm text-fg-muted">The connection dropped. Everything you wrote is still here.</p>
            <Button size="sm" variant="secondary" icon={RotateCcw} className="mt-3" onClick={submit} loading={submitting} loadingText="Retrying">
              Try again
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="r-title">Title</Label>
        <Input
          ref={titleRef}
          id="r-title"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => blur('title')}
          invalid={!!show('title')}
          aria-describedby={show('title') ? 'r-title-err' : undefined}
          placeholder="e.g. Excavators on the Pra River"
        />
        <FieldError id="r-title-err">{show('title')}</FieldError>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="r-desc">Description</Label>
        <Textarea
          ref={descRef}
          id="r-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => blur('description')}
          invalid={!!show('description')}
          aria-describedby={show('description') ? 'r-desc-err' : 'r-desc-hint'}
          rows={4}
        />
        {show('description') ? <FieldError id="r-desc-err">{show('description')}</FieldError> : <Hint id="r-desc-hint">What, how many people or machines, and since when.</Hint>}
      </div>

      <div className="flex flex-col gap-1.5" ref={sevRef}>
        <span id="r-sev-label" className="text-sm font-medium text-fg">
          Severity
        </span>
        <SeverityPicker
          labelledBy="r-sev-label"
          describedBy={show('severity') ? 'r-sev-err' : 'r-sev-hint'}
          value={severity}
          onChange={setSeverity}
          onBlur={() => blur('severity')}
          invalid={!!show('severity')}
        />
        {show('severity') ? (
          <FieldError id="r-sev-err">{show('severity')}</FieldError>
        ) : (
          <Hint id="r-sev-hint">{severity ? SEVERITY[severity].desc + '.' : 'High means danger to people or a river right now.'}</Hint>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-fg">Location</span>
        <div className={cx('flex items-start gap-3 rounded-lg border bg-surface-2 p-3', picking ? 'border-ring ring-[3px] ring-ring/25' : 'border-border')}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-fg">
            <MapPin className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-fg">
              {picking ? 'Choose a point on the map' : location.place}
              {!picking && <span className="text-xs font-normal text-fg-muted">{location.source === 'detected' ? 'Auto-detected' : 'Set on map'}</span>}
            </p>
            <p className="tabular text-xs text-fg-muted">{formatCoords(location.lat, location.lng)}</p>
            <button type="button" onClick={onChangeLocation} className="-mx-1 mt-1 min-h-11 cursor-pointer rounded-md px-1 text-sm font-medium text-brand-soft-fg underline-offset-4 hover:underline md:min-h-0">
              {picking ? 'Cancel' : 'Change location'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="r-photo" optional>
          Photos
        </Label>
        <input
          ref={fileRef}
          id="r-photo"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-describedby="r-photo-hint"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).slice(0, 4 - photos.length)
            setPhotos((p) => [...p, ...files.map((f) => ({ url: URL.createObjectURL(f), name: f.name, file: f }))])
            e.target.value = ''
          }}
        />
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p.url} className="group relative size-20 overflow-hidden rounded-lg border border-border">
              <img src={p.url} alt={`Attached photo ${i + 1}`} className="size-full object-cover" />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setPhotos((ps) => ps.filter((x) => x.url !== p.url))}
                className="absolute top-1 right-1 flex size-7 cursor-pointer items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          {photos.length < 4 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cx(
                'flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong text-sm font-medium text-fg-muted hover:border-fg-subtle hover:bg-surface-2 hover:text-fg',
                photos.length ? 'size-20 flex-col gap-1 text-xs' : 'h-20 w-full',
              )}
            >
              <ImagePlus className="size-5" aria-hidden />
              {photos.length ? 'Add' : 'Add photos'}
            </button>
          )}
        </div>
        <Hint id="r-photo-hint">Up to 4 photos. Only take photos if it is safe.</Hint>
      </div>

      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="mt-0.5 size-5 cursor-pointer accent-[var(--brand)]" />
        <span>
          <span className="block text-sm font-medium text-fg">Report anonymously</span>
          <span className="block text-xs text-fg-muted">Your name is hidden from everyone, including regulators.</span>
        </span>
      </label>

      <Button type="submit" variant="alert" size="lg" icon={Send} block loading={submitting} loadingText="Sending report">
        Submit report
      </Button>
    </form>
  )
}
