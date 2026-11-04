import { useRef, type KeyboardEvent } from 'react'
import { SEVERITY, SEVERITY_ORDER, cx } from '../../lib/meta'
import type { Severity } from '../../lib/types'

const selectedTone: Record<Severity, string> = {
  low: 'border-low bg-low-soft text-low-fg',
  medium: 'border-medium bg-medium-soft text-medium-fg',
  high: 'border-high bg-high-soft text-high-fg',
}

export function SeverityPicker({
  value,
  onChange,
  onBlur,
  invalid,
  labelledBy,
  describedBy,
  id,
}: {
  value: Severity | null
  onChange: (s: Severity) => void
  onBlur?: () => void
  invalid?: boolean
  labelledBy: string
  describedBy?: string
  id?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = (i + dir + 3) % 3
    onChange(SEVERITY_ORDER[next])
    refs.current[next]?.focus()
  }
  return (
    <div
      id={id}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className="grid grid-cols-3 gap-2"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onBlur?.()
      }}
    >
      {SEVERITY_ORDER.map((s, i) => {
        const { icon: Icon, label } = SEVERITY[s]
        const checked = value === s
        const tabbable = value ? checked : i === 0
        return (
          <button
            key={s}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => onChange(s)}
            onKeyDown={(e) => onKey(e, i)}
            className={cx(
              'flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border text-sm font-medium transition-colors',
              checked ? selectedTone[s] : cx('bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg', invalid ? 'border-high' : 'border-border-strong'),
            )}
          >
            <Icon className="size-5" strokeWidth={2} aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}

