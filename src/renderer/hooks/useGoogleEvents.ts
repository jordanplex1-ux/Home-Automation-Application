import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { startOfMonth, endOfMonth, addDays, subDays, format } from 'date-fns'
import { useGoogleCalendarStore, buildEventRequests } from '../stores/useGoogleCalendarStore'
import type { CalendarEvent } from '../stores/useCalendarStore'

interface UseGoogleEventsOpts {
  /** Anchor date (typically the currently-selected day) */
  date: Date
  /** 'day' fetches a small window; 'month' fetches the whole displayed month + buffer */
  scope: 'day' | 'month'
}

/**
 * Fetches Google Calendar events for the requested time window and returns
 * them already mapped into our internal CalendarEvent shape so the day-planner
 * can merge them in alongside locally-stored events.
 *
 * The query is keyed on the date window + the set of selected calendars, so
 * adding/removing a calendar refetches automatically.
 */
export function useGoogleEvents({ date, scope }: UseGoogleEventsOpts) {
  const selected = useGoogleCalendarStore((s) => s.selected)
  const accountColors = useGoogleCalendarStore((s) => s.accountColors)

  // Compute the window. Day view: ±2 days for safe multi-day overlap. Month
  // view: full month + 1-week buffer either side so events bleeding into
  // adjacent month rows still appear.
  const { timeMin, timeMax } = useMemo(() => {
    if (scope === 'day') {
      return { timeMin: subDays(date, 2), timeMax: addDays(date, 2) }
    }
    return {
      timeMin: subDays(startOfMonth(date), 7),
      timeMax: addDays(endOfMonth(date), 7)
    }
  }, [date, scope])

  const requests = useMemo(() => buildEventRequests(selected), [selected])

  const query = useQuery({
    // Use ISO date strings (not Date objects) so the key is stable across renders.
    queryKey: [
      'google-events',
      scope,
      format(timeMin, 'yyyy-MM-dd'),
      format(timeMax, 'yyyy-MM-dd'),
      requests.map((r) => `${r.email}:${r.calendarId}`).sort().join(',')
    ],
    queryFn: async () => {
      if (!window.electronAPI?.google || requests.length === 0) return []
      return window.electronAPI.google.fetchEvents(
        requests,
        timeMin.toISOString(),
        timeMax.toISOString()
      )
    },
    refetchInterval: 10 * 60 * 1000, // 10 min
    staleTime: 5 * 60 * 1000,
    enabled: requests.length > 0
  })

  // Map Google events → our CalendarEvent shape so consuming components can
  // treat them uniformly. Tag the id with `gcal:` so the day-planner knows
  // these are read-only and shouldn't be deleted via the local store.
  const mapped: CalendarEvent[] = useMemo(() => {
    const items = query.data ?? []
    return items.map((g) => ({
      id: `gcal:${g.accountEmail}:${g.id}`,
      title: g.title,
      date: g.date,
      endDate: g.endDate,
      startTime: g.startTime,
      endTime: g.endTime,
      color: accountColors[g.accountEmail] ?? '#00d4ff',
      notes: g.notes,
      allDay: g.allDay
    }))
  }, [query.data, accountColors])

  return { events: mapped, isLoading: query.isLoading, isError: query.isError }
}
