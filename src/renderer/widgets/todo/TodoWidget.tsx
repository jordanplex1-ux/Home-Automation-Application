import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { useTodoStore } from '../../stores/useTodoStore'
import type { WidgetProps } from '../types'

export function TodoWidget({ instanceId, config }: WidgetProps) {
  const items = useTodoStore((s) => s.itemsByInstance[instanceId] ?? EMPTY)
  const addItem = useTodoStore((s) => s.addItem)
  const toggleItem = useTodoStore((s) => s.toggleItem)
  const removeItem = useTodoStore((s) => s.removeItem)
  const pruneExpired = useTodoStore((s) => s.pruneExpired)

  const ttlMs = (config.autoDeleteMs as number) ?? 0
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Prune on mount, on ttl change, and on a 60s tick so the UI stays accurate
  // even if the widget sits open through an expiry boundary.
  useEffect(() => {
    if (ttlMs <= 0) return
    pruneExpired(instanceId, ttlMs)
    const id = window.setInterval(() => pruneExpired(instanceId, ttlMs), 60_000)
    return () => window.clearInterval(id)
  }, [instanceId, ttlMs, pruneExpired])

  const { pending, completed } = useMemo(() => {
    const p: typeof items = []
    const c: typeof items = []
    for (const i of items) (i.completed ? c : p).push(i)
    return { pending: p, completed: c }
  }, [items])

  const handleAdd = () => {
    if (!draft.trim()) return
    addItem(instanceId, draft)
    setDraft('')
    inputRef.current?.focus()
  }

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="Add a task…"
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-primary/50 transition-all"
        />
        <button
          onClick={handleAdd}
          aria-label="Add task"
          disabled={!draft.trim()}
          className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center bg-accent-primary/20 text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/30 active:scale-95 disabled:opacity-30 disabled:active:scale-100 transition-all touch-manipulation"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-auto flex flex-col gap-1 pr-0.5">
        {items.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-text-disabled">No tasks yet</p>
          </div>
        )}

        {pending.map((item) => (
          <TodoRow
            key={item.id}
            text={item.text}
            completed={false}
            createdAt={item.createdAt}
            onToggle={() => toggleItem(instanceId, item.id)}
            onDelete={() => removeItem(instanceId, item.id)}
          />
        ))}

        {completed.length > 0 && pending.length > 0 && (
          <div className="mt-2 mb-1 border-t border-border-subtle/60" />
        )}

        {completed.map((item) => (
          <TodoRow
            key={item.id}
            text={item.text}
            completed
            createdAt={item.createdAt}
            onToggle={() => toggleItem(instanceId, item.id)}
            onDelete={() => removeItem(instanceId, item.id)}
          />
        ))}
      </div>
    </div>
  )
}

const EMPTY: never[] = []

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * How long the task has been on the list, as a compact badge label.
 * Uses calendar-day boundaries (not 24h windows) so a task added yesterday
 * evening reads "1d" this morning, matching how people think about it.
 */
function ageLabel(createdAt: number): string {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfCreated = new Date(createdAt)
  startOfCreated.setHours(0, 0, 0, 0)
  const days = Math.round((startOfToday.getTime() - startOfCreated.getTime()) / MS_PER_DAY)
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

interface TodoRowProps {
  text: string
  completed: boolean
  createdAt: number
  onToggle: () => void
  onDelete: () => void
}

function TodoRow({ text, completed, createdAt, onToggle, onDelete }: TodoRowProps) {
  const age = ageLabel(createdAt)
  // Tint older tasks amber once they've lingered past a week so stale items
  // draw the eye. Completed items always read muted.
  const days = Math.round((Date.now() - createdAt) / MS_PER_DAY)
  const ageClass = completed
    ? 'text-text-disabled/70'
    : days >= 7
    ? 'text-accent-warning'
    : 'text-text-disabled'

  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-hover/60 transition-colors">
      <button
        onClick={onToggle}
        aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
        className={`shrink-0 h-5 w-5 rounded-md border flex items-center justify-center transition-all touch-manipulation active:scale-90 ${
          completed
            ? 'bg-accent-success/30 border-accent-success/60 text-accent-success'
            : 'bg-transparent border-border-subtle hover:border-accent-primary/60'
        }`}
      >
        {completed && <Check size={12} strokeWidth={3} />}
      </button>
      <span
        className={`flex-1 text-sm break-words ${
          completed ? 'line-through text-text-disabled' : 'text-text-primary'
        }`}
      >
        {text}
      </span>
      <span className={`shrink-0 text-[10px] tabular-nums whitespace-nowrap ${ageClass}`}>
        {age}
      </span>
      <button
        onClick={onDelete}
        aria-label="Delete task"
        className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center text-text-disabled opacity-0 group-hover:opacity-100 hover:text-accent-danger hover:bg-accent-danger/10 transition-all touch-manipulation"
      >
        <X size={14} />
      </button>
    </div>
  )
}
