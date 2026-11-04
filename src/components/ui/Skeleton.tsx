import { cx } from '@/lib/meta'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('resq-skeleton rounded-lg bg-surface-3', className)} />
}
