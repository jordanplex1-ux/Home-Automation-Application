import { useMemo, useRef } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay
} from 'date-fns'
import type { CalendarEvent } from '../../../stores/useCalendarStore'

interface MonthViewProps {
  selectedDate: Date
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
  onSwitchToDay: (date: Date) => void
  onSwipePrev?: () => void
  onSwipeNext?: () => void
}

const SWIPE_THRESHOLD = 60   // px
const SWIPE_MAX_TIME = 600   // ms

export function MonthView({ selectedDate, events, onSelectDate, onSwitchToDay, onSwipePrev, onSwipeNext }: MonthViewProps) {
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    const dt = Date.now() - start.t
    if (dt > SWIPE_MAX_TIME) return
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    if (Math.abs(dx) < Math.abs(dy)) return // ignore vertical scrolls
    if (dx > 0) onSwipePrev?.()
    else onSwipeNext?.()
  }

  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const evt of events) {
      const existing = map.get(evt.date) || []
      existing.push(evt)
      map.set(evt.date, existing)
    }
    // Sort each day's events by start time ascending
    for (const [key, dayEvts] of map) {
      map.set(key, dayEvts.sort((a, b) => a.startTime.localeCompare(b.startTime)))
    }
    return map
  }, [events])

  return (
    <div
      className="h-full flex flex-col gap-1 overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 shrink-0">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-[10px] text-text-disabled text-center py-1 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1 flex-1 min-h-0 auto-rows-fr">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDate.get(dateStr) || []
          const inMonth = isSameMonth(day, selectedDate)
          const today = isToday(day)
          const selected = isSameDay(day, selectedDate)

          // Visual priority: today gets a glowing accent ring so it stands
          // out at a glance; selection (a tap) layers a fill on top. A cell
          // can be both today and selected.
          const cellClasses = today
            ? 'bg-accent-primary/15 ring-2 ring-accent-primary shadow-glow-md'
            : selected
            ? 'bg-accent-primary/10 ring-1 ring-accent-primary/40'
            : 'hover:bg-bg-hover'

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(day)}
              onDoubleClick={() => onSwitchToDay(day)}
              // Padding is set inline rather than via a Tailwind class: the
              // global `* { padding: 0 }` reset in globals.css overrides utility
              // padding here, which previously left the day number flush in the
              // corner where the rounded edge clipped it. Inline styles win.
              style={{ padding: '8px' }}
              className={`flex flex-col rounded-lg transition-all touch-manipulation overflow-hidden min-h-0
                ${!inMonth ? 'opacity-30' : ''}
                ${cellClasses}
              `}
            >
              {/* Day number — today shown as a filled accent chip. The extra
                  inline inset keeps the digit clear of the 8px rounded corner. */}
              <div className="flex justify-end shrink-0" style={{ paddingRight: '3px', paddingTop: '2px' }}>
                <span className={`text-xs leading-none ${
                  today
                    ? 'flex items-center justify-center w-5 h-5 rounded-full bg-accent-primary text-bg-primary font-bold shadow-glow-sm'
                    : 'text-text-secondary'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* Event dots / compact list */}
              <div className="flex-1 flex flex-col gap-px overflow-hidden min-h-0 mt-0.5">
                {dayEvents.slice(0, 3).map((evt) => (
                  <div
                    key={evt.id}
                    className="rounded px-0.5 min-w-0"
                    style={{ backgroundColor: `${evt.color}15` }}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className="w-1 h-1 rounded-full shrink-0"
                        style={{ backgroundColor: evt.color }}
                      />
                      <span className="text-[9px] text-text-primary truncate leading-tight">
                        {evt.title}
                      </span>
                    </div>
                    <p className="text-[8px] text-text-disabled pl-2 leading-tight">{evt.startTime} – {evt.endTime}</p>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[8px] text-text-disabled text-center">
                    +{dayEvents.length - 3}
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
