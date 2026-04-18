import { getAllWidgets } from '../../widgets/registry'
import { useWidgetStore } from '../../stores/useWidgetStore'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface WidgetPickerProps {
  open: boolean
  onClose: () => void
}

export function WidgetPicker({ open, onClose }: WidgetPickerProps) {
  const addWidget = useWidgetStore((s) => s.addWidget)
  const widgets = getAllWidgets()

  const handleAdd = (widgetId: string) => {
    addWidget(widgetId)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Widget">
      <div className="flex flex-col gap-3">
        {widgets.map((def) => (
          <button
            key={def.id}
            onClick={() => handleAdd(def.id)}
            className="flex items-center gap-4 p-4 rounded-xl border border-border-subtle bg-bg-tertiary/50 hover:bg-bg-hover hover:border-accent-primary/30 transition-all duration-200 text-left touch-manipulation active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center shrink-0">
              <def.icon className="w-5 h-5 text-accent-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary">{def.name}</div>
              <div className="text-xs text-text-secondary mt-0.5">{def.description}</div>
            </div>
          </button>
        ))}
        {widgets.length === 0 && (
          <p className="text-text-secondary text-sm text-center py-8">
            No widgets available yet.
          </p>
        )}
      </div>
    </Modal>
  )
}
