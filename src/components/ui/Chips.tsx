import { SEVERITY, STATUS, cx } from '../../lib/meta'
import type { Severity, Status } from '../../lib/types'

const sevTone: Record<Severity, string> = {
  low: 'bg-low-soft text-low-fg',
  medium: 'bg-medium-soft text-medium-fg',
  high: 'bg-high-soft text-high-fg',
}
const statusTone: Record<Status, string> = {
  pending: 'bg-pending-soft text-pending-fg',
  investigating: 'bg-investigating-soft text-investigating-fg',
  resolved: 'bg-resolved-soft text-resolved-fg',
}

const chipBase = 'inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium whitespace-nowrap'

export function SeverityChip({ severity, className }: { severity: Severity; className?: string }) {
  const { icon: Icon, label } = SEVERITY[severity]
  return (
    <span className={cx(chipBase, sevTone[severity], className)}>
      <Icon className="size-3.5" strokeWidth={2} aria-hidden />
      <span>
        <span className="sr-only">Severity: </span>
        {label}
      </span>
    </span>
  )
}

export function StatusChip({ status, className }: { status: Status; className?: string }) {
  const { icon: Icon, label } = STATUS[status]
  return (
    <span className={cx(chipBase, statusTone[status], className)}>
      <Icon className="size-3.5" strokeWidth={2} aria-hidden />
      <span>
        <span className="sr-only">Status: </span>
        {label}
      </span>
    </span>
  )
}

