import { ChevronDown, CircleAlert } from 'lucide-react'
import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cx } from '../../lib/meta'

export const controlBase =
  'w-full rounded-lg border bg-surface text-base text-fg placeholder:text-fg-subtle transition-[border-color,box-shadow] outline-none md:text-sm ' +
  'focus-visible:outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/25 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-subtle'

export function controlTone(invalid?: boolean) {
  return invalid ? 'border-high focus:border-high focus:ring-high/25' : 'border-border-strong hover:border-fg-subtle'
}

export function Label({ htmlFor, children, optional, className }: { htmlFor?: string; children: ReactNode; optional?: boolean; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cx('flex items-baseline justify-between text-sm font-medium text-fg', className)}>
      <span>{children}</span>
      {optional && <span className="text-xs font-normal text-fg-muted">Optional</span>}
    </label>
  )
}

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-high-fg" role="alert">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden strokeWidth={2} />
      <span>{children}</span>
    </p>
  )
}

export function Hint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-xs text-fg-muted">
      {children}
    </p>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; leading?: ReactNode; trailing?: ReactNode }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, leading, trailing, className, ...rest }, ref) {
  return (
    <div className="relative">
      {leading && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-subtle">{leading}</span>}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(controlBase, controlTone(invalid), 'h-11 md:h-10', leading ? 'pl-10' : 'pl-3', trailing ? 'pr-11' : 'pr-3', className)}
        {...rest}
      />
      {trailing && <span className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</span>}
    </div>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { invalid, className, ...rest },
  ref,
) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={cx(controlBase, controlTone(invalid), 'min-h-28 resize-y px-3 py-2.5', className)} {...rest} />
})

export function Select({ className, invalid, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={cx(controlBase, controlTone(invalid), 'h-11 cursor-pointer appearance-none pr-10 pl-3 md:h-10', className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
    </div>
  )
}

