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
import { ScreenTabs } from './ScreenTabs'
import { LayoutPresetMenu } from './LayoutPresetMenu'
import { FamilyHub } from '../Screens/FamilyHub'
import { Whiteboard } from '../Screens/Whiteboard'
import { HomeAutomation } from '../Screens/HomeAutomation'
import { WidgetPicker } from '../Widget/WidgetPicker'
import { WidgetSettingsModal } from '../Widget/WidgetSettingsModal'
import { useWidgetStore } from '../../stores/useWidgetStore'
import { useAppSettingsStore } from '../../stores/useAppSettingsStore'
import { useInactivityTimer } from '../../hooks/useInactivityTimer'
import { useReminderScanner } from '../../hooks/useReminderScanner'
import { ReminderBanner } from './ReminderBanner'
import { IconButton } from '../ui/IconButton'
import { PinModal } from '../ui/PinModal'
import { Toaster } from '../ui/Toaster'
import { toast } from '../../stores/useToastStore'
import { verifyPin } from '../../lib/pin'

export function AppShell() {
  const isEditing = useWidgetStore((s) => s.isEditing)
  const setEditing = useWidgetStore((s) => s.setEditing)
  // Initialize app settings store (applies persisted accent on rehydrate)
  useAppSettingsStore((s) => s.accentName)
  const autoDimEnabled = useAppSettingsStore((s) => s.autoDimEnabled)
  const autoDimMinutes = useAppSettingsStore((s) => s.autoDimMinutes)
  const activeScreen = useAppSettingsStore((s) => s.activeScreen)
  const editLockEnabled = useAppSettingsStore((s) => s.editLockEnabled)
  const editLockPinHash = useAppSettingsStore((s) => s.editLockPinHash)
  const queryClient = useQueryClient()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [appSettingsOpen, setAppSettingsOpen] = useState(false)
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const [dimmed, setDimmed] = useState(false)
  const [pinPromptOpen, setPinPromptOpen] = useState(false)

  // Locking is always free; unlocking prompts for the PIN when the feature
  // is on and a hash has been set.
  const tryEnterEditMode = () => {
    if (isEditing) {
      setEditing(false)
      return
    }
    if (editLockEnabled && editLockPinHash) {
      setPinPromptOpen(true)
    } else {
      setEditing(true)
    }
  }

  const handlePinSubmit = async (pin: string): Promise<boolean> => {
    if (!editLockPinHash) return true
    const ok = await verifyPin(pin, editLockPinHash)
    if (ok) {
      setEditing(true)
      setPinPromptOpen(false)
    }
    return ok
  }

  // Editing chrome only applies to Family Hub. Force edit mode off when
  // navigating away so re-entering doesn't leave the user half-state.
  const isFamily = activeScreen === 'family'
  useEffect(() => {
    if (!isFamily && isEditing) setEditing(false)
  }, [isFamily, isEditing, setEditing])

  // Auto-dim after inactivity. Pause when already dimmed so the timer doesn't
  // fire behind the overlay (and we don't restart the timer on the tap-to-wake
  // event — that's what sets dimmed back to false).
  useInactivityTimer(
    autoDimMinutes * 60 * 1000,
    () => setDimmed(true),
    autoDimEnabled && !dimmed
  )

  // Calendar reminders — scan local events twice a minute and fire banners
  // for any that have entered their reminder window.
  useReminderScanner()

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore shortcuts while typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === '?') {
        setShortcutHelpOpen((v) => !v)
      } else if (e.key === 'e' || e.key === 'E') {
        if (isFamily) tryEnterEditMode()
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
  }, [setEditing, queryClient, dimmed, isFamily])

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-primary">
      {/* Header — screen tabs on the left, clock centred. Tabs are absolutely
          positioned so the clock stays geometrically centred regardless of
          how wide the tab bar grows. */}
      <header className="relative flex items-center justify-center py-6 shrink-0">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
          <ScreenTabs />
          {isFamily && <LayoutPresetMenu />}
        </div>
        <Clock />
      </header>

      {/* Main content — routed by activeScreen */}
      <main className="flex-1 px-4 pb-2 overflow-auto min-h-0">
        {activeScreen === 'family' && <FamilyHub />}
        {activeScreen === 'whiteboard' && <Whiteboard />}
        {activeScreen === 'home-automation' && <HomeAutomation />}
      </main>

      {/* Taskbar — clock/status/quick-actions show everywhere; add-widget +
          edit-lock only when on Family Hub. */}
      <footer className="h-14 shrink-0 border-t border-border-subtle bg-bg-secondary/80 backdrop-blur-md flex items-center justify-between px-4 gap-4">
        <StatusCluster />

        <QuickActions
          onDim={() => setDimmed(true)}
          onOpenSettings={() => setAppSettingsOpen(true)}
        />

        <div className="flex items-center gap-1">
          {isFamily && isEditing && (
            <IconButton label="Add widget" onClick={() => setPickerOpen(true)}>
              <Plus size={20} className="text-accent-primary" />
            </IconButton>
          )}
          {isFamily && (
            <IconButton
              label={isEditing ? 'Lock layout' : 'Edit layout'}
              onClick={tryEnterEditMode}
            >
              {isEditing ? (
                <Lock size={18} className="text-accent-warning" />
              ) : (
                <Pencil size={18} />
              )}
            </IconButton>
          )}
        </div>
      </footer>

      {/* Modals */}
      <WidgetPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      <WidgetSettingsModal />
      <AppSettingsModal open={appSettingsOpen} onClose={() => setAppSettingsOpen(false)} />
      <ShortcutHelp open={shortcutHelpOpen} onClose={() => setShortcutHelpOpen(false)} />
      <PinModal
        open={pinPromptOpen}
        title="Enter edit PIN"
        subtitle="Edit mode is locked — enter the 4-digit PIN to unlock"
        onSubmit={handlePinSubmit}
        onCancel={() => setPinPromptOpen(false)}
      />
      <DimOverlay active={dimmed} onWake={() => setDimmed(false)} />
      <UpdateBanner />
      <ReminderBanner />
      <Toaster />
    </div>
  )
}
