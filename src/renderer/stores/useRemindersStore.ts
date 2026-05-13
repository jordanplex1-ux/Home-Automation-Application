import { create } from 'zustand'

export interface ActiveReminder {
  id: string          // event id (unique key — same event won't fire twice per session)
  title: string
  color: string
  eventTime: string   // formatted "HH:mm" or "All day"
  dateLabel: string   // e.g. "Today" / "Tomorrow" / "Fri 12 May"
  minutesUntil: number
}

interface RemindersState {
  /** Currently visible reminders. Newest at the top. */
  active: ActiveReminder[]
  /** IDs that have already been shown this session — guards against re-firing. */
  fired: Set<string>

  fire: (reminder: ActiveReminder) => void
  dismiss: (id: string) => void
  reset: () => void
}

// Not persisted — reminders are runtime-only. A fresh app start can show a
// reminder again if its trigger window is still open.
export const useRemindersStore = create<RemindersState>((set) => ({
  active: [],
  fired: new Set(),

  fire: (reminder) =>
    set((state) => {
      if (state.fired.has(reminder.id)) return state
      const newFired = new Set(state.fired)
      newFired.add(reminder.id)
      return {
        active: [reminder, ...state.active],
        fired: newFired
      }
    }),

  dismiss: (id) =>
    set((state) => ({ active: state.active.filter((r) => r.id !== id) })),

  reset: () => set({ active: [], fired: new Set() })
}))
