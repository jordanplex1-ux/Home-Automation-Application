import { useEffect, useRef, useState } from 'react'
import { VideoOff, Loader2 } from 'lucide-react'

interface CameraSnapshotProps {
  cameraId: number
  cameraName: string
  /** How often to pull a fresh snapshot, ms. Default 5s. */
  intervalMs?: number
  className?: string
}

/**
 * Near-live camera view by polling Ring snapshots. Ring battery cameras don't
 * expose a cheap continuous stream, so we refresh a still image on an interval
 * — fast enough to read "who's at the door" without hammering the battery.
 * (True WebRTC live video is a future enhancement.)
 */
export function CameraSnapshot({
  cameraId,
  cameraName,
  intervalMs = 5000,
  className = ''
}: CameraSnapshotProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // Guard against overlapping requests when a snapshot takes longer than the
  // interval (battery cams can be slow to wake).
  const inFlight = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const api = window.electronAPI?.ring
    if (!api) {
      setError('Ring unavailable')
      setLoading(false)
      return
    }

    const pull = async () => {
      if (inFlight.current) return
      inFlight.current = true
      try {
        const res = await api.snapshot(cameraId)
        if (!mounted.current) return
        if (res.ok) {
          setDataUrl(res.dataUrl)
          setError(null)
        } else {
          setError(res.message)
        }
      } catch (err) {
        if (mounted.current) setError((err as Error).message)
      } finally {
        inFlight.current = false
        if (mounted.current) setLoading(false)
      }
    }

    pull()
    const id = window.setInterval(pull, intervalMs)
    return () => {
      mounted.current = false
      window.clearInterval(id)
    }
  }, [cameraId, intervalMs])

  return (
    <div className={`relative overflow-hidden rounded-xl bg-bg-tertiary ${className}`}>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={cameraName}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-disabled">
          {loading ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              <span className="text-xs">Waking camera…</span>
            </>
          ) : (
            <>
              <VideoOff size={24} />
              <span className="text-xs px-3 text-center">{error ?? 'No image'}</span>
            </>
          )}
        </div>
      )}

      {/* Camera label + a faint "live-ish" dot */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
        {dataUrl && <span className="w-1.5 h-1.5 rounded-full bg-accent-danger animate-pulse" />}
        <span className="text-xs font-medium text-white truncate">{cameraName}</span>
      </div>
    </div>
  )
}
