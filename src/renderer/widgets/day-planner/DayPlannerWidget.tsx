import { useState, useCallback, useMemo } from 'react'
import {
  addDays, subDays, addMonths, subMonths,
  format, startOfMonth, endOfMonth
} from 'date-fns'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { useCalendarStore } from '../../stores/useCalendarStore'
import { useGoogleEvents } from '../../hooks/useGoogleEvents'
import type { CalendarEvent } from '../../stores/useCalendarStore'
import { TimelineView } from './components/TimelineView'
import { MonthView } from './components/MonthView'
import { MiniCalendar } from './components/MiniCalendar'
import { AddEventForm } from './components/AddEventForm'
import { TodayEventsList } from './components/TodayEventsList'
import { Modal } from '../../components/ui/Modal'
import type { WidgetProps } from '../types'

type ViewMode = 'day' | 'month'

function getHeaderLabel(date: Date, mode: ViewMode): { primary: string; secondary: string } {
  switch (mode) {
    case 'day':
      return { primary: format(date, 'EEEE'), secondary: format(date, 'd MMMM yyyy') }
    case 'month':
      return { primary: format(date, 'MMMM'), secondary: format(date, 'yyyy') }
  }
}

export function DayPlannerWidget({ config }: WidgetProps) {
  const showMiniCal = config.showMiniCalendar !== false
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [addingEvent, setAddingEvent] = useState<{ hour?: number } | null>(null)
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false)

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const allEvents = useCalendarStore((s) => s.events)
  const recurringEvents = useCalendarStore((s) => s.recurringEvents)
  const addEvent = useCalendarStore((s) => s.addEvent)
  const addRecurringEvent = useCalendarStore((s) => s.addRecurringEvent)
  const removeEvent = useCalendarStore((s) => s.removeEvent)
  const getEventsForDate = useCalendarStore((s) => s.getEventsForDate)

  // Google events for the current scope. Returned in CalendarEvent shape so we
  // can merge them with local events without view changes.
  const { events: googleEvents } = useGoogleEvents({
    date: selectedDate,
    scope: viewMode
  })

  // Multi-day Google events need to be expanded so they show on every day in
  // their span (matching how local multi-day events are handled in
  // useCalendarStore.getEventsForDate).
  const expandGoogleForDate = useCallback(
    (dateStr: string): CalendarEvent[] => {
      const out: CalendarEvent[] = []
      for (const g of googleEvents) {
        if (g.endDate && g.endDate >= g.date) {
          if (dateStr >= g.date && dateStr <= g.endDate) {
            out.push({ ...g, id: `${g.id}_${dateStr}`, date: dateStr })
          }
        } else if (g.date === dateStr) {
          out.push(g)
        }
      }
      return out
    },
    [googleEvents]
  )

  const dayEvents = useMemo(
    () => [...getEventsForDate(dateStr), ...expandGoogleForDate(dateStr)],
    [allEvents, recurringEvents, dateStr, getEventsForDate, expandGoogleForDate]
  )

  // For month view we need events across all days in the month (including holidays + recurring)
  const rangeEvents = useMemo(() => {
    if (viewMode === 'day') return dayEvents
    const ms = startOfMonth(selectedDate)
    const me = endOfMonth(selectedDate)
    const results: CalendarEvent[] = []
    const current = new Date(ms)
    while (current <= me) {
      const ds = format(current, 'yyyy-MM-dd')
      results.push(...getEventsForDate(ds), ...expandGoogleForDate(ds))
      current.setDate(current.getDate() + 1)
    }
    return results
  }, [allEvents, recurringEvents, selectedDate, viewMode, dayEvents, getEventsForDate, expandGoogleForDate])

  const goToPrev = useCallback(() => {
    setSelectedDate((d) => {
      if (viewMode === 'month') return subMonths(d, 1)
      return subDays(d, 1)
    })
  }, [viewMode])

  const goToNext = useCallback(() => {
    setSelectedDate((d) => {
      if (viewMode === 'month') return addMonths(d, 1)
      return addDays(d, 1)
    })
  }, [viewMode])

  const goToToday = useCallback(() => setSelectedDate(new Date()), [])

  const handleTapSlot = useCallback((hour: number) => {
    setAddingEvent({ hour })
  }, [])

  const handleSubmitEvent = useCallback(
    (event: {
      title: string
      startTime: string
      endTime: string
      color: string
      allDay?: boolean
      endDate?: string
      recurringType?: 'yearly' | 'monthly' | 'weekly'
      reminderMinutes?: number | null
    }) => {
      if (event.recurringType) {
        addRecurringEvent({
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          color: event.color,
          allDay: event.allDay,
          date: dateStr,
          recurring: { type: event.recurringType, originalDate: dateStr },
          reminderMinutes: event.reminderMinutes
        })
      } else {
        addEvent({
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          color: event.color,
          allDay: event.allDay,
          endDate: event.endDate,
          date: dateStr,
          reminderMinutes: event.reminderMinutes
        })
      }
      setAddingEvent(null)
    },
    [addEvent, addRecurringEvent, dateStr]
  )

  const switchToDay = useCallback((date: Date) => {
    setSelectedDate(date)
    setViewMode('day')
  }, [])

  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')
  const header = getHeaderLabel(selectedDate, viewMode)

  const VIEW_TABS: { key: ViewMode; label: string }[] = [
    { key: 'day', label: 'Day' },
    { key: 'month', label: 'Month' }
  ]

  return (
    <div className="h-full flex gap-3 overflow-hidden">
      {/* Left sidebar: mini calendar (day view only) */}
      {showMiniCal && viewMode === 'day' && (
        <div className="w-44 shrink-0 flex flex-col gap-3 min-h-0">
          <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          <div className="flex-1 min-h-0 overflow-hidden">
            <TodayEventsList onSelectDate={setSelectedDate} />
          </div>
          <button
            onClick={goToToday}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all touch-manipulation shrink-0 ${
              isToday
                ? 'text-text-disabled cursor-default'
                : 'text-accent-primary hover:bg-accent-primary/10'
            }`}
            disabled={isToday}
          >
            Today
          </button>
        </div>
      )}

      {/* Right: main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header: view toggle + nav */}
        <div className="flex items-center justify-between pb-2 shrink-0 gap-2">
          <button
            onClick={goToPrev}
            className="p-2 rounded-xl hover:bg-bg-hover transition-colors touch-manipulation"
            aria-label="Previous"
          >
            <ChevronLeft size={18} className="text-text-secondary" />
          </button>

          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            {/* Date label */}
            <div className="text-center">
              <p className="text-sm font-semibold text-text-primary">{header.primary}</p>
              <p className="text-xs text-text-secondary">{header.secondary}</p>
            </div>
            {/* View dropdown */}
            <div className="relative">
              <button
                onClick={() => setViewDropdownOpen((o) => !o)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-all touch-manipulation"
              >
                {VIEW_TABS.find((t) => t.key === viewMode)!.label}
                <ChevronDown size={14} className={`transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {viewDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setViewDropdownOpen(false)} />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-bg-secondary border border-border-subtle rounded-xl shadow-glow-md overflow-hidden min-w-[100px]">
                    {VIEW_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => { setViewMode(tab.key); setViewDropdownOpen(false) }}
                        className={`w-full px-4 py-2.5 text-xs font-medium text-left transition-all touch-manipulation ${
                          viewMode === tab.key
                            ? 'bg-accent-primary/15 text-accent-primary'
                            : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={goToNext}
            className="p-2 rounded-xl hover:bg-bg-hover transition-colors touch-manipulation"
            aria-label="Next"
          >
            <ChevronRight size={18} className="text-text-secondary" />
          </button>
        </div>

        {/* View content */}
        {viewMode === 'day' && (
          <TimelineView
            date={selectedDate}
            events={dayEvents}
            onDeleteEvent={removeEvent}
            onTapSlot={handleTapSlot}
          />
        )}
        {viewMode === 'month' && (
          <MonthView
            selectedDate={selectedDate}
            events={rangeEvents}
            onSelectDate={setSelectedDate}
            onSwitchToDay={switchToDay}
            onSwipePrev={goToPrev}
            onSwipeNext={goToNext}
          />
        )}
      </div>

      {/* Add event modal */}
      <Modal
        open={addingEvent !== null}
        onClose={() => setAddingEvent(null)}
        title="New Event"
      >
        {addingEvent && (
          <AddEventForm
            date={format(selectedDate, 'EEEE, d MMMM yyyy')}
            defaultDateISO={dateStr}
            defaultStartTime={
              addingEvent.hour !== undefined
                ? `${addingEvent.hour.toString().padStart(2, '0')}:00`
                : undefined
            }
            onSubmit={handleSubmitEvent}
            onCancel={() => setAddingEvent(null)}
          />
        )}
      </Modal>
    </div>
  )
}
