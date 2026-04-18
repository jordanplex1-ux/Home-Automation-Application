import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useCalendarStore } from '../../../stores/useCalendarStore'

interface MiniCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

export function MiniCalendar({ selectedDate, onSelectDate }: MiniCalendarProps) {
  const [viewMonth, setViewMonth] = useState(selectedDate)
  const events = useCalendarStore((s) => s.events)

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const datesWithEvents = new Set(events.map((e) => e.date))

  return (
    <div className="flex flex-col gap-1">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors touch-manipulation"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} className="text-text-secondary" />
        </button>
        <span className="text-xs font-medium text-text-primary">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors touch-manipulation"
          aria-label="Next month"
        >
          <ChevronRight size={14} className="text-text-secondary" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-[10px] text-text-disabled text-center py-0.5">
            {d}
          </div>
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const inMonth = isSameMonth(day, viewMonth)
          const selected = isSameDay(day, selectedDate)
          const today = isToday(day)
          const hasEvents = datesWithEvents.has(dateStr)

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(day)}
              className={`relative text-[11px] py-1 rounded-lg transition-all touch-manipulation
                ${!inMonth ? 'text-text-disabled/40' : ''}
                ${selected ? 'bg-accent-primary/20 text-accent-primary font-bold' : ''}
                ${today && !selected ? 'text-accent-primary font-semibold' : ''}
                ${inMonth && !selected && !today ? 'text-text-secondary hover:bg-bg-hover' : ''}
              `}
            >
              {format(day, 'd')}
              {hasEvents && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-primary" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
