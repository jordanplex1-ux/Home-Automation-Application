import { useEffect, useState } from 'react'
import type { WidgetSettingsProps } from '../types'

type Speed = 'very-slow' | 'slow' | 'medium' | 'fast'

const SPEED_OPTIONS: { value: Speed; label: string }[] = [
  { value: 'very-slow', label: 'Very slow' },
  { value: 'slow',      label: 'Slow' },
  { value: 'medium',    label: 'Medium' },
  { value: 'fast',      label: 'Fast' }
]

// Fallback list when the IPC-discovered source list hasn't arrived yet — keeps
// the settings usable offline and matches the defaults registered in main.
const FALLBACK_SOURCES: { id: string; label: string }[] = [
  { id: 'bbc',      label: 'BBC News' },
  { id: 'guardian', label: 'The Guardian' },
  { id: 'sky',      label: 'Sky News' },
  { id: 'gbnews',   label: 'GB News' }
]

export function NewsSettings({ config, onConfigChange }: WidgetSettingsProps) {
  const selected = (config.sources as string[] | undefined) ?? ['bbc', 'guardian', 'sky', 'gbnews']
  const speed = (config.speed as Speed) ?? 'medium'
  const [sourceList, setSourceList] = useState<{ id: string; label: string }[]>(FALLBACK_SOURCES)

  useEffect(() => {
    const api = window.electronAPI?.news
    if (!api) return
    api.sources().then((list) => {
      if (Array.isArray(list) && list.length > 0) setSourceList(list)
    }).catch(() => {
      /* keep fallback */
    })
  }, [])

  const toggleSource = (id: string) => {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    // Don't allow disabling every source — the widget would have nothing to show
    if (next.length === 0) return
    onConfigChange({ sources: next })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
          Sources
        </label>
        <div className="flex flex-col gap-1.5">
          {sourceList.map((source) => {
            const active = selected.includes(source.id)
            return (
              <button
                key={source.id}
                onClick={() => toggleSource(source.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all touch-manipulation ${
                  active
                    ? 'bg-accent-primary/15 text-text-primary border-accent-primary/30'
                    : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:bg-bg-hover'
                }`}
              >
                <span>{source.label}</span>
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                    active
                      ? 'bg-accent-primary border-accent-primary text-bg-primary font-bold'
                      : 'border-border-subtle'
                  }`}
                >
                  {active ? '✓' : ''}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-text-disabled mt-2">
          Headlines are merged across the selected sources and sorted by publish time.
        </p>
      </div>

      <div>
        <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
          Scroll speed
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SPEED_OPTIONS.map((opt) => {
            const active = opt.value === speed
            return (
              <button
                key={opt.value}
                onClick={() => onConfigChange({ speed: opt.value })}
                className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all active:scale-95 touch-manipulation ${
                  active
                    ? 'bg-accent-primary/20 text-accent-primary border-accent-primary/40 shadow-glow-sm'
                    : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:bg-bg-hover'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
