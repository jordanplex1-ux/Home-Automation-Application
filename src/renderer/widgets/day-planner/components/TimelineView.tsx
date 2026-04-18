import { useRef, useEffect } from 'react'
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

        {/* Events */}
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onDelete={onDeleteEvent}
            hourHeight={HOUR_HEIGHT}
          />
        ))}
      </div>
    </div>
  )
}
