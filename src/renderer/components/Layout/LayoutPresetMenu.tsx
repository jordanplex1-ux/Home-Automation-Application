import { useState } from 'react'
import { Layout as LayoutIcon, Check, Save, Plus } from 'lucide-react'
import { useLayoutPresetsStore } from '../../stores/useLayoutPresetsStore'
import { ContextMenu, type ContextMenuItem } from '../ui/ContextMenu'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { toast } from '../../stores/useToastStore'

/**
 * Dropdown for switching between saved layout presets. Sits next to the
 * ScreenTabs in the header (only relevant on the Family Hub screen). Also
 * hosts the "Save current as preset" entry.
 */
export function LayoutPresetMenu() {
  const presets = useLayoutPresetsStore((s) => s.presets)
  const apply = useLayoutPresetsStore((s) => s.apply)
  const saveCurrent = useLayoutPresetsStore((s) => s.saveCurrent)

  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [namePromptOpen, setNamePromptOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const openMenu = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ x: rect.left, y: rect.bottom + 4 })
  }

  const handleApply = (id: string, name: string) => {
    apply(id)
    toast.success(`Loaded "${name}"`)
  }

  const handleSavePrompt = () => {
    setNewName('')
    setNamePromptOpen(true)
  }

  const handleSaveConfirm = () => {
    if (!newName.trim()) return
    saveCurrent(newName)
    setNamePromptOpen(false)
    toast.success(`Saved layout "${newName.trim()}"`)
  }

  // Build the menu items. Presets first, divider, save action.
  const items: ContextMenuItem[] = []
  for (const p of presets) {
    items.push({
      label: p.name,
      icon: <Check size={14} className="opacity-0" />,  // alignment spacer
      onClick: () => handleApply(p.id, p.name)
    })
  }
  items.push({
    label: presets.length === 0 ? 'Save current layout' : 'Save current as new preset',
    icon: <Plus size={14} />,
    onClick: handleSavePrompt
  })

  return (
    <>
      <button
        onClick={openMenu}
        aria-label="Layout presets"
        className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-bg-secondary/60 border border-border-subtle text-xs font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all touch-manipulation"
      >
        <LayoutIcon size={14} />
        <span>Layouts</span>
        {presets.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-accent-primary/15 text-accent-primary text-[10px] tabular-nums">
            {presets.length}
          </span>
        )}
      </button>

      <ContextMenu
        open={menuPos !== null}
        x={menuPos?.x ?? 0}
        y={menuPos?.y ?? 0}
        items={items}
        onClose={() => setMenuPos(null)}
      />

      <Modal
        open={namePromptOpen}
        onClose={() => setNamePromptOpen(false)}
        title="Save layout as…"
      >
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) handleSaveConfirm()
            }}
            placeholder="Morning / Evening / Weekend…"
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm placeholder-text-disabled outline-none focus:border-accent-primary/50 focus:shadow-glow-sm transition-all"
          />
          <p className="text-[10px] text-text-disabled">
            Captures every widget on Family Hub right now — position, size, and
            settings. Apply it any time from this menu.
          </p>
          <div className="flex gap-2 mt-1">
            <Button variant="ghost" onClick={() => setNamePromptOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSaveConfirm} disabled={!newName.trim()} className="flex-1">
              <span className="flex items-center justify-center gap-1.5">
                <Save size={14} />
                Save
              </span>
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
