import { cx } from '../../lib/meta'

export function LogoMark({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cx('size-8 shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="8" style={{ fill: onDark ? '#ffffff' : 'var(--brand)' }} />
      <path
        d="M16 6.5c-4.2 0-7.5 3.2-7.5 7.3 0 5.3 6.2 10.9 6.9 11.5.35.3.85.3 1.2 0 .7-.6 6.9-6.2 6.9-11.5 0-4.1-3.3-7.3-7.5-7.3Z"
        fill="none"
        style={{ stroke: onDark ? 'var(--nav)' : '#ffffff' }}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="13.8" r="2.9" style={{ fill: 'var(--alert)' }} />
    </svg>
  )
}

export function Logo({ onDark, className, size = 'md' }: { onDark?: boolean; className?: string; size?: 'md' | 'lg' }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <LogoMark onDark={onDark} className={size === 'lg' ? 'size-10' : 'size-8'} />
      <span className={cx('font-semibold tracking-tight', size === 'lg' ? 'text-xl' : 'text-base', onDark ? 'text-nav-fg' : 'text-fg')}>ResQ</span>
    </span>
  )
}

