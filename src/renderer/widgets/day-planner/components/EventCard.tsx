import { Trash2 } from 'lucide-react'
import type { CalendarEvent } from '../../../stores/useCalendarStore'

interface EventCardProps {
  event: CalendarEvent
  onDelete: (id: string) => void
  hourHeight: number
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function EventCard({ event, onDelete, hourHeight }: EventCardProps) {
  const startMin = timeToMinutes(event.startTime)
  const endMin = timeToMinutes(event.endTime)
  const durationMin = Math.max(endMin - startMin, 15)

  const top = (startMin / 60) * hourHeight
  const height = Math.max((durationMin / 60) * hourHeight - 2, 28)

  return (
    <div
      className="absolute left-16 right-2 rounded-xl px-3 py-1.5 overflow-hidden group transition-all duration-200 hover:brightness-110 touch-manipulation"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: `${event.color}22`,
        borderLeft: `3px solid ${event.color}`
      }}
    >
      <div className="flex items-start justify-between gap-1 h-full">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary truncate">{event.title}</p>
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
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(event.id) }}
          className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-lg hover:bg-accent-danger/20 transition-opacity touch-manipulation"
          aria-label="Delete event"
        >
          <Trash2 size={14} className="text-accent-danger" />
        </button>
      </div>
    </div>
  )
}
