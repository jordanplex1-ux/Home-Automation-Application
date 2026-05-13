import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { electronStorage } from '../hooks/useElectronStore'
import { getUKBankHolidays, getUKMajorHolidays } from './uk-holidays'

export interface CalendarEvent {
  id: string
  title: string
  date: string        // ISO date string YYYY-MM-DD (start date)
  endDate?: string    // ISO date string YYYY-MM-DD — for multi-day events (inclusive); omit or equal date for single day
  startTime: string   // HH:mm
  endTime: string     // HH:mm
  color: string
  notes?: string
  isHoliday?: boolean
  allDay?: boolean
  recurring?: RecurringRule
  /**
   * Minutes before the event's start time to fire a reminder. Omit/null = no
   * reminder. 0 = fires at the exact start time. Reminders are best-effort —
   * they only fire while the app is running.
   */
  reminderMinutes?: number | null
}

export interface RecurringRule {
  type: 'yearly' | 'monthly' | 'weekly'
  originalDate: string // the date the recurrence was first created for
}

interface CalendarState {
  events: CalendarEvent[]
  recurringEvents: CalendarEvent[]
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void
  addRecurringEvent: (event: Omit<CalendarEvent, 'id' | 'recurring'> & { recurring: RecurringRule }) => void
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void
  removeEvent: (id: string) => void
  removeRecurringEvent: (id: string) => void
  getEventsForDate: (date: string) => CalendarEvent[]
}

let counter = 0
function generateId(): string {
  return `evt_${Date.now()}_${counter++}`
}

export const EVENT_COLORS = [
  '#00d4ff', // cyan
  '#7c3aed', // purple
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // teal
  '#8b5cf6', // violet
]

const HOLIDAY_COLOR = '#f59e0b'
const MAJOR_HOLIDAY_COLOR = '#8b5cf6'

function generateHolidayEvents(year: number): CalendarEvent[] {
  const bankHolidays = getUKBankHolidays(year).map((h) => ({
    id: `holiday_bank_${h.date}`,
    title: h.name,
    date: h.date,
    startTime: '00:00',
    endTime: '23:59',
    color: HOLIDAY_COLOR,
    isHoliday: true
  }))

  const majorHolidays = getUKMajorHolidays(year).map((h) => ({
    id: `holiday_major_${h.date}`,
    title: h.name,
    date: h.date,
    startTime: '00:00',
    endTime: '23:59',
    color: MAJOR_HOLIDAY_COLOR,
    isHoliday: true
  }))

  return [...bankHolidays, ...majorHolidays]
}

function expandRecurringForDate(recurring: CalendarEvent[], dateStr: string): CalendarEvent[] {
  const [year, month, day] = dateStr.split('-').map(Number)
  const results: CalendarEvent[] = []

  for (const evt of recurring) {
    const rule = evt.recurring!
    const [origYear, origMonth, origDay] = rule.originalDate.split('-').map(Number)
    let matches = false

    switch (rule.type) {
      case 'yearly':
        matches = month === origMonth && day === origDay
        break
      case 'monthly':
        matches = day === origDay
        break
      case 'weekly': {
        const origDow = new Date(origYear, origMonth - 1, origDay).getDay()
        const targetDow = new Date(year, month - 1, day).getDay()
        matches = origDow === targetDow
        break
      }
    }

    if (matches) {
      results.push({
        ...evt,
        id: `${evt.id}_${dateStr}`,
        date: dateStr
      })
    }
  }

  return results
}

// Cache holiday events per year
const holidayCache = new Map<number, CalendarEvent[]>()
function getHolidaysForYear(year: number): CalendarEvent[] {
  if (!holidayCache.has(year)) {
    holidayCache.set(year, generateHolidayEvents(year))
  }
  return holidayCache.get(year)!
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: [],
      recurringEvents: [],

      addEvent: (event) => {
        const newEvent: CalendarEvent = { ...event, id: generateId() }
        set((state) => ({ events: [...state.events, newEvent] }))
      },

      addRecurringEvent: (event) => {
        const newEvent: CalendarEvent = { ...event, id: generateId() }
        set((state) => ({ recurringEvents: [...state.recurringEvents, newEvent] }))
      },

      updateEvent: (id, patch) => {
        set((state) => ({
          events: state.events.map((e) => (e.id === id ? { ...e, ...patch } : e))
        }))
      },

      removeEvent: (id) => {
        // Multi-day/recurring events are rendered as clones with ids of the
        // form `<baseId>_YYYY-MM-DD`. Strip that suffix so deletes apply to
        // the underlying stored event rather than becoming a no-op.
        const baseId = /^(.*)_\d{4}-\d{2}-\d{2}$/.exec(id)?.[1] ?? id
        set((state) => ({
          events: state.events.filter((e) => e.id !== id && e.id !== baseId)
        }))
      },

      removeRecurringEvent: (id) => {
        set((state) => ({
          recurringEvents: state.recurringEvents.filter((e) => e.id !== id)
        }))
      },

      getEventsForDate: (date) => {
        const state = get()
        const year = parseInt(date.split('-')[0])
        const holidays = getHolidaysForYear(year).filter((h) => h.date === date)
        const recurring = expandRecurringForDate(state.recurringEvents, date)
        // Single-day events on that exact date, PLUS multi-day events whose
        // span contains the date — cloned so their `date` reflects the day
        // they're being rendered on (otherwise MonthView groups every copy
        // onto the original start date).
        const regular: CalendarEvent[] = []
        for (const e of state.events) {
          if (e.endDate && e.endDate >= e.date) {
            if (date >= e.date && date <= e.endDate) {
              regular.push({ ...e, id: `${e.id}_${date}`, date })
            }
          } else if (e.date === date) {
            regular.push(e)
          }
        }
        return [...holidays, ...recurring, ...regular]
      }
    }),
    {
      name: 'calendar-store',
      storage: createJSONStorage(() => electronStorage),
      partialize: (state) => ({
        events: state.events,
        recurringEvents: state.recurringEvents
      })
    }
  )
)
