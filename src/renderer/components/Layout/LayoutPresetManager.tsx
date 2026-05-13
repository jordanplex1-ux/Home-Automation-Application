import { useState } from 'react'
import { Pencil, Trash2, Check, X, RotateCcw } from 'lucide-react'
import { useLayoutPresetsStore } from '../../stores/useLayoutPresetsStore'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { toast } from '../../stores/useToastStore'

/**
 * Rename, overwrite (re-save current layout into the preset), and delete saved
 * layout presets. Lives in the System tab of App Settings.
 */
export function LayoutPresetManager() {
  const presets = useLayoutPresetsStore((s) => s.presets)
  const rename = useLayoutPresetsStore((s) => s.rename)
  const overwrite = useLayoutPresetsStore((s) => s.overwrite)
  const remove = useLayoutPresetsStore((s) => s.remove)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  if (presets.length === 0) {
    return (
      <p className="text-xs text-text-disabled">
        No saved layouts yet. Save one from the Layouts menu in the top-left of the
        screen.
      </p>
    )
  }

  const beginRename = (id: string, currentName: string) => {
    setEditingId(id)
    setDraft(currentName)
  }
  const commitRename = () => {
    if (!editingId) return
    rename(editingId, draft)
    setEditingId(null)
  }
  const cancelRename = () => setEditingId(null)

  const handleOverwrite = (id: string, name: string) => {
    overwrite(id)
    toast.success(`Updated "${name}" with current layout`)
  }

  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      remove(confirmDeleteId)
      toast.success('Layout deleted')
    }
    setConfirmDeleteId(null)
  }

  const beingDeleted = presets.find((p) => p.id === confirmDeleteId)

  return (
    <>
      <div className="flex flex-col gap-2">
        {presets.map((p) => {
          const isEditing = editingId === p.id
          return (
            <div
              key={p.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-tertiary border border-border-subtle"
            >
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') cancelRename()
                    }}
                    autoFocus
                    className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-bg-secondary border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-primary/50"
                  />
                  <IconBtn label="Save name" onClick={commitRename}>
                    <Check size={14} className="text-accent-success" />
                  </IconBtn>
                  <IconBtn label="Cancel" onClick={cancelRename}>
                    <X size={14} />
                  </IconBtn>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{p.name}</p>
                    <p className="text-[10px] text-text-disabled">
                      {p.instances.length} widget{p.instances.length === 1 ? '' : 's'} ·
                      {' '}saved {new Date(p.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <IconBtn label="Overwrite with current layout" onClick={() => handleOverwrite(p.id, p.name)}>
                    <RotateCcw size={14} />
                  </IconBtn>
                  <IconBtn label="Rename" onClick={() => beginRename(p.id, p.name)}>
                    <Pencil size={14} />
                  </IconBtn>
                  <IconBtn label="Delete" onClick={() => setConfirmDeleteId(p.id)} danger>
                    <Trash2 size={14} />
                  </IconBtn>
                </>
              )}
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title={`Delete "${beingDeleted?.name ?? ''}"?`}
        message="The saved layout will be removed. Widgets currently on the dashboard are not affected."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  )
}

function IconBtn({
  children,
  onClick,
  label,
  danger
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`shrink-0 h-7 w-7 rounded-lg flex items-center justify-center transition-colors touch-manipulation ${
        danger
          ? 'text-text-disabled hover:text-accent-danger hover:bg-accent-danger/10'
          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  )
}
