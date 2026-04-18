import { format } from 'date-fns'
import { useCalendarStore } from '../../../stores/useCalendarStore'

interface TodayEventsListProps {
  onSelectDate?: (date: Date) => void
}

export function TodayEventsList({ onSelectDate }: TodayEventsListProps) {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const getEventsForDate = useCalendarStore((s) => s.getEventsForDate)
  // Subscribe so list updates when store changes
  const events = useCalendarStore((s) => s.events)
  const recurring = useCalendarStore((s) => s.recurringEvents)
  void events; void recurring

  const todayEvents = getEventsForDate(todayStr).sort((a, b) => {
    // All-day / holidays first
    const aAll = a.allDay || a.isHoliday ? 0 : 1
    const bAll = b.allDay || b.isHoliday ? 0 : 1
    if (aAll !== bAll) return aAll - bAll
    return a.startTime.localeCompare(b.startTime)
  })

  return (
    <div className="flex flex-col gap-1 min-h-0 overflow-hidden">
      <p className="text-[10px] text-text-disabled uppercase tracking-wider px-1">Today</p>
      {todayEvents.length === 0 ? (
        <p className="text-[11px] text-text-disabled italic px-1 py-1">No events</p>
      ) : (
        <div
          className="flex flex-col gap-1 overflow-y-auto pr-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {todayEvents.map((evt) => {
            const label = evt.allDay || evt.isHoliday
              ? 'All day'
              : `${evt.startTime}`
            return (
              <button
                key={evt.id}
                onClick={() => onSelectDate?.(new Date())}
                className="text-left rounded-lg px-2 py-1.5 transition-all touch-manipulation hover:bg-bg-hover min-w-0"
                style={{
                  backgroundColor: `${evt.color}15`,
                  borderLeft: `2px solid ${evt.color}`
                }}
              >
                <p className="text-[11px] font-medium text-text-primary truncate">{evt.title}</p>
                <p className="text-[10px] text-text-disabled">{label}</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
