import { useEffect, useRef, useState } from 'react'
import { useAppSettingsStore } from '../../stores/useAppSettingsStore'

interface DimOverlayProps {
  active: boolean
  onWake: () => void
}

/**
 * When dimmed, either shows a very faint drifting clock OR a photo slideshow,
 * depending on the photo frame settings. Tap anywhere to wake.
 */
export function DimOverlay({ active, onWake }: DimOverlayProps) {
  const photoFrameEnabled = useAppSettingsStore((s) => s.photoFrameEnabled)
  const photoFrameFolder = useAppSettingsStore((s) => s.photoFrameFolder)

  const photosReady =
    active && photoFrameEnabled && !!photoFrameFolder && !!window.electronAPI?.photos

  if (!active) return null

  return photosReady ? (
    <PhotoFrameOverlay folder={photoFrameFolder!} onWake={onWake} />
  ) : (
    <DriftingClockOverlay onWake={onWake} />
  )
}

// ---------- Drifting clock (original behaviour) ----------

function DriftingClockOverlay({ onWake }: { onWake: () => void }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20000)
    return () => window.clearInterval(id)
  }, [])

  const hh = now.getHours().toString().padStart(2, '0')
  const mm = now.getMinutes().toString().padStart(2, '0')

  return (
    <div
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center anim-fade cursor-pointer select-none touch-none"
      onClick={onWake}
      onTouchStart={onWake}
    >
      <div className="anim-drift flex flex-col items-center gap-2 pointer-events-none">
        <p className="text-white/25 text-[10vw] leading-none font-extralight tabular-nums tracking-wider">
          {hh}:{mm}
        </p>
        <p className="text-white/10 text-xs uppercase tracking-[0.3em]">Tap to wake</p>
      </div>
    </div>
  )
}

// ---------- Photo frame slideshow ----------

function PhotoFrameOverlay({ folder, onWake }: { folder: string; onWake: () => void }) {
  const intervalSec = useAppSettingsStore((s) => s.photoFrameIntervalSec)
  const [paths, setPaths] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const mountedRef = useRef(true)

  // Load the directory listing once on mount / when folder changes
  useEffect(() => {
    mountedRef.current = true
    let cancelled = false
    window.electronAPI.photos.list(folder).then((list) => {
      if (cancelled) return
      // Shuffle so consecutive dim cycles don't always start with the same image
      const shuffled = [...list].sort(() => Math.random() - 0.5)
      setPaths(shuffled)
      setIndex(0)
    })
    return () => {
      cancelled = true
      mountedRef.current = false
    }
  }, [folder])

  // Advance the index every intervalSec while the overlay is visible
  useEffect(() => {
    if (paths.length === 0) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % paths.length)
    }, Math.max(5, intervalSec) * 1000)
    return () => window.clearInterval(id)
  }, [paths.length, intervalSec])

  // Load the current image as a data URL
  useEffect(() => {
    if (paths.length === 0) {
      setCurrentUrl(null)
      return
    }
    let cancelled = false
    window.electronAPI.photos.read(paths[index]).then((url) => {
      if (!cancelled) setCurrentUrl(url)
    })
    return () => { cancelled = true }
  }, [paths, index])

  // Tick the overlay clock each minute
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20000)
    return () => window.clearInterval(id)
  }, [])

  const hh = now.getHours().toString().padStart(2, '0')
  const mm = now.getMinutes().toString().padStart(2, '0')

  return (
    <div
      className="fixed inset-0 z-[60] bg-black anim-fade cursor-pointer select-none touch-none overflow-hidden"
      onClick={onWake}
      onTouchStart={onWake}
    >
      {currentUrl ? (
        <img
          key={paths[index]}
          src={currentUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain anim-fade pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white/30 text-xs uppercase tracking-[0.3em]">
            {paths.length === 0 ? 'No photos in folder' : 'Loading…'}
          </p>
        </div>
      )}

      {/* Clock pill, bottom-right corner for a frame-like feel.
          Wrapped in anim-drift so its position slowly shifts to avoid burn-in. */}
      <div className="absolute bottom-6 right-6 pointer-events-none">
        <div className="anim-drift flex flex-col items-end gap-1 px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-md">
          <p className="text-white/80 text-4xl leading-none font-light tabular-nums tracking-wider">
            {hh}:{mm}
          </p>
          <p className="text-white/40 text-[10px] uppercase tracking-[0.3em]">Tap to wake</p>
        </div>
      </div>
    </div>
  )
}
