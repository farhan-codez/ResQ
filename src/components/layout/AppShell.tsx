import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Bell, LayoutGrid, List, LogOut, Map as MapIcon, Moon, Search, Siren, Sun, User, X } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { SeverityChip } from '@/components/ui/Chips'
import { SEVERITY, cx, timeAgo } from '@/lib/meta'
import { useApp } from '@/lib/store'
import { useDismiss } from '@/lib/useDismiss'
import type { Report } from '@/lib/types'

type Active = 'map' | 'reports'

const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'

function SearchBox({ onDone, autoFocus }: { onDone?: () => void; autoFocus?: boolean }) {
  const { reports, navigate } = useApp()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const listId = useId()
  useDismiss(ref, open, () => setOpen(false))

  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return []
    return reports.filter((r) => `${r.title} ${r.place} ${r.region} ${r.id}`.toLowerCase().includes(t)).slice(0, 6)
  }, [q, reports])

  const choose = (r: Report) => {
    navigate({ name: 'dashboard', focus: r.id })
    setQ('')
    setOpen(false)
    onDone?.()
  }

  return (
    <div ref={ref} className="relative w-full">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-nav-fg-muted" aria-hidden />
      <input
        type="search"
        role="combobox"
        aria-expanded={open && q.length > 0}
        aria-controls={listId}
        aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
        aria-label="Search reports by place or title"
        placeholder="Search place, river or report ID"
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault()
            choose(results[active])
          }
        }}
        className="h-11 w-full rounded-lg border border-nav-border bg-nav-2 pr-3 pl-10 text-base text-nav-fg placeholder:text-nav-fg-muted outline-none focus:border-white/60 focus:ring-[3px] focus:ring-white/20 focus-visible:outline-none md:h-10 md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {open && q.trim().length > 0 && (
        <div className="animate-fade absolute top-full right-0 left-0 z-[1100] mt-2 overflow-hidden rounded-lg border border-border bg-surface shadow-overlay">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-fg-muted">No reports match "{q}". Try a town or river name.</p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Matching reports" className="max-h-80 overflow-auto py-1">
              {results.map((r, i) => (
                <li
                  key={r.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(r)}
                  className={cx('flex cursor-pointer items-center gap-3 px-4 py-2.5', i === active && 'bg-surface-2')}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{r.title}</p>
                    <p className="text-xs text-fg-muted">
                      {r.place}, {r.region} · {r.id}
                    </p>
                  </div>
                  <SeverityChip severity={r.severity} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function Notifications() {
  const { reports, navigate } = useApp()
  const [open, setOpen] = useState(false)
  const [read, setRead] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))
  const items = reports.slice(0, 4)
  const unread = read ? 0 : Math.min(3, items.length)
  return (
    <div ref={ref} className="relative">
      <span className="relative inline-flex">
        <IconButton tone="nav" icon={Bell} label={unread ? `Notifications, ${unread} unread` : 'Notifications'} tooltipSide="bottom" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)} />
        {unread > 0 && (
          <span className="pointer-events-none absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-alert text-[10px] font-semibold text-alert-fg ring-2 ring-nav" aria-hidden>
            {unread}
          </span>
        )}
      </span>
      {open && (
        <div className="animate-fade fixed inset-x-3 top-16 z-[1100] overflow-hidden rounded-lg border border-border bg-surface shadow-overlay md:absolute md:inset-x-auto md:top-full md:right-0 md:mt-2 md:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-fg">Notifications</p>
            <Button variant="link" size="sm" onClick={() => setRead(true)} disabled={unread === 0}>
              Mark all as read
            </Button>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-fg-muted">You're all caught up. New reports near you show up here.</p>
          ) : (
            <ul className="max-h-96 overflow-auto">
              {items.map((r, i) => {
                const Icon = SEVERITY[r.severity].icon
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        navigate({ name: 'dashboard', focus: r.id })
                      }}
                      className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left hover:bg-surface-2"
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `var(--${r.severity}-soft)`, color: `var(--${r.severity}-fg)` }}>
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-fg">
                          <span className="font-medium">New {SEVERITY[r.severity].label.toLowerCase()} severity report</span> near {r.place}
                        </span>
                        <span className="block text-xs text-fg-muted">{timeAgo(r.createdAt)}</span>
                      </span>
                      {!read && i < 3 && <span className="mt-2 size-2 shrink-0 rounded-full bg-alert" aria-label="Unread" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; icon?: typeof Sun }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md text-sm font-medium', value === o.value ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
        >
          {o.icon && <o.icon className="size-4" aria-hidden />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function AccountPanel({ onClose }: { onClose: () => void }) {
  const { user, role, setRole, theme, setTheme, navigate, signOut } = useApp()
  const initials = initialsOf(user.name)
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-soft-fg">{initials}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{user.name}</p>
          <p className="truncate text-xs text-fg-muted">{user.email}</p>
        </div>
      </div>
      <div className="space-y-4 p-4">
        {import.meta.env.DEV && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-fg-muted">View as</p>
            <Segmented
              label="View as"
              value={role}
              onChange={setRole}
              options={[
                { value: 'citizen', label: 'Citizen' },
                { value: 'regulator', label: 'Regulator' },
              ]}
            />
          </div>
        )}
        <div className="space-y-2">
          <p className="text-xs font-medium text-fg-muted">Theme</p>
          <Segmented
            label="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
            ]}
          />
        </div>
      </div>
      <div className="border-t border-border p-2">
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => {
              onClose()
              navigate({ name: 'library' })
            }}
            className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-sm text-fg hover:bg-surface-2 md:h-10"
          >
            <LayoutGrid className="size-5 text-fg-muted" aria-hidden /> Open component library
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onClose()
            void signOut().finally(() => navigate({ name: 'login' }))
          }}
          className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-sm text-fg hover:bg-surface-2 md:h-10"
        >
          <LogOut className="size-5 text-fg-muted" aria-hidden /> Sign out
        </button>
      </div>
    </div>
  )
}

