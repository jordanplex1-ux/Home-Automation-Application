import { useMemo } from 'react'
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay
} from 'date-fns'
import type { CalendarEvent } from '../../../stores/useCalendarStore'

interface WeekViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
  onSwitchToDay: (date: Date) => void
}

export function WeekView({ selectedDate, events, onSelectDate, onSwitchToDay }: WeekViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const evt of events) {
      const existing = map.get(evt.date) || []
      existing.push(evt)
      map.set(evt.date, existing)
    }
    return map
  }, [events])

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="grid grid-cols-7 gap-2 flex-1 min-h-0">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDate.get(dateStr) || []
          const today = isToday(day)
          const selected = isSameDay(day, selectedDate)

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(day)}
              onDoubleClick={() => onSwitchToDay(day)}
              className={`flex flex-col rounded-xl border p-2 transition-all touch-manipulation overflow-hidden
                ${selected ? 'border-accent-primary/50 bg-accent-primary/5' : 'border-border-subtle/50 bg-bg-tertiary/30'}
                ${today ? 'ring-1 ring-accent-primary/30' : ''}
                hover:bg-bg-hover
              `}
            >
              {/* Day header */}
              <div className="text-center shrink-0 mb-1.5">
                <p className="text-[10px] text-text-disabled uppercase">{format(day, 'EEE')}</p>
                <p className={`text-lg font-semibold ${today ? 'text-accent-primary' : 'text-text-primary'}`}>
                  {format(day, 'd')}
                </p>
              </div>

              {/* Events list */}
              <div className="flex-1 flex flex-col gap-0.5 overflow-hidden min-h-0">
                {dayEvents.slice(0, 4).map((evt) => (
                  <div
                    key={evt.id}
                    className="px-1 py-0.5 rounded text-left min-w-0"
                    style={{ backgroundColor: `${evt.color}15` }}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: evt.color }}
                      />
                      <span className="text-[10px] text-text-primary truncate">{evt.title}</span>
                    </div>
                    <p className="text-[9px] text-text-disabled pl-3">{evt.startTime} – {evt.endTime}</p>
                  </div>
                ))}
                {dayEvents.length > 4 && (
                  <p className="text-[9px] text-text-disabled text-center">
                    +{dayEvents.length - 4} more
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
