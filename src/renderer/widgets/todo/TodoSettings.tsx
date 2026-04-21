import { Button } from '../../components/ui/Button'
import { useTodoStore } from '../../stores/useTodoStore'
import { toast } from '../../stores/useToastStore'
import type { WidgetSettingsProps } from '../types'

interface AutoDeleteOption {
  label: string
  value: number // ms; 0 = never
}

const OPTIONS: AutoDeleteOption[] = [
  { label: 'Never', value: 0 },
  { label: '1 hour', value: 60 * 60 * 1000 },
  { label: '6 hours', value: 6 * 60 * 60 * 1000 },
  { label: '1 day', value: 24 * 60 * 60 * 1000 },
  { label: '1 week', value: 7 * 24 * 60 * 60 * 1000 }
]

export function TodoSettings({ instanceId, config, onConfigChange }: WidgetSettingsProps) {
  const current = (config.autoDeleteMs as number) ?? 0
  const clearCompleted = useTodoStore((s) => s.clearCompleted)

  const handleClearCompleted = () => {
    clearCompleted(instanceId)
    toast.success('Completed tasks cleared')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs text-text-secondary mb-2 block">
          Auto-delete completed tasks
        </label>
        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map((opt) => {
            const active = opt.value === current
            return (
              <button
                key={opt.value}
                onClick={() => onConfigChange({ autoDeleteMs: opt.value })}
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
        <p className="text-[10px] text-text-disabled mt-2">
          Tasks are removed once they've been checked for this long.
        </p>
      </div>

      <div className="pt-3 border-t border-border-subtle">
        <Button variant="danger" onClick={handleClearCompleted}>
          Clear completed now
        </Button>
      </div>
    </div>
  )
}