function AvatarMenu() {
  const { user } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))
  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-white text-sm font-semibold text-nav ring-2 ring-transparent hover:ring-white/40"
      >
        {initialsOf(user.name)}
      </button>
      {open && (
        <div className="animate-fade absolute top-full right-0 z-[1100] mt-2 w-72 overflow-hidden rounded-lg border border-border bg-surface shadow-overlay">
          <AccountPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

export function BottomSheet({ open, onClose, label, children, full, keepMounted }: { open: boolean; onClose: () => void; label: string; children: ReactNode; full?: boolean; keepMounted?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open && !keepMounted) return null
  return (
    <div className={cx('fixed inset-0 z-[1050] md:hidden', !open && 'hidden')}>
      <div className="animate-fade absolute inset-0 bg-scrim" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={label} className={cx('animate-slide-up absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl border-t border-border bg-surface shadow-overlay', full ? 'top-6' : 'max-h-[88%]')}>
        <div className="flex justify-center pt-2 pb-1" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-border-strong" />
        </div>
        {children}
      </div>
    </div>
  )
}

export function AppShell({ active, children, onReport }: { active: Active; children: ReactNode; onReport: () => void }) {
  const { role, navigate } = useApp()
  const [mobileSearch, setMobileSearch] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const isRegulator = role === 'regulator'

  // Citizens get Map / Report / Account. Regulators get the triage workspace.
  const tabs = [
    { key: 'map', label: 'Map', icon: MapIcon, onClick: () => navigate({ name: 'dashboard' }), current: active === 'map' },
    ...(isRegulator ? [{ key: 'reports', label: 'Reports', icon: List, onClick: () => navigate({ name: 'reports' }), current: active === 'reports' }] : [{ key: 'report', label: 'Report', icon: Siren, onClick: onReport, current: false, alert: true }]),
    { key: 'account', label: 'Account', icon: User, onClick: () => setAccountOpen(true), current: false },
  ]

  return (
    <div className="flex h-full flex-col bg-bg">
      <a href="#main" className="sr-only z-[2000] rounded-lg bg-surface px-3 py-2 text-sm font-medium text-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to main content
      </a>
      <header className="relative z-[1000] flex h-16 shrink-0 items-center gap-3 border-b border-nav-border bg-nav px-3 text-nav-fg md:gap-4 md:px-4">
        <button type="button" onClick={() => navigate({ name: 'dashboard' })} className="cursor-pointer rounded-lg" aria-label="ResQ home">
          <Logo onDark />
        </button>
        {role === 'regulator' && (
          <nav aria-label="Primary" className="ml-2 hidden items-center gap-1 md:flex">
            {[
              { k: 'map' as const, label: 'Live map', icon: MapIcon, r: { name: 'dashboard' as const } },
              { k: 'reports' as const, label: 'Reports', icon: List, r: { name: 'reports' as const } },
            ].map((n) => (
              <button
                key={n.k}
                type="button"
                aria-current={active === n.k ? 'page' : undefined}
                onClick={() => navigate(n.r)}
                className={cx('inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium', active === n.k ? 'bg-nav-2 text-nav-fg' : 'text-nav-fg-muted hover:bg-nav-2 hover:text-nav-fg')}
              >
                <n.icon className="size-5" aria-hidden />
                {n.label}
              </button>
            ))}
          </nav>
        )}
        {isRegulator && (
          <div className="mx-auto hidden w-full max-w-md md:block">
            <SearchBox />
          </div>
        )}
        <div className="ml-auto flex items-center gap-1 md:ml-0 md:gap-2">
          {isRegulator && (
            <span className="md:hidden">
              <IconButton tone="nav" icon={Search} label="Search" tooltipSide="bottom" onClick={() => setMobileSearch(true)} />
            </span>
          )}
          {isRegulator && <Notifications />}
          <AvatarMenu />
        </div>
        {mobileSearch && (
          <div className="absolute inset-0 flex items-center gap-2 bg-nav px-3 md:hidden">
            <SearchBox autoFocus onDone={() => setMobileSearch(false)} />
            <IconButton tone="nav" icon={X} label="Close search" tooltipSide="bottom" onClick={() => setMobileSearch(false)} />
          </div>
        )}
      </header>
      <main id="main" className="relative min-h-0 flex-1">
        {children}
      </main>
      <nav aria-label="Primary" className="relative z-[1000] flex h-16 shrink-0 items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={t.onClick}
            aria-current={t.current ? 'page' : undefined}
            className={cx('flex min-h-11 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-xs font-medium', t.current ? 'text-brand-soft-fg' : 'text-fg-muted')}
          >
            <span className={cx('flex h-7 w-12 items-center justify-center rounded-lg', t.alert ? 'bg-alert text-alert-fg' : t.current && 'bg-brand-soft')}>
              <t.icon className="size-5" aria-hidden />
            </span>
            {t.label}
          </button>
        ))}
      </nav>
      <BottomSheet open={accountOpen} onClose={() => setAccountOpen(false)} label="Account">
        <AccountPanel onClose={() => setAccountOpen(false)} />
      </BottomSheet>
    </div>
  )
}
