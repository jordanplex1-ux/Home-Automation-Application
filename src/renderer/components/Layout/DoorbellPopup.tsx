import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Footprints, X } from 'lucide-react'
import { CameraSnapshot } from '../Screens/homeAutomation/CameraSnapshot'

export interface CameraAlert {
  id: number
  name: string
  kind: 'ding' | 'motion'
}

interface DoorbellPopupProps {
  alert: CameraAlert | null
  onClose: () => void
}

// Auto-dismiss after this long so the wall returns to normal on its own if
// nobody interacts.
const AUTO_DISMISS_MS = 90_000

/**
 * Full-screen takeover shown when the Ring doorbell is pressed (or motion is
 * detected, if enabled). Rendered via a portal at the highest z-index so it
 * appears over every screen, modal, and even the dim overlay.
 */
export function DoorbellPopup({ alert, onClose }: DoorbellPopupProps) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DISMISS_MS / 1000)

  useEffect(() => {
    if (!alert) return
    setSecondsLeft(AUTO_DISMISS_MS / 1000)
    const tick = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    const dismiss = window.setTimeout(onClose, AUTO_DISMISS_MS)
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(dismiss)
    }
  }, [alert, onClose])

  if (!alert) return null

  const isDing = alert.kind === 'ding'
  const Icon = isDing ? Bell : Footprints
  const title = isDing ? "Someone's at the door" : 'Motion detected'
  // Full static class strings — Tailwind can't see interpolated class names.
  const badgeClass = isDing
    ? 'bg-accent-danger/20 border-accent-danger/40'
    : 'bg-accent-warning/20 border-accent-warning/40'
  const iconClass = isDing ? 'text-accent-danger' : 'text-accent-warning'

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-black/95 flex flex-col items-center justify-center anim-fade p-6">
      {/* Banner */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex items-center justify-center w-12 h-12 rounded-full border ${badgeClass}`}>
          <Icon size={24} className={`${iconClass} animate-pulse`} />
        </div>
        <div>
          <p className="text-xl font-medium text-white">{title}</p>
          <p className="text-sm text-white/60">{alert.name}</p>
        </div>
      </div>

      {/* Live-ish feed — fast snapshot polling */}
      <div className="w-full max-w-3xl aspect-video">
        <CameraSnapshot
          cameraId={alert.id}
          cameraName={alert.name}
          intervalMs={3000}
          className="w-full h-full"
        />
      </div>

      {/* Dismiss */}
      <button
        onClick={onClose}
        className="mt-6 flex items-center gap-2 px-6 py-3 rounded-2xl bg-bg-secondary border border-border-subtle text-text-primary hover:bg-bg-hover transition-colors touch-manipulation active:scale-95"
      >
        <X size={18} />
        Dismiss
        <span className="text-text-disabled tabular-nums text-sm">({secondsLeft}s)</span>
      </button>
    </div>,
    document.body
  )
}
