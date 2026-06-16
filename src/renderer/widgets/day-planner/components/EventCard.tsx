import { Trash2, Cloud } from 'lucide-react'
import type { CalendarEvent } from '../../../stores/useCalendarStore'

interface EventCardProps {
  event: CalendarEvent
  onDelete: (id: string) => void
  hourHeight: number
  /** Column index within an overlap cluster (0-based). */
  col?: number
  /** Total columns in this event's overlap cluster. */
  cols?: number
}

// Track geometry — must match TimelineView: 64px hour-label gutter on the
// left, 8px padding on the right.
const GUTTER = 64
const RIGHT_PAD = 8
const COL_GAP = 4

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function EventCard({ event, onDelete, hourHeight, col = 0, cols = 1 }: EventCardProps) {
  const startMin = timeToMinutes(event.startTime)
  const endMin = timeToMinutes(event.endTime)
  const durationMin = Math.max(endMin - startMin, 15)

  const top = (startMin / 60) * hourHeight
  const height = Math.max((durationMin / 60) * hourHeight - 2, 28)

  // Split overlapping events into side-by-side columns. The track spans from
  // GUTTER to (100% - RIGHT_PAD); each of `cols` columns gets an equal slice.
  const track = `(100% - ${GUTTER + RIGHT_PAD}px)`
  const left = `calc(${GUTTER}px + ${col} * ${track} / ${cols})`
  const width = `calc(${track} / ${cols} - ${cols > 1 ? COL_GAP : 0}px)`

  // Google Calendar events are read-only here — they're sourced from the
  // user's actual Google account. We hide the delete button on them to avoid
  // implying we can write back; managing them happens in Google Calendar.
  const isGoogle = event.id.startsWith('gcal:')

  return (
    <div
      className="absolute rounded-xl px-3 py-1.5 overflow-hidden group transition-all duration-200 hover:brightness-110 touch-manipulation"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left,
        width,
        backgroundColor: `${event.color}22`,
        borderLeft: `3px solid ${event.color}`
      }}
    >
      <div className="flex items-start justify-between gap-1 h-full">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary truncate flex items-center gap-1">
            {isGoogle && (
              <Cloud size={11} className="shrink-0 text-text-disabled" aria-label="From Google Calendar" />
            )}
            <span className="truncate">{event.title}</span>
          </p>
          {height > 40 && (
            <p className="text-xs text-text-secondary mt-0.5">
              {event.allDay || event.isHoliday
                ? 'All day'
                : `${event.startTime} – ${event.endTime}`}
              {event.endDate && event.endDate > event.date && (
                <span className="text-text-disabled"> · until {event.endDate}</span>
              )}
            </p>
          )}
        </div>
        {!isGoogle && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(event.id) }}
            className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-lg hover:bg-accent-danger/20 transition-opacity touch-manipulation"
            aria-label="Delete event"
          >
            <Trash2 size={14} className="text-accent-danger" />
          </button>
        )}
      </div>
    </div>
  )
}
