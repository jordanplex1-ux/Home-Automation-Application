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
import { useHaBridge } from '../../hooks/useHaBridge'
import { ReminderBanner } from './ReminderBanner'
import { DoorbellPopup, type CameraAlert } from './DoorbellPopup'
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
  const [cameraAlert, setCameraAlert] = useState<CameraAlert | null>(null)

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

  // Keep the Home Assistant entity store in sync with the main-process
  // WebSocket connection, app-wide (not just on the Home Automation screen).
  useHaBridge()

  // Ring alerts — a doorbell press always takes over the screen with the live
  // feed (regardless of active screen or dim state). Motion does the same only
  // when the user has opted into motion alerts. Read the latest setting from
  // the store inside the handler so toggling it doesn't require re-subscribing.
  useEffect(() => {
    const off = window.electronAPI?.ring?.onEvent((event) => {
      if (event.kind === 'motion' && !useAppSettingsStore.getState().ringMotionAlerts) return
      setDimmed(false) // wake the display so the feed is visible
      setCameraAlert({ id: event.cameraId, name: event.cameraName, kind: event.kind })
    })
    return off
  }, [])

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
      {/* Header — clock on top (centred, prominent), screen tabs on the row
          below. Stacking keeps the clock dead-centre on the narrow portrait
          wall panel without the tabs ever colliding with it. */}
      <header className="flex flex-col items-center gap-2 py-3 px-2 shrink-0">
        <Clock />
        <div className="flex items-center gap-2">
          <ScreenTabs />
          {isFamily && <LayoutPresetMenu />}
        </div>
      </header>

      {/* Main content — routed by activeScreen */}
      <main className="flex-1 px-2 pb-2 overflow-auto min-h-0">
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
      <DoorbellPopup alert={cameraAlert} onClose={() => setCameraAlert(null)} />
      <Toaster />
    </div>
  )
}
