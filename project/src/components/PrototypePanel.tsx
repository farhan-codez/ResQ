import { useRef, useState } from 'react'
import { Monitor, Settings2, Smartphone, X } from 'lucide-react'
import { cx } from '@/lib/meta'
import { useApp, type Route } from '@/lib/store'
import { useDismiss } from '@/lib/useDismiss'
import { INITIAL_REPORTS } from '@/lib/data'

const SCREENS: { label: string; route: Route; demo?: boolean }[] = [
  { label: 'Component library', route: { name: 'library' } },
  { label: '1. Login', route: { name: 'login' } },
  { label: '2. Sign up', route: { name: 'signup' } },
  { label: '3. Dashboard', route: { name: 'dashboard' } },
  { label: '4. Incident detail', route: { name: 'dashboard', incident: INITIAL_REPORTS[0].id } },
  { label: '5. Reports list', route: { name: 'reports' } },
  { label: '6. Report submitted', route: { name: 'dashboard' }, demo: true },
]

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-1.5">
      <span>
        <span className="block text-sm text-fg">{label}</span>
        {hint && <span className="block text-xs text-fg-muted">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className={cx('relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors peer-focus-visible:focus-ring', checked ? 'bg-brand' : 'bg-border-strong')} aria-hidden>
        <span className={cx('absolute top-0.5 size-4 rounded-full bg-white transition-transform', checked ? 'translate-x-4.5' : 'translate-x-0.5')} />
      </span>
    </label>
  )
}

function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; l: string; icon?: typeof Monitor }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cx('inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium', value === o.v ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
        >
          {o.icon && <o.icon className="size-4" aria-hidden />}
          {o.l}
        </button>
      ))}
    </div>
  )
}

export function PrototypePanel({ device, setDevice }: { device: 'desktop' | 'mobile'; setDevice: (d: 'desktop' | 'mobile') => void }) {
  const { route, navigate, theme, setTheme, role, setRole, simulateFailure, setSimulateFailure, emptyData, setEmptyData } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))

  const go = (s: (typeof SCREENS)[number]) => {
    navigate(s.route)
    if (s.demo) setTimeout(() => window.dispatchEvent(new Event('resq:demo-submit')), 900)
    if (s.demo && device === 'mobile') {
      const frame = document.querySelector<HTMLIFrameElement>('#resq-mobile-frame')
      setTimeout(() => frame?.contentWindow?.dispatchEvent(new Event('resq:demo-submit')), 1800)
    }
  }

  const isCurrent = (s: (typeof SCREENS)[number]) =>
    !s.demo && s.route.name === route.name && ('incident' in s.route ? s.route.incident === ('incident' in route ? route.incident : undefined) : !('incident' in route && route.incident))

  return (
    <div ref={ref} className="fixed right-4 bottom-8 z-[1040] hidden md:block">
      {open && (
        <div className="animate-fade absolute right-0 bottom-full mb-2 w-72 rounded-lg border border-border bg-surface shadow-overlay" role="dialog" aria-label="Prototype controls">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-fg">Prototype</p>
            <button type="button" aria-label="Close prototype controls" onClick={() => setOpen(false)} className="-m-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-surface-2">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-fg-muted">Screens</p>
              <ul className="space-y-0.5">
                {SCREENS.map((s) => (
                  <li key={s.label}>
                    <button
                      type="button"
                      onClick={() => go(s)}
                      aria-current={isCurrent(s) ? 'page' : undefined}
                      className={cx('flex h-9 w-full cursor-pointer items-center rounded-md px-2 text-left text-sm', isCurrent(s) ? 'bg-brand-soft font-medium text-brand-soft-fg' : 'text-fg hover:bg-surface-2')}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-fg-muted">Viewport</p>
              <Seg
                label="Viewport"
                value={device}
                onChange={setDevice}
                options={[
                  { v: 'desktop', l: 'Desktop', icon: Monitor },
                  { v: 'mobile', l: 'Mobile 375', icon: Smartphone },
                ]}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-fg-muted">Theme</p>
              <Seg label="Theme" value={theme} onChange={setTheme} options={[{ v: 'light', l: 'Light' }, { v: 'dark', l: 'Dark' }]} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-fg-muted">View as</p>
              <Seg label="View as" value={role} onChange={setRole} options={[{ v: 'citizen', l: 'Citizen' }, { v: 'regulator', l: 'Regulator' }]} />
            </div>
            <div className="border-t border-border pt-3">
              <p className="mb-1 text-xs font-medium text-fg-muted">States</p>
              <Toggle label="Simulate failures" hint="Sign in, submit, status and assign fail with recovery." checked={simulateFailure} onChange={setSimulateFailure} />
              <Toggle label="Empty data" hint="Shows the empty reports list and map." checked={emptyData} onChange={setEmptyData} />
              <p className="mt-2 text-xs text-fg-muted">Tip: on login, the password "wrong" shows the error state.</p>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-fg shadow-overlay hover:bg-surface-2"
      >
        <Settings2 className="size-5" aria-hidden />
        Prototype
      </button>
    </div>
  )
}
