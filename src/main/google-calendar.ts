import { ipcMain } from 'electron'
import { IPC } from '../shared/ipc-channels'
import {
  beginAuthFlow,
  disconnectAccount,
  getAccessToken,
  isConfigured,
  listAccounts
} from './google-auth'

export interface GoogleCalendarSummary {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
  foregroundColor?: string
}

export interface GoogleCalendarEvent {
  id: string
  calendarId: string
  accountEmail: string
  title: string
  date: string         // YYYY-MM-DD start
  endDate?: string     // YYYY-MM-DD end (inclusive) for multi-day
  startTime: string    // HH:mm
  endTime: string      // HH:mm
  allDay: boolean
  location?: string
  notes?: string
  color?: string
}

interface RawListResponse<T> {
  items?: T[]
  nextPageToken?: string
}

interface RawCalendarItem {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
  foregroundColor?: string
}

interface RawEventItem {
  id: string
  summary?: string
  status?: string
  location?: string
  description?: string
  start?: { date?: string; dateTime?: string; timeZone?: string }
  end?: { date?: string; dateTime?: string; timeZone?: string }
}

async function gFetch<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Google API ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

async function listCalendarsForAccount(email: string): Promise<GoogleCalendarSummary[]> {
  const token = await getAccessToken(email)
  const data = await gFetch<RawListResponse<RawCalendarItem>>(
    token,
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader'
  )
  return (data.items ?? []).map((c) => ({
    id: c.id,
    summary: c.summary,
    primary: c.primary,
    backgroundColor: c.backgroundColor,
    foregroundColor: c.foregroundColor
  }))
}

/**
 * Fetch events for a single calendar between two ISO-date boundaries (inclusive).
 * Handles all-day vs timed events and multi-day spans.
 */
async function listEventsForCalendar(
  email: string,
  calendarId: string,
  timeMinISO: string,
  timeMaxISO: string
): Promise<GoogleCalendarEvent[]> {
  const token = await getAccessToken(email)
  const params = new URLSearchParams({
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    singleEvents: 'true',  // expand recurring events
    orderBy: 'startTime',
    maxResults: '250'
  })

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`
  const data = await gFetch<RawListResponse<RawEventItem>>(token, url)

  const out: GoogleCalendarEvent[] = []
  for (const ev of data.items ?? []) {
    if (ev.status === 'cancelled') continue
    if (!ev.start) continue

    // All-day events use `date` (YYYY-MM-DD); timed events use `dateTime` (ISO-8601).
    // Google's all-day end.date is *exclusive* — subtract a day for our inclusive endDate.
    if (ev.start.date) {
      const startDate = ev.start.date
      let endDate: string | undefined = undefined
      if (ev.end?.date) {
        const endExclusive = new Date(ev.end.date + 'T00:00:00')
        endExclusive.setDate(endExclusive.getDate() - 1)
        const inclusive = endExclusive.toISOString().slice(0, 10)
        if (inclusive > startDate) endDate = inclusive
      }
      out.push({
        id: ev.id,
        calendarId,
        accountEmail: email,
        title: ev.summary ?? '(no title)',
        date: startDate,
        endDate,
        startTime: '00:00',
        endTime: '23:59',
        allDay: true,
        location: ev.location,
        notes: ev.description
      })
    } else if (ev.start.dateTime) {
      const startDt = new Date(ev.start.dateTime)
      const endDt = ev.end?.dateTime ? new Date(ev.end.dateTime) : startDt
      const startDate = formatLocalDate(startDt)
      const endDate = formatLocalDate(endDt)
      out.push({
        id: ev.id,
        calendarId,
        accountEmail: email,
        title: ev.summary ?? '(no title)',
        date: startDate,
        endDate: endDate !== startDate ? endDate : undefined,
        startTime: formatLocalTime(startDt),
        endTime: formatLocalTime(endDt),
        allDay: false,
        location: ev.location,
        notes: ev.description
      })
    }
  }
  return out
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function formatLocalTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// ---------------------------------------------------------------------------
// IPC wiring
// ---------------------------------------------------------------------------

export function setupGoogleCalendarIPC(): void {
  ipcMain.handle(IPC.GOOGLE_AUTH_IS_CONFIGURED, () => isConfigured())

  ipcMain.handle(IPC.GOOGLE_AUTH_LIST_ACCOUNTS, () => listAccounts())

  ipcMain.handle(IPC.GOOGLE_AUTH_BEGIN, async () => {
    try {
      const account = await beginAuthFlow()
      return { ok: true as const, account }
    } catch (err) {
      return { ok: false as const, message: (err as Error).message }
    }
  })

  ipcMain.handle(IPC.GOOGLE_AUTH_DISCONNECT, (_e, email: string) => {
    disconnectAccount(email)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.GOOGLE_CALENDAR_LIST, async (_e, email: string) => {
    try {
      return { ok: true as const, calendars: await listCalendarsForAccount(email) }
    } catch (err) {
      return { ok: false as const, message: (err as Error).message }
    }
  })

  ipcMain.handle(
    IPC.GOOGLE_EVENTS_FETCH,
    async (
      _e,
      requests: { email: string; calendarId: string }[],
      timeMinISO: string,
      timeMaxISO: string
    ) => {
      // Run all requested calendars in parallel; isolate failures so one bad
      // calendar doesn't blank everything out.
      const settled = await Promise.allSettled(
        (requests ?? []).map((r) => listEventsForCalendar(r.email, r.calendarId, timeMinISO, timeMaxISO))
      )
      const events: GoogleCalendarEvent[] = []
      for (const s of settled) {
        if (s.status === 'fulfilled') events.push(...s.value)
        else console.warn('[google-calendar] events fetch failed:', s.reason?.message ?? s.reason)
      }
      return events
    }
  )
}
