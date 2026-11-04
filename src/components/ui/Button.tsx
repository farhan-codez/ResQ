import { LoaderCircle, type LucideIcon } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/meta'

type Variant = 'primary' | 'alert' | 'secondary' | 'ghost' | 'link' | 'nav'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  loadingText?: string
  icon?: LucideIcon
  iconRight?: LucideIcon
  block?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-fg hover:bg-brand-hover',
  alert: 'bg-alert text-alert-fg hover:bg-alert-hover',
  secondary: 'bg-surface text-fg border border-border-strong hover:bg-surface-2',
  ghost: 'text-fg hover:bg-surface-2',
  link: 'text-brand-soft-fg underline-offset-4 hover:underline px-0! h-auto!',
  nav: 'text-nav-fg hover:bg-nav-2',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 md:h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, loadingText, icon: Icon, iconRight: IconRight, block, className, children, disabled, type = 'button', onClick, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      className={cx(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors select-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        block && 'w-full',
        loading && 'cursor-progress',
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-5 animate-spin" strokeWidth={2} aria-hidden /> : Icon && <Icon className="size-5" strokeWidth={2} aria-hidden />}
      <span>{loading && loadingText ? loadingText : children}</span>
      {!loading && IconRight && <IconRight className="size-5" strokeWidth={2} aria-hidden />}
    </button>
  )
})

export function IconButton({
  label,
  icon: Icon,
  className,
  tooltipSide = 'top',
  tone = 'default',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement>; label: string; icon: LucideIcon; tooltipSide?: 'top' | 'bottom' | 'left' | 'right'; tone?: 'default' | 'nav' | 'map' }) {
  const tones = {
    default: 'text-fg-muted hover:bg-surface-3 hover:text-fg',
    nav: 'text-nav-fg hover:bg-nav-2',
    map: 'bg-surface text-fg hover:bg-surface-2',
  }
  const side = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  }
  return (
    <span className="group/tt relative inline-flex">
      <button
        type="button"
        aria-label={label}
        className={cx('inline-flex size-11 cursor-pointer items-center justify-center rounded-lg transition-colors md:size-10', tones[tone], className)}
        {...rest}
      >
        <Icon className="size-5" strokeWidth={2} aria-hidden />
      </button>
      <span
        role="tooltip"
        className={cx(
          'pointer-events-none absolute z-50 rounded-md bg-fg px-2 py-1 text-xs font-medium whitespace-nowrap text-bg opacity-0 transition-opacity delay-0',
          'group-hover/tt:opacity-100 group-hover/tt:delay-300 group-has-[:focus-visible]/tt:opacity-100',
          side[tooltipSide],
        )}
      >
        {label}
      </span>
    </span>
  )
}

