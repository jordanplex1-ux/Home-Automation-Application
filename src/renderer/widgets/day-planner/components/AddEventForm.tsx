import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { EVENT_COLORS } from '../../../stores/useCalendarStore'

type RecurringType = 'yearly' | 'monthly' | 'weekly'

export interface AddEventSubmitPayload {
  title: string
  startTime: string
  endTime: string
  color: string
  allDay?: boolean
  endDate?: string
  recurringType?: RecurringType
  reminderMinutes?: number | null
}

const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'None' },
  { value: 0,    label: 'At start' },
  { value: 5,    label: '5 min' },
  { value: 15,   label: '15 min' },
  { value: 30,   label: '30 min' },
  { value: 60,   label: '1 hour' },
  { value: 1440, label: '1 day' }
]

interface AddEventFormProps {
  date: string             // display label, e.g. "Monday, 5 May 2026"
  defaultDateISO: string   // YYYY-MM-DD — the selected date
  defaultStartTime?: string
  onSubmit: (event: AddEventSubmitPayload) => void
  onCancel: () => void
}

function padTime(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`
}

const RECURRING_OPTIONS: { key: RecurringType | 'none'; label: string }[] = [
  { key: 'none', label: 'One-off' },
  { key: 'weekly', label: 'Every week' },
  { key: 'monthly', label: 'Every month' },
  { key: 'yearly', label: 'Every year' },
]

export function AddEventForm({ date, defaultDateISO, defaultStartTime, onSubmit, onCancel }: AddEventFormProps) {
  const startHour = defaultStartTime ? parseInt(defaultStartTime.split(':')[0]) : 9
  const [title, setTitle] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [multiDay, setMultiDay] = useState(false)
  const [startTime, setStartTime] = useState(defaultStartTime || padTime(startHour))
  const [endTime, setEndTime] = useState(padTime(Math.min(startHour + 1, 23)))
  const [endDate, setEndDate] = useState(defaultDateISO)
  const [color, setColor] = useState(EVENT_COLORS[0])
  const [recurring, setRecurring] = useState<RecurringType | 'none'>('none')
  const [reminder, setReminder] = useState<number | null>(null)

  const handleSubmit = () => {
    if (!title.trim()) return
    const payload: AddEventSubmitPayload = {
      title: title.trim(),
      startTime: allDay ? '00:00' : startTime,
      endTime: allDay ? '23:59' : endTime,
      color,
      allDay: allDay || undefined,
      endDate: multiDay && endDate > defaultDateISO ? endDate : undefined,
      recurringType: recurring === 'none' ? undefined : recurring,
      reminderMinutes: reminder
    }
    onSubmit(payload)
  }

  // A multi-day event cannot also be recurring in this simple model
  const recurringDisabled = multiDay

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-text-secondary">{date}</p>

      <input
        type="text"
        placeholder="Event title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm placeholder-text-disabled outline-none focus:border-accent-primary/50 focus:shadow-glow-sm transition-all"
      />

      {/* Toggle row: All day + Multi day */}
      <div className="flex gap-2">
        <button
          onClick={() => setAllDay((v) => !v)}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all touch-manipulation border ${
            allDay
              ? 'bg-accent-primary/20 text-accent-primary border-accent-primary/30'
              : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:bg-bg-hover'
          }`}
        >
          All day
        </button>
        <button
          onClick={() => { setMultiDay((v) => !v); if (recurring !== 'none') setRecurring('none') }}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all touch-manipulation border ${
            multiDay
              ? 'bg-accent-primary/20 text-accent-primary border-accent-primary/30'
              : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:bg-bg-hover'
          }`}
        >
          Multi-day
        </button>
      </div>

      {/* Times row (hidden if all-day) */}
      {!allDay && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-text-secondary mb-1 block">Start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-primary/50 transition-all [color-scheme:dark]"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-text-secondary mb-1 block">End</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-primary/50 transition-all [color-scheme:dark]"
            />
          </div>
        </div>
      )}

      {/* End-date row (multi-day only) */}
      {multiDay && (
        <div>
          <label className="text-xs text-text-secondary mb-1 block">End date</label>
          <input
            type="date"
            value={endDate}
            min={defaultDateISO}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-primary/50 transition-all [color-scheme:dark]"
          />
        </div>
      )}

      {/* Recurring */}
      <div>
        <label className="text-xs text-text-secondary mb-1.5 block">
          Repeat{recurringDisabled && <span className="text-text-disabled ml-1">(disabled for multi-day)</span>}
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {RECURRING_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              disabled={recurringDisabled}
              onClick={() => setRecurring(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all touch-manipulation ${
                recurring === opt.key && !recurringDisabled
                  ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                  : 'bg-bg-tertiary text-text-secondary border border-border-subtle hover:bg-bg-hover'
              } ${recurringDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reminder */}
      <div>
        <label className="text-xs text-text-secondary mb-1.5 block">Reminder</label>
        <div className="flex gap-1.5 flex-wrap">
          {REMINDER_OPTIONS.map((opt) => {
            const active = reminder === opt.value
            return (
              <button
                key={opt.label}
                onClick={() => setReminder(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all touch-manipulation ${
                  active
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                    : 'bg-bg-tertiary text-text-secondary border border-border-subtle hover:bg-bg-hover'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Colour */}
      <div>
        <label className="text-xs text-text-secondary mb-1.5 block">Colour</label>
        <div className="flex gap-2">
          {EVENT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-all touch-manipulation ${
                color === c ? 'border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Select colour ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 mt-1">
        <Button variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="flex-1" disabled={!title.trim()}>
          Add Event
        </Button>
      </div>
    </div>
  )
}
