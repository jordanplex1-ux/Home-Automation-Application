import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { electronStorage } from '../hooks/useElectronStore'

export interface ActiveReminder {
  id: string          // event id (unique key — same event won't fire twice)
  title: string
  color: string
  eventTime: string   // formatted "HH:mm" or "All day"
  dateLabel: string   // e.g. "Today" / "Tomorrow" / "Fri 12 May"
  minutesUntil: number
}

// Fired reminders are remembered for this long, then pruned. A reminder
// fires close to its event, so a week is plenty to prevent re-firing while
// keeping the persisted record from growing forever.
const FIRED_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface RemindersState {
  /** Currently visible reminders. Newest at the top. Transient — not persisted. */
  active: ActiveReminder[]
  /** event id -> epoch ms when it fired. Persisted so a restart doesn't re-fire. */
  firedAt: Record<string, number>

  fire: (reminder: ActiveReminder) => void
  dismiss: (id: string) => void
  hasFired: (id: string) => boolean
  reset: () => void
}

function pruneFired(firedAt: Record<string, number>): Record<string, number> {
  const cutoff = Date.now() - FIRED_TTL_MS
  let changed = false
  const next: Record<string, number> = {}
  for (const [id, ts] of Object.entries(firedAt)) {
    if (ts > cutoff) next[id] = ts
    else changed = true
  }
  return changed ? next : firedAt
}

export const useRemindersStore = create<RemindersState>()(
  persist(
    (set, get) => ({
      active: [],
      firedAt: {},

      fire: (reminder) =>
        set((state) => {
          // Already fired (this session or before a restart) — do nothing.
          if (state.firedAt[reminder.id]) return state
          return {
            active: [reminder, ...state.active],
            firedAt: { ...state.firedAt, [reminder.id]: Date.now() }
          }
        }),

      dismiss: (id) =>
        set((state) => ({ active: state.active.filter((r) => r.id !== id) })),

      hasFired: (id) => !!get().firedAt[id],

      reset: () => set({ active: [], firedAt: {} })
    }),
    {
      name: 'reminders-store',
      storage: createJSONStorage(() => electronStorage),
      // Only the fired record is durable; visible banners are runtime-only so
      // a restart doesn't resurrect stale pop-ups.
      partialize: (state) => ({ firedAt: state.firedAt }),
      onRehydrateStorage: () => (state) => {
        if (state) state.firedAt = pruneFired(state.firedAt)
      }
    }
  )
)
