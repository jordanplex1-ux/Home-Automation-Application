import { useLayoutEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Newspaper } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'
import type { WidgetProps } from '../types'

export type TickerSpeed = 'very-slow' | 'slow' | 'medium' | 'fast'

// Pixels-per-second for each speed. The duration is computed from the
// actual rendered strip width at runtime so adding or removing sources
// doesn't change the apparent reading speed — a headline always passes
// a fixed point on screen at the same rate.
const SPEED_PX_PER_SEC: Record<TickerSpeed, number> = {
  'very-slow': 25,
  slow:        45,
  medium:      80,
  fast:       130
}

export function NewsWidget({ config }: WidgetProps) {
  const sources = (config.sources as string[] | undefined) ?? ['bbc', 'guardian', 'sky', 'gbnews']
  const speed = (config.speed as TickerSpeed) ?? 'medium'

  const query = useQuery({
    queryKey: ['news', ...sources.slice().sort()],
    queryFn: async () => {
      if (!window.electronAPI?.news) return []
      return window.electronAPI.news.fetch(sources)
    },
    refetchInterval: 15 * 60 * 1000,
    staleTime: 10 * 60 * 1000
  })

  if (query.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="h-full flex items-center justify-center gap-2 text-text-secondary">
        <AlertCircle size={16} className="text-accent-danger" />
        <span className="text-xs">Failed to load news</span>
      </div>
    )
  }

  const items = query.data ?? []

  if (items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center gap-2 text-text-disabled">
        <Newspaper size={16} />
        <span className="text-xs">No headlines available</span>
      </div>
    )
  }

  return <Ticker items={items} speed={speed} />
}

// ---------- Ticker (split out so hooks can run after data is ready) ----------

interface TickerProps {
  items: NewsHeadline[]
  speed: TickerSpeed
}

function Ticker({ items, speed }: TickerProps) {
  const stripRef = useRef<HTMLDivElement>(null)
  // Duration is recomputed whenever items change or the strip is measured.
  // Default of 60s prevents a visible "jump" on first paint before the
  // ResizeObserver has reported dimensions.
  const [durationSec, setDurationSec] = useState(60)

  // Measure the rendered width of a single copy of the list. The strip
  // contains two copies; we only want the width of one, which is scrollWidth/2.
  useLayoutEffect(() => {
    const el = stripRef.current
    if (!el) return

    const pxPerSec = SPEED_PX_PER_SEC[speed]

    const measure = () => {
      // scrollWidth covers the full two-copy strip; halve it to get one loop
      const singleCopyWidth = el.scrollWidth / 2
      if (singleCopyWidth > 0) {
        // Clamp to sensible bounds so an absurdly long/short strip never
        // produces a wildly slow or fast animation
        const secs = Math.min(600, Math.max(20, singleCopyWidth / pxPerSec))
        setDurationSec(secs)
      }
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [items, speed])

  const loopItems = [...items, ...items]

  return (
    <div className="h-full flex items-center overflow-hidden relative">
      {/* Edge fade masks so items don't pop in at the boundaries */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-bg-secondary to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-bg-secondary to-transparent" />

      {/* "LIVE" pill on the left */}
      <div className="shrink-0 z-20 flex items-center gap-1.5 px-2 py-1 mr-3 rounded-md bg-accent-danger/15 border border-accent-danger/30">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-danger animate-pulse" />
        <span className="text-[10px] font-semibold text-accent-danger uppercase tracking-wider">
          Live
        </span>
      </div>

      <div
        ref={stripRef}
        className="flex gap-8 whitespace-nowrap anim-ticker will-change-transform"
        style={{
          width: 'max-content',
          ['--ticker-duration' as string]: `${durationSec}s`
        }}
      >
        {loopItems.map((item, idx) => (
          <div key={`${item.link || item.title}-${idx}`} className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-accent-primary uppercase tracking-wider">
              {item.source}
            </span>
            <span className="text-text-disabled">·</span>
            <span className="text-sm text-text-primary">{item.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
