import { useEffect } from 'react'
import { format } from 'date-fns'
import { useCalendarStore, type CalendarEvent } from '../stores/useCalendarStore'
import { useRemindersStore } from '../stores/useRemindersStore'

// Scan twice a minute — fine-grained enough for "5 min before" reminders
// while keeping the work load trivial.
const SCAN_INTERVAL_MS = 30_000

function parseEventDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const [hh, mm] = time.split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null
  const [y, mo, d] = date.split('-').map(Number)
  return new Date(y, mo - 1, d, hh, mm, 0, 0)
}

function dateLabel(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return format(date, 'EEE d MMM')
}

/**
 * Periodically scans local events and fires reminders that have entered
 * their "trigger window" (between reminderMinutes-before and event start).
 * Reminders are de-duplicated via the store's `fired` set so the same event
 * won't pop twice in a single session.
 */
export function useReminderScanner() {
  const events = useCalendarStore((s) => s.events)
  const fire = useRemindersStore((s) => s.fire)

  useEffect(() => {
    const scan = () => {
      const now = Date.now()
      for (const ev of events) {
        if (ev.reminderMinutes == null) continue
        const start = parseEventDateTime(ev.date, ev.startTime)
        if (!start) continue
        const triggerAt = start.getTime() - ev.reminderMinutes * 60_000
        // Window: trigger time has passed AND we haven't already passed the
        // event start by more than a minute (avoid firing for past events
        // we missed entirely).
        if (now >= triggerAt && now <= start.getTime() + 60_000) {
          const minutesUntil = Math.max(0, Math.round((start.getTime() - now) / 60_000))
          fire({
            id: ev.id,
            title: ev.title,
            color: ev.color,
            eventTime: ev.allDay ? 'All day' : ev.startTime,
            dateLabel: dateLabel(start),
            minutesUntil
          })
        }
      }
    }
    scan()
    const id = window.setInterval(scan, SCAN_INTERVAL_MS)
    return () => window.clearInterval(id)
    // We intentionally rerun the scanner whenever the event list changes —
    // adding/editing an event might create a new pending reminder.
  }, [events, fire])
}

// Helper exported for use in the banner component (not part of the hook)
export function describeReminder(r: { eventTime: string; minutesUntil: number; dateLabel: string }): string {
  const base = r.eventTime === 'All day' ? r.dateLabel : `${r.dateLabel} · ${r.eventTime}`
  if (r.minutesUntil === 0) return `${base} — now`
  if (r.minutesUntil === 1) return `${base} — in 1 min`
  if (r.minutesUntil < 60) return `${base} — in ${r.minutesUntil} min`
  const h = Math.round(r.minutesUntil / 60)
  return `${base} — in ${h} hour${h === 1 ? '' : 's'}`
}

// Re-export type for convenience
export type { ActiveReminder } from '../stores/useRemindersStore'

// Keep dependency reference so unused-import lint doesn't trip
export type _Unused = CalendarEvent
