import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useToastStore, type ToastVariant } from '../../stores/useToastStore'

const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info
}

const COLORS: Record<ToastVariant, string> = {
  success: 'text-accent-success border-accent-success/40',
  error: 'text-accent-danger border-accent-danger/40',
  info: 'text-accent-primary border-accent-primary/40'
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant]
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl bg-bg-secondary/95 backdrop-blur-md border ${COLORS[t.variant]} shadow-lg anim-slide-in-right min-w-[240px]`}
          >
            <Icon size={18} className="shrink-0" />
            <span className="text-sm text-text-primary flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="text-text-disabled hover:text-text-secondary transition-colors touch-manipulation"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
