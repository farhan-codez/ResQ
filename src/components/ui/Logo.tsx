import { cx } from '@/lib/meta'

const base = import.meta.env.BASE_URL

export function LogoMark({ className }: { className?: string; onDark?: boolean }) {
  return (
    <picture className={cx('inline-block size-8 shrink-0', className)}>
      <source srcSet={`${base}brand/webp/logo-64.webp 1x, ${base}brand/webp/logo-128.webp 2x`} type="image/webp" />
      <img
        src={`${base}brand/png/logo-64.png`}
        srcSet={`${base}brand/png/logo-64.png 1x, ${base}brand/png/logo-128.png 2x`}
        alt=""
        aria-hidden
        width={64}
        height={64}
        className="size-full object-contain"
        decoding="async"
      />
    </picture>
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
