import { useEffect, useState } from 'react'
import { Download, RotateCw, X } from 'lucide-react'

// Banner that sits above the footer / at the top of the shell when an
// update is available or has been downloaded.
export function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const api = window.electronAPI?.updater
    if (!api?.onStatus) return
    const off = api.onStatus((s) => {
      setStatus(s)
      // Reset dismissal when a new update appears
      if (s.kind === 'available' || s.kind === 'downloaded') setDismissed(false)
    })
    return off
  }, [])

  if (!status || dismissed) return null

  // Only surface visibly for "downloading" / "downloaded" states.
  // Silently checking/not-available/error shouldn't annoy a kiosk.
  if (status.kind === 'checking' || status.kind === 'not-available' || status.kind === 'error' || status.kind === 'available') {
    return null
  }

  const isReady = status.kind === 'downloaded'

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 anim-slide-up">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-bg-secondary/95 backdrop-blur border border-accent-primary/40 shadow-glow-md">
        {isReady ? (
          <RotateCw size={16} className="text-accent-primary" />
        ) : (
          <Download size={16} className="text-accent-primary animate-pulse" />
        )}
        <div className="text-xs text-text-primary">
          {isReady ? (
            <>Update <span className="font-semibold">v{status.version}</span> ready</>
          ) : (
            <>Downloading update… {Math.round(status.percent)}%</>
          )}
        </div>
        {isReady && (
          <button
            onClick={() => window.electronAPI?.updater?.installNow()}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 transition-colors touch-manipulation"
          >
            Restart &amp; install
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg text-text-disabled hover:text-text-primary hover:bg-bg-hover transition-colors touch-manipulation"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
