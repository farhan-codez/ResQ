import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { cx } from '@/lib/meta'

type Tone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  title: string
  description?: string
  tone: Tone
  action?: { label: string; onClick: () => void }
}

const ToastCtx = createContext<(t: Omit<ToastItem, 'id'>) => void>(() => {})

export function useToast() {
  return useContext(ToastCtx)
}

const toneIcon = {
  success: <CircleCheck className="size-5 text-resolved-fg" strokeWidth={2} aria-hidden />,
  error: <CircleAlert className="size-5 text-high-fg" strokeWidth={2} aria-hidden />,
  info: <Info className="size-5 text-investigating-fg" strokeWidth={2} aria-hidden />,
}

export function ToastView({ item, onClose, className }: { item: Omit<ToastItem, 'id'>; onClose?: () => void; className?: string }) {
  return (
    <div className={cx('pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-overlay', className)}>
      <span className="mt-px">{toneIcon[item.tone]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{item.title}</p>
        {item.description && <p className="mt-0.5 text-sm text-fg-muted">{item.description}</p>}
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action!.onClick()
              onClose?.()
            }}
            className="mt-2 cursor-pointer text-sm font-medium text-brand-soft-fg underline-offset-4 hover:underline"
          >
            {item.action.label}
          </button>
        )}
      </div>
      <button type="button" onClick={onClose} aria-label="Dismiss notification" className="-m-1.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const remove = useCallback((id: number) => setItems((p) => p.filter((t) => t.id !== id)), [])
  const push = useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = Date.now() + Math.random()
      setItems((p) => [...p.slice(-2), { ...t, id }])
      window.setTimeout(() => remove(id), 6500)
    },
    [remove],
  )
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-4 top-16 z-[1200] flex flex-col items-center gap-2 md:inset-x-auto md:top-auto md:right-6 md:bottom-24 md:items-end">
        {items.map((t) => (
          <ToastView key={t.id} item={t} onClose={() => remove(t.id)} className="animate-toast" />
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
