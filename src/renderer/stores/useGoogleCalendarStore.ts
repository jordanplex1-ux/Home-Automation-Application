import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { electronStorage } from '../hooks/useElectronStore'

/**
 * Per-account selection of which calendars are pulled in. Account auth state
 * lives in the main process (electron-store, refresh tokens). This store only
 * holds the renderer-side preferences.
 */

interface GoogleCalendarState {
  /** Map: account email → list of calendar IDs the user has enabled */
  selected: Record<string, string[]>
  /** Map: account email → display tint for events from that account */
  accountColors: Record<string, string>

  setEnabledCalendars: (email: string, calendarIds: string[]) => void
  toggleCalendar: (email: string, calendarId: string) => void
  setAccountColor: (email: string, color: string) => void
  removeAccount: (email: string) => void
}

export const ACCOUNT_COLORS = [
  '#00d4ff', // cyan
  '#7c3aed', // purple
  '#10b981', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // teal
  '#ef4444', // red
  '#8b5cf6'  // violet
]

export function pickColorForNewAccount(existing: Record<string, string>): string {
  const used = new Set(Object.values(existing))
  return ACCOUNT_COLORS.find((c) => !used.has(c)) ?? ACCOUNT_COLORS[0]
}

export const useGoogleCalendarStore = create<GoogleCalendarState>()(
  persist(
    (set, get) => ({
      selected: {},
      accountColors: {},

      setEnabledCalendars: (email, calendarIds) =>
        set((state) => ({
          selected: { ...state.selected, [email]: calendarIds }
        })),

      toggleCalendar: (email, calendarId) =>
        set((state) => {
          const current = state.selected[email] ?? []
          const next = current.includes(calendarId)
            ? current.filter((id) => id !== calendarId)
            : [...current, calendarId]
          return { selected: { ...state.selected, [email]: next } }
        }),

      setAccountColor: (email, color) =>
        set((state) => ({
          accountColors: { ...state.accountColors, [email]: color }
        })),

      removeAccount: (email) => {
        const { selected, accountColors } = get()
        const nextSelected = { ...selected }
        const nextColors = { ...accountColors }
        delete nextSelected[email]
        delete nextColors[email]
        set({ selected: nextSelected, accountColors: nextColors })
      }
    }),
    {
      name: 'google-calendar-prefs',
      storage: createJSONStorage(() => electronStorage)
    }
  )
)

/** Flatten the selection map into the request shape the IPC handler expects */
export function buildEventRequests(
  selected: Record<string, string[]>
): { email: string; calendarId: string }[] {
  const out: { email: string; calendarId: string }[] = []
  for (const [email, ids] of Object.entries(selected)) {
    for (const id of ids) out.push({ email, calendarId: id })
  }
  return out
}
