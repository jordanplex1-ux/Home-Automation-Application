import { Modal } from '../ui/Modal'

interface ShortcutHelpProps {
  open: boolean
  onClose: () => void
}

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ['Shift', '?'], description: 'Show this help' },
  { keys: ['E'], description: 'Toggle edit mode' },
  { keys: ['R'], description: 'Refresh all widgets' },
  { keys: ['D'], description: 'Dim screen' },
  { keys: ['F'], description: 'Toggle fullscreen' },
  { keys: ['Esc'], description: 'Close modals / wake from dim' }
]

export function ShortcutHelp({ open, onClose }: ShortcutHelpProps) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts">
      <div className="flex flex-col gap-2">
        {SHORTCUTS.map((s) => (
          <div key={s.description} className="flex items-center justify-between py-1.5">
            <span className="text-sm text-text-secondary">{s.description}</span>
            <div className="flex gap-1">
              {s.keys.map((k) => (
                <kbd
                  key={k}
                  className="px-2 py-1 rounded-md bg-bg-tertiary border border-border-subtle text-xs text-text-primary font-mono min-w-[28px] text-center"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
