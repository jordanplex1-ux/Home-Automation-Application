import { Bell, X } from 'lucide-react'
import { useRemindersStore } from '../../stores/useRemindersStore'
import { describeReminder } from '../../hooks/useReminderScanner'

/**
 * Stacks all currently-active reminder banners at the top-centre of the
 * screen. Each is dismissible and self-removes from the active list.
 */
export function ReminderBanner() {
  const active = useRemindersStore((s) => s.active)
  const dismiss = useRemindersStore((s) => s.dismiss)

  if (active.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[65] flex flex-col gap-2 pointer-events-none">
      {active.map((r) => (
        <div
          key={r.id}
          className="pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2.5 rounded-2xl bg-bg-secondary/95 border border-accent-primary/40 shadow-glow-md backdrop-blur-md min-w-[320px] max-w-[480px] anim-slide-up"
          style={{ borderLeftColor: r.color, borderLeftWidth: '4px' }}
        >
          <Bell size={16} className="shrink-0 text-accent-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{r.title}</p>
            <p className="text-[11px] text-text-secondary truncate">{describeReminder(r)}</p>
          </div>
          <button
            onClick={() => dismiss(r.id)}
            aria-label="Dismiss reminder"
            className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-text-disabled hover:bg-bg-hover hover:text-text-primary transition-colors touch-manipulation"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
