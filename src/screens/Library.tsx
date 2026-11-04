import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Camera, FilterX, Inbox, MapPin, Moon, Plus, Satellite, Search, SearchX, Send, Siren, Sun, Trash2, Upload, Users } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { SeverityChip, StatusChip } from '@/components/ui/Chips'
import { FieldError, Hint, Input, Label, Select, Textarea } from '@/components/ui/Field'
import { Logo, LogoMark } from '@/components/ui/Logo'
import { Skeleton } from '@/components/ui/Skeleton'
import { ToastView } from '@/components/ui/Toast'
import { SeverityPicker } from '@/components/report/SeverityPicker'
import { markerHtml } from '@/components/map/markers'
import { ReportRow } from '@/screens/ReportsList'
import { INITIAL_REPORTS } from '@/lib/data'
import { SEVERITY_ORDER, STATUS_ORDER, cx, formatCoords, timeAgo } from '@/lib/meta'
import { useApp } from '@/lib/store'
import type { Severity } from '@/lib/types'

function Section({ id, title, desc, children }: { id: string; title: string; desc?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 border-t border-border py-12 first:border-t-0 first:pt-0">
      <div className="mb-6">
        <h2 id={`${id}-h`} className="text-xl text-fg">
          {title}
        </h2>
        {desc && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{desc}</p>}
      </div>
      {children}
    </section>
  )
}

function Spec({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col gap-3', className)}>
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </div>
  )
}

function Swatch({ token, name }: { token: string; name: string }) {
  const { theme } = useApp()
  const [hex, setHex] = useState('')
  useEffect(() => {
    setHex(getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim())
  }, [theme, token])
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="h-16 border-b border-border" style={{ background: `var(--${token})` }} />
      <div className="px-3 py-2">
        <p className="text-sm font-medium text-fg">{name}</p>
        <p className="tabular font-mono text-xs text-fg-muted">
          --{token} · {hex}
        </p>
      </div>
    </div>
  )
}

const NAV = [
  ['foundations', 'Foundations'],
  ['buttons', 'Buttons'],
  ['inputs', 'Inputs'],
  ['chips', 'Chips'],
  ['markers', 'Map markers'],
  ['cards', 'Cards'],
  ['toast', 'Toast'],
  ['table', 'Table row'],
  ['states', 'Loading & empty'],
] as const

