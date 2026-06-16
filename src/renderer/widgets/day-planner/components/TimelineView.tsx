import { useRef, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { EventCard } from './EventCard'
import type { CalendarEvent } from '../../../stores/useCalendarStore'

interface TimelineViewProps {
  date: Date
  events: CalendarEvent[]
  onDeleteEvent: (id: string) => void
  onTapSlot: (hour: number) => void
}

const HOUR_HEIGHT = 64
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/**
 * Lay out events into side-by-side columns so overlapping events don't stack
 * on top of each other. Events are grouped into clusters of transitive
 * overlap; within a cluster each event takes the first free column, and every
 * event in the cluster is sized to 1/(cluster column count). Returns a map of
 * event id → { col, cols }.
 */
function computeColumns(events: CalendarEvent[]): Map<string, { col: number; cols: number }> {
  const map = new Map<string, { col: number; cols: number }>()
  const sorted = events.slice().sort((a, b) => {
    const sa = timeToMin(a.startTime)
    const sb = timeToMin(b.startTime)
    return sa - sb || timeToMin(a.endTime) - timeToMin(b.endTime)
  })

  let columns: number[] = [] // end-minute of the last event placed in each column
  let cluster: { id: string; col: number }[] = []
  let clusterEnd = -1

  const flush = () => {
    const n = columns.length || 1
    for (const c of cluster) map.set(c.id, { col: c.col, cols: n })
    columns = []
    cluster = []
    clusterEnd = -1
  }

  for (const e of sorted) {
    const start = timeToMin(e.startTime)
    const end = Math.max(timeToMin(e.endTime), start + 15)
    // A new event that starts at/after everything so far in the cluster begins
    // a fresh cluster.
    if (cluster.length && start >= clusterEnd) flush()
    let placed = columns.findIndex((colEnd) => colEnd <= start)
    if (placed === -1) {
      placed = columns.length
      columns.push(end)
    } else {
      columns[placed] = end
    }
    cluster.push({ id: e.id, col: placed })
    clusterEnd = Math.max(clusterEnd, end)
  }
  flush()
  return map
}

export function TimelineView({ date, events, onDeleteEvent, onTapSlot }: TimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to current hour on mount or date change
  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    scrollRef.current?.scrollTo({ top: Math.max(0, hour * HOUR_HEIGHT - 60), behavior: 'smooth' })
  }, [format(date, 'yyyy-MM-dd')])

  const nowHour = new Date().getHours()
  const nowMin = new Date().getMinutes()
  const nowOffset = (nowHour * 60 + nowMin) / 60 * HOUR_HEIGHT

  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  const columns = useMemo(() => computeColumns(events), [events])

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto relative" style={{ scrollbarWidth: 'none' }}>
      <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
        {/* Hour lines */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-t border-border-subtle/50 cursor-pointer touch-manipulation"
            style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
            onClick={() => onTapSlot(hour)}
          >
            <span className="absolute left-2 top-1 text-[11px] text-text-disabled font-mono select-none">
              {hour.toString().padStart(2, '0')}:00
            </span>
          </div>
        ))}

        {/* Current time indicator */}
        {isToday && (
          <div
            className="absolute left-12 right-0 z-10 pointer-events-none"
            style={{ top: `${nowOffset}px` }}
          >
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-accent-danger shrink-0 -ml-1" />
              <div className="flex-1 h-[2px] bg-accent-danger" />
            </div>
          </div>
        )}

        {/* Events — split into columns when they overlap */}
        {events.map((event) => {
          const layout = columns.get(event.id) ?? { col: 0, cols: 1 }
          return (
            <EventCard
              key={event.id}
              event={event}
              onDelete={onDeleteEvent}
              hourHeight={HOUR_HEIGHT}
              col={layout.col}
              cols={layout.cols}
            />
          )
        })}
      </div>
    </div>
  )
}
