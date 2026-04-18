import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Lock, Plus } from 'lucide-react'
import { Clock } from './Clock'
import { StatusCluster } from './StatusCluster'
import { QuickActions } from './QuickActions'
import { DimOverlay } from './DimOverlay'
import { AppSettingsModal } from './AppSettingsModal'
import { ShortcutHelp } from './ShortcutHelp'
import { UpdateBanner } from './UpdateBanner'
import { WidgetGrid } from '../Widget/WidgetGrid'
import { WidgetPicker } from '../Widget/WidgetPicker'
import { WidgetSettingsModal } from '../Widget/WidgetSettingsModal'
import { useWidgetStore } from '../../stores/useWidgetStore'
import { useAppSettingsStore } from '../../stores/useAppSettingsStore'
import { IconButton } from '../ui/IconButton'
import { Toaster } from '../ui/Toaster'
import { toast } from '../../stores/useToastStore'

export function AppShell() {
  const isEditing = useWidgetStore((s) => s.isEditing)
  const setEditing = useWidgetStore((s) => s.setEditing)
  // Initialize app settings store (applies persisted accent on rehydrate)
  useAppSettingsStore((s) => s.accentName)
  const queryClient = useQueryClient()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [appSettingsOpen, setAppSettingsOpen] = useState(false)
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const [dimmed, setDimmed] = useState(false)

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore shortcuts while typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === '?') {
        setShortcutHelpOpen((v) => !v)
      } else if (e.key === 'e' || e.key === 'E') {
        setEditing(!useWidgetStore.getState().isEditing)
      } else if (e.key === 'r' || e.key === 'R') {
        queryClient.invalidateQueries()
        toast.success('Refreshing all widgets')
      } else if (e.key === 'd' || e.key === 'D') {
        setDimmed(true)
      } else if (e.key === 'f' || e.key === 'F') {
        window.electronAPI?.window?.toggleFullscreen?.()
      } else if (e.key === 'Escape' && dimmed) {
        setDimmed(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setEditing, queryClient, dimmed])

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-primary">
      {/* Header with clock */}
      <header className="flex items-center justify-center py-6 shrink-0">
        <Clock />
      </header>

      {/* Main widget area */}
      <main className="flex-1 px-4 pb-2 overflow-auto">
        <WidgetGrid />
      </main>

      {/* Taskbar */}
      <footer className="h-14 shrink-0 border-t border-border-subtle bg-bg-secondary/80 backdrop-blur-md flex items-center justify-between px-4 gap-4">
        <StatusCluster />

        <QuickActions
          onDim={() => setDimmed(true)}
          onOpenSettings={() => setAppSettingsOpen(true)}
        />

        <div className="flex items-center gap-1">
          {isEditing && (
            <IconButton label="Add widget" onClick={() => setPickerOpen(true)}>
              <Plus size={20} className="text-accent-primary" />
            </IconButton>
          )}
          <IconButton
            label={isEditing ? 'Lock layout' : 'Edit layout'}
            onClick={() => setEditing(!isEditing)}
          >
            {isEditing ? (
              <Lock size={18} className="text-accent-warning" />
            ) : (
              <Pencil size={18} />
            )}
          </IconButton>
        </div>
      </footer>

      {/* Modals */}
      <WidgetPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      <WidgetSettingsModal />
      <AppSettingsModal open={appSettingsOpen} onClose={() => setAppSettingsOpen(false)} />
      <ShortcutHelp open={shortcutHelpOpen} onClose={() => setShortcutHelpOpen(false)} />
      <DimOverlay active={dimmed} onWake={() => setDimmed(false)} />
      <UpdateBanner />
      <Toaster />
    </div>
  )
}