export function Library() {
  const { theme, setTheme, navigate } = useApp()
  const [sev, setSev] = useState<Severity | null>('medium')
  const sample = INITIAL_REPORTS[0]

  return (
    <div className="min-h-full bg-bg">
      <header className="sticky top-0 z-50 border-b border-nav-border bg-nav text-nav-fg">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-8">
          <Logo onDark />
          <span className="hidden text-sm text-nav-fg-muted sm:inline">Component library</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="nav" icon={theme === 'dark' ? Sun : Moon} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            </Button>
            <Button variant="alert" iconRight={ArrowRight} onClick={() => navigate({ name: 'login' })}>
              Open the app
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-12 px-4 py-10 md:px-8">
        <nav aria-label="Library sections" className="sticky top-26 hidden h-fit w-44 shrink-0 lg:block">
          <ul className="space-y-1">
            {NAV.map(([id, l]) => (
              <li key={id}>
                <a href={`#/library`} onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
                }} className="block rounded-md px-3 py-1.5 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg">
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          <div className="mb-12">
            <p className="text-sm font-medium text-brand-soft-fg">ResQ Design System</p>
            <h1 className="mt-2 text-4xl text-fg">Calm tools for urgent reports</h1>
            <p className="mt-3 max-w-2xl text-base text-fg-muted">
              Every component used across citizen reporting and regulator monitoring. Colours follow a 60-30-10 split: neutral surface, forest green for brand and navigation, orange-red only for urgent actions and high severity.
            </p>
          </div>

          <Section id="foundations" title="Foundations" desc="Tokens are CSS variables with light and dark values. Toggle the theme in the header to see both.">
            <div className="space-y-8">
              <Spec label="Neutral surface (60%)">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  <Swatch token="bg" name="Background" />
                  <Swatch token="surface" name="Surface" />
                  <Swatch token="surface-2" name="Surface subtle" />
                  <Swatch token="border" name="Border" />
                  <Swatch token="fg" name="Text" />
                </div>
              </Spec>
              <Spec label="Brand (30%) and alert (10%)">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  <Swatch token="nav" name="Navigation" />
                  <Swatch token="brand" name="Brand" />
                  <Swatch token="brand-soft" name="Brand soft" />
                  <Swatch token="alert" name="Alert accent" />
                  <Swatch token="ring" name="Focus ring" />
                </div>
              </Spec>
              <div className="grid gap-8 md:grid-cols-2">
                <Spec label="Severity (always with icon and label)">
                  <div className="grid grid-cols-3 gap-3">
                    <Swatch token="low" name="Low · amber" />
                    <Swatch token="medium" name="Medium · orange" />
                    <Swatch token="high" name="High · red" />
                  </div>
                </Spec>
                <Spec label="Status">
                  <div className="grid grid-cols-3 gap-3">
                    <Swatch token="pending-fg" name="Pending · grey" />
                    <Swatch token="investigating-fg" name="Investigating · blue" />
                    <Swatch token="resolved-fg" name="Resolved · green" />
                  </div>
                </Spec>
              </div>

              <Spec label="Type: Inter, weights 400 / 500 / 600. Line-height 1.5 body, 1.2 headings.">
                <div className="divide-y divide-border rounded-lg border border-border bg-surface">
                  {[
                    ['40', 'text-4xl font-semibold', 'Display'],
                    ['28', 'text-2xl font-semibold', 'Page title'],
                    ['20', 'text-xl font-semibold', 'Section title'],
                    ['16', 'text-base', 'Body'],
                    ['14', 'text-sm font-medium', 'Label and UI'],
                    ['12', 'text-xs', 'Caption and meta'],
                  ].map(([px, cls, name]) => (
                    <div key={px} className="flex items-baseline gap-6 px-4 py-3">
                      <span className="tabular w-24 shrink-0 text-xs text-fg-muted">
                        {px}px · {name}
                      </span>
                      <span className={cx('truncate text-fg', cls)}>Report what you see</span>
                    </div>
                  ))}
                </div>
              </Spec>

              <div className="grid gap-8 md:grid-cols-2">
                <Spec label="Spacing: 4 / 8pt grid">
                  <div className="flex items-end gap-3 rounded-lg border border-border bg-surface p-4">
                    {[4, 8, 12, 16, 24, 32, 48].map((s) => (
                      <div key={s} className="flex flex-col items-center gap-2">
                        <span className="rounded-sm bg-brand" style={{ width: s, height: s }} />
                        <span className="tabular text-xs text-fg-muted">{s}</span>
                      </div>
                    ))}
                  </div>
                </Spec>
                <Spec label="Radius 8px. Elevation: 1px border first, shadow only on overlays.">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex h-20 items-center justify-center rounded-lg border border-border bg-surface text-sm text-fg-muted">Border</div>
                    <div className="flex h-20 items-center justify-center rounded-lg border border-border bg-surface text-sm text-fg-muted shadow-overlay">Overlay</div>
                  </div>
                </Spec>
              </div>
              <Spec label="Logo">
                <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border bg-surface p-4">
                  <Logo size="lg" />
                  <span className="rounded-lg bg-nav p-3">
                    <Logo onDark />
                  </span>
                  <LogoMark className="size-10" />
                </div>
              </Spec>
            </div>
          </Section>

          <Section id="buttons" title="Buttons" desc="Labels always start with a verb. Spinners appear only inside buttons. Lucide icons at 20px, 2px stroke.">
            <div className="space-y-8">
              <Spec label="Variants">
                <div className="flex flex-wrap items-center gap-3">
                  <Button icon={Send}>Sign in</Button>
                  <Button variant="alert" icon={Siren}>
                    Report emergency
                  </Button>
                  <Button variant="secondary" icon={Upload}>
                    Upload photo
                  </Button>
                  <Button variant="ghost" icon={FilterX}>
                    Clear filters
                  </Button>
                  <Button variant="link">Change location</Button>
                </div>
              </Spec>
              <Spec label="States: default, hover, focus, disabled, loading">
                <div className="flex flex-wrap items-center gap-3">
                  <Button>Submit report</Button>
                  <Button className="bg-brand-hover!">Submit report</Button>
                  <Button className="focus-ring">Submit report</Button>
                  <Button disabled>Submit report</Button>
                  <Button loading loadingText="Sending report">
                    Submit report
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="alert">Report emergency</Button>
                  <Button variant="alert" className="bg-alert-hover!">
                    Report emergency
                  </Button>
                  <Button variant="alert" className="focus-ring">
                    Report emergency
                  </Button>
                  <Button variant="alert" disabled>
                    Report emergency
                  </Button>
                  <Button variant="alert" loading loadingText="Sending report">
                    Report emergency
                  </Button>
                </div>
              </Spec>
              <Spec label="Sizes: 36 / 40 (44 on touch) / 44">
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" variant="secondary">
                    View details
                  </Button>
                  <Button size="md" variant="secondary">
                    View details
                  </Button>
                  <Button size="lg" variant="secondary">
                    View details
                  </Button>
                </div>
              </Spec>
              <Spec label="Icon buttons with tooltips (hover or focus)">
                <div className="flex items-center gap-2 pt-8">
                  <IconButton icon={Search} label="Search reports" />
                  <IconButton icon={MapPin} label="Show on map" />
                  <IconButton icon={Users} label="Assign team" />
                  <IconButton icon={Trash2} label="Remove photo" />
                  <div className="flex flex-col overflow-hidden rounded-lg border border-border">
                    <IconButton tone="map" icon={Plus} label="Zoom in" className="rounded-none" />
                  </div>
                </div>
              </Spec>
            </div>
          </Section>

          <Section id="inputs" title="Inputs" desc="Every input has a visible label. Placeholders only show format hints. Validation runs on blur; errors clear as soon as the value is fixed.">
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
              <Spec label="Default">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lib-1">Email</Label>
                  <Input id="lib-1" placeholder="name@gmail.com" />
                </div>
              </Spec>
              <Spec label="Focus">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lib-2">Email</Label>
                  <Input id="lib-2" defaultValue="ama.mensah@" className="border-ring! ring-[3px] ring-ring/25" />
                </div>
              </Spec>
              <Spec label="Error">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lib-3">Gmail address</Label>
                  <Input id="lib-3" defaultValue="ama.mensah@yahoo" invalid aria-describedby="lib-3e" />
                  <FieldError id="lib-3e">Use a Gmail address, like ama.mensah@gmail.com</FieldError>
                </div>
              </Spec>
              <Spec label="Disabled">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lib-4">Report ID</Label>
                  <Input id="lib-4" defaultValue="RQ-2481" disabled />
                </div>
              </Spec>
              <Spec label="Textarea" className="md:col-span-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lib-5">Description</Label>
                  <Textarea id="lib-5" aria-describedby="lib-5h" />
                  <Hint id="lib-5h">What, how many people or machines, and since when.</Hint>
                </div>
              </Spec>
              <Spec label="Select" className="md:col-span-2 xl:col-span-1">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lib-6">Status</Label>
                  <Select id="lib-6" defaultValue="investigating">
                    <option value="pending">Pending</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                  </Select>
                </div>
              </Spec>
              <Spec label="Severity segmented control" className="md:col-span-2 xl:col-span-1">
                <span id="lib-sev" className="sr-only">
                  Severity
                </span>
                <SeverityPicker labelledBy="lib-sev" value={sev} onChange={setSev} />
              </Spec>
              <Spec label="Location row" className="md:col-span-2">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-fg">
                    <MapPin className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg">Kyebi, Eastern Region</p>
                    <p className="tabular text-xs text-fg-muted">{formatCoords(6.1652, -0.5518)} · Auto-detected</p>
                  </div>
                  <Button variant="link" size="sm">
                    Change location
                  </Button>
                </div>
              </Spec>
            </div>
          </Section>

          <Section id="chips" title="Chips" desc="Severity and status never rely on colour alone. Each chip pairs an icon with a text label.">
            <div className="flex flex-wrap gap-8">
              <Spec label="Severity">
                <div className="flex gap-2">
                  {SEVERITY_ORDER.map((s) => (
                    <SeverityChip key={s} severity={s} />
                  ))}
                </div>
              </Spec>
              <Spec label="Status">
                <div className="flex gap-2">
                  {STATUS_ORDER.map((s) => (
                    <StatusChip key={s} status={s} />
                  ))}
                </div>
              </Spec>
            </div>
          </Section>

          <Section id="markers" title="Map markers" desc="Markers carry a severity glyph, so shape tells the story without colour. Satellite detections are dashed, semi-transparent red polygons.">
            <div className="flex flex-wrap items-end gap-10 rounded-lg border border-border bg-surface-2 p-6">
              {SEVERITY_ORDER.map((s) => (
                <Spec key={s} label={`${s[0].toUpperCase()}${s.slice(1)}`}>
                  <span dangerouslySetInnerHTML={{ __html: markerHtml(s) }} aria-hidden />
                </Spec>
              ))}
              <Spec label="Selected">
                <span className="p-1" dangerouslySetInnerHTML={{ __html: markerHtml('high', true, 38) }} aria-hidden />
              </Spec>
              <Spec label="Draft location">
                <span className="block size-[30px] -rotate-45 rounded-[50%_50%_50%_0] border-2 border-white bg-brand shadow" aria-hidden>
                  <span className="m-[8px] block size-2.5 rounded-full bg-white" />
                </span>
              </Spec>
              <Spec label="Satellite detection">
                <span className="block h-10 w-16 rounded-[40%_60%_55%_45%] border-[1.5px] border-dashed border-high bg-high/20" aria-hidden />
              </Spec>
              <Spec label="Live indicator">
                <span className="flex h-8 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-fg">
                  <span className="resq-pulse relative size-2 rounded-full bg-resolved-fg" aria-hidden />
                  Live
                </span>
              </Spec>
            </div>
          </Section>

          <Section id="cards" title="Cards" desc="Cards sit on a 1px border. Map popups use the overlay shadow.">
            <div className="grid gap-6 md:grid-cols-3">
              <Spec label="Map popup">
                <div className="w-[260px] rounded-lg border border-border bg-surface p-4 shadow-overlay">
                  <p className="text-sm font-semibold text-fg">{sample.title}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {sample.place}, {sample.region}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <SeverityChip severity={sample.severity} />
                    <StatusChip status={sample.status} />
                    <span className="ml-auto text-xs text-fg-muted">{timeAgo(sample.createdAt)}</span>
                  </div>
                  <Button size="sm" variant="secondary" block className="mt-3">
                    View details
                  </Button>
                </div>
              </Spec>
              <Spec label="Satellite popup">
                <div className="w-[260px] rounded-lg border border-border bg-surface p-4 shadow-overlay">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                    <Satellite className="size-4" aria-hidden /> Sentinel-2 detection
                  </p>
                  <p className="mt-1 text-sm font-semibold text-fg">Pra River corridor</p>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    {[
                      ['Area', '182.4 ha'],
                      ['Confidence', '91%'],
                      ['Detected', '3 days ago'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-fg-muted">{k}</dt>
                        <dd className="font-medium text-fg">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </Spec>
              <Spec label="Report card (mobile list)">
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-base font-medium text-fg">{INITIAL_REPORTS[1].title}</span>
                    <span className="shrink-0 pt-0.5 text-xs text-fg-muted">{timeAgo(INITIAL_REPORTS[1].createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-1 text-sm text-fg-muted">
                    <MapPin className="size-4" aria-hidden /> {INITIAL_REPORTS[1].place}
                  </span>
                  <span className="flex gap-1.5">
                    <SeverityChip severity={INITIAL_REPORTS[1].severity} />
                    <StatusChip status={INITIAL_REPORTS[1].status} />
                  </span>
                </div>
              </Spec>
            </div>
          </Section>

          <Section id="toast" title="Toast" desc="Toasts confirm and recover. Errors never blame the person and always offer a next step.">
            <div className="grid gap-4 md:grid-cols-3">
              <ToastView item={{ tone: 'success', title: 'Report sent. Regulators can see it now.', action: { label: 'View on map', onClick: () => {} } }} />
              <ToastView item={{ tone: 'error', title: "We couldn't update the status.", description: 'Nothing was changed. Check your connection.', action: { label: 'Try again', onClick: () => {} } }} />
              <ToastView item={{ tone: 'info', title: 'Check your inbox.', description: 'We sent a reset link to ama.mensah@gmail.com.' }} />
            </div>
          </Section>

          <Section id="table" title="Table row" desc="Rows highlight on hover. Icon actions carry tooltips and accessible names.">
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <table className="w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="[&>th]:border-b [&>th]:border-border [&>th]:bg-surface-2 [&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-medium [&>th]:text-fg-muted">
                    <th>Title</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Reported</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <ReportRow r={INITIAL_REPORTS[0]} onOpen={() => {}} onMap={() => {}} />
                  <ReportRow r={INITIAL_REPORTS[2]} onOpen={() => {}} onMap={() => {}} forceHover />
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-fg-muted">Second row shows the hover state.</p>
          </Section>

          <Section id="states" title="Loading and empty states" desc="Skeletons for lists and panels. Empty states explain what happens next with exactly one action.">
            <div className="grid gap-6 md:grid-cols-3">
              <Spec label="Panel skeleton">
                <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-20" />
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                </div>
              </Spec>
              <Spec label="Empty">
                <div className="flex flex-col items-center rounded-lg border border-border bg-surface p-6 text-center">
                  <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg-muted">
                    <Inbox className="size-6" aria-hidden />
                  </span>
                  <p className="mt-4 text-sm font-medium text-fg">No reports yet. New reports show up here in real time.</p>
                  <Button variant="alert" icon={Siren} className="mt-4">
                    Report emergency
                  </Button>
                </div>
              </Spec>
              <Spec label="Filtered to zero">
                <div className="flex flex-col items-center rounded-lg border border-border bg-surface p-6 text-center">
                  <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg-muted">
                    <SearchX className="size-6" aria-hidden />
                  </span>
                  <p className="mt-4 text-sm font-medium text-fg">No reports match these filters.</p>
                  <Button variant="secondary" icon={FilterX} className="mt-4">
                    Clear filters
                  </Button>
                </div>
              </Spec>
              <Spec label="Camera permission denied" className="md:col-span-3">
                <div className="flex flex-col items-center gap-3 rounded-lg bg-[#0b100d] p-8 text-center md:flex-row md:text-left">
                  <Camera className="size-6 text-white/80" aria-hidden />
                  <p className="flex-1 text-sm text-white">Camera is off. Allow camera access in your browser, or upload a photo instead.</p>
                  <Button icon={Upload}>Upload photo</Button>
                </div>
              </Spec>
            </div>
          </Section>
          <div className="border-t border-border pt-8">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate({ name: 'dashboard' })}>
              Go to the dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
