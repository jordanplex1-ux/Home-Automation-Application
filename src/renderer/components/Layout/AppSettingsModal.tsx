import { useEffect, useState } from 'react'
import { Palette, Monitor, Cog, Info, Activity } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useAppSettingsStore, ACCENT_PRESETS } from '../../stores/useAppSettingsStore'
import { useWidgetStore } from '../../stores/useWidgetStore'
import { toast } from '../../stores/useToastStore'
import { GoogleCalendarSettings } from './GoogleCalendarSettings'
import { DevPanel } from './DevPanel'
import { EditLockSettings } from './EditLockSettings'
import { LayoutPresetManager } from './LayoutPresetManager'
import { RingSettings } from './RingSettings'
import { HomeAssistantSettings } from './HomeAssistantSettings'
import { RELEASE_NOTES } from '../../data/releaseNotes'

interface AppSettingsModalProps {
  open: boolean
  onClose: () => void
}

type TabId = 'general' | 'display' | 'system' | 'dev' | 'about'

const TABS: { id: TabId; label: string; icon: typeof Palette }[] = [
  { id: 'general', label: 'General', icon: Palette },
  { id: 'display', label: 'Display', icon: Monitor },
  { id: 'system', label: 'System', icon: Cog },
  { id: 'dev',     label: 'Dev',     icon: Activity },
  { id: 'about',   label: 'About',   icon: Info }
]

export function AppSettingsModal({ open, onClose }: AppSettingsModalProps) {
  const [tab, setTab] = useState<TabId>('general')

  // Display settings
  const accentName = useAppSettingsStore((s) => s.accentName)
  const setAccent = useAppSettingsStore((s) => s.setAccent)
  const autoDimEnabled = useAppSettingsStore((s) => s.autoDimEnabled)
  const autoDimMinutes = useAppSettingsStore((s) => s.autoDimMinutes)
  const burnInProtection = useAppSettingsStore((s) => s.burnInProtection)
  const setAutoDimEnabled = useAppSettingsStore((s) => s.setAutoDimEnabled)
  const setAutoDimMinutes = useAppSettingsStore((s) => s.setAutoDimMinutes)
  const setBurnInProtection = useAppSettingsStore((s) => s.setBurnInProtection)
  const photoFrameEnabled = useAppSettingsStore((s) => s.photoFrameEnabled)
  const photoFrameFolder = useAppSettingsStore((s) => s.photoFrameFolder)
  const photoFrameIntervalSec = useAppSettingsStore((s) => s.photoFrameIntervalSec)
  const setPhotoFrameEnabled = useAppSettingsStore((s) => s.setPhotoFrameEnabled)
  const setPhotoFrameFolder = useAppSettingsStore((s) => s.setPhotoFrameFolder)
  const setPhotoFrameIntervalSec = useAppSettingsStore((s) => s.setPhotoFrameIntervalSec)

  const instances = useWidgetStore((s) => s.instances)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [autostart, setAutostart] = useState<boolean | null>(null)
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null)
  const [backingUp, setBackingUp] = useState(false)
  const [photoCount, setPhotoCount] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    const api = window.electronAPI?.autostart
    if (api?.get) api.get().then(setAutostart).catch(() => setAutostart(null))
    const bapi = window.electronAPI?.backup
    if (bapi?.getSchedule) bapi.getSchedule().then(setSchedule).catch(() => setSchedule(null))
  }, [open])

  // Keep a live count of photos in the chosen folder for quick feedback
  useEffect(() => {
    if (!open) return
    const api = window.electronAPI?.photos
    if (!api || !photoFrameFolder) { setPhotoCount(null); return }
    api.list(photoFrameFolder).then((list) => setPhotoCount(list.length)).catch(() => setPhotoCount(null))
  }, [open, photoFrameFolder])

  // ---------- Handlers ----------
  const handleExport = async () => {
    const api = window.electronAPI?.backup
    if (!api) { toast.error('Backup not available'); return }
    setBackingUp(true)
    try {
      const res = await api.export()
      if (res.ok) toast.success('Backup saved')
      else if (!res.cancelled) toast.error('Backup failed')
    } catch {
      toast.error('Backup failed')
    } finally {
      setBackingUp(false)
    }
  }

  const handleRestoreConfirmed = async () => {
    setConfirmRestore(false)
    const api = window.electronAPI?.backup
    if (!api) { toast.error('Backup not available'); return }
    try {
      const res = await api.restore()
      if (res.ok) {
        toast.success('Backup restored — reloading')
        setTimeout(() => window.location.reload(), 600)
      } else if (!res.cancelled) {
        toast.error('Restore failed')
      }
    } catch {
      toast.error('Restore failed — invalid file?')
    }
  }

  const handleToggleSchedule = async () => {
    const api = window.electronAPI?.backup
    if (!api || !schedule) return
    if (!schedule.enabled && !schedule.folder) {
      const folder = await api.pickFolder()
      if (!folder) return
      const next = await api.setSchedule({ enabled: true, folder })
      setSchedule(next)
      toast.success('Scheduled backups enabled')
      return
    }
    const next = await api.setSchedule({ enabled: !schedule.enabled })
    setSchedule(next)
    toast.success(next.enabled ? 'Scheduled backups enabled' : 'Scheduled backups disabled')
  }

  const handleChangeFrequency = async (frequency: 'daily' | 'weekly') => {
    const api = window.electronAPI?.backup
    if (!api) return
    const next = await api.setSchedule({ frequency })
    setSchedule(next)
  }

  const handlePickBackupFolder = async () => {
    const api = window.electronAPI?.backup
    if (!api) return
    const folder = await api.pickFolder()
    if (!folder) return
    const next = await api.setSchedule({ folder })
    setSchedule(next)
  }

  const handlePickPhotoFolder = async () => {
    const api = window.electronAPI?.photos
    if (!api) { toast.error('Photo picker not available'); return }
    const folder = await api.pickFolder()
    if (!folder) return
    setPhotoFrameFolder(folder)
    const list = await api.list(folder)
    setPhotoCount(list.length)
    if (list.length === 0) toast.error('No images found in that folder')
    else toast.success(`${list.length} photos found`)
  }

  const handleTogglePhotoFrame = async () => {
    // Turning on without a folder? Prompt first.
    if (!photoFrameEnabled && !photoFrameFolder) {
      await handlePickPhotoFolder()
      // Only enable if a folder was picked
      if (useAppSettingsStore.getState().photoFrameFolder) {
        setPhotoFrameEnabled(true)
      }
      return
    }
    setPhotoFrameEnabled(!photoFrameEnabled)
  }

  const handleToggleAutostart = async () => {
    const api = window.electronAPI?.autostart
    if (!api?.set) return
    const next = !autostart
    const result = await api.set(next)
    setAutostart(result)
    toast.success(result ? 'Auto-start enabled' : 'Auto-start disabled')
  }

  const handleResetLayout = () => {
    useWidgetStore.setState({
      instances: instances.map((i, idx) => ({
        ...i,
        layout: { x: (idx * 4) % 12, y: Math.floor(idx / 3) * 3, w: 4, h: 3 }
      }))
    })
    setConfirmReset(false)
    toast.success('Layout reset')
  }

  const handleClearAll = async () => {
    useWidgetStore.setState({ instances: [] })
    if (window.electronAPI?.store?.delete) {
      await window.electronAPI.store.delete('widget-store').catch(() => {})
    } else {
      localStorage.removeItem('widget-store')
    }
    setConfirmClear(false)
    onClose()
    toast.success('All data cleared')
  }

  // ---------- Render ----------
  return (
    <>
      <Modal open={open} onClose={onClose} title="App Settings">
        {/* Tab bar */}
        <div className="flex gap-1 mb-5 -mt-1 pb-3 border-b border-border-subtle">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = t.id === tab
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all touch-manipulation ${
                  active
                    ? 'bg-accent-primary/15 text-accent-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {tab === 'general' && (
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
                Accent Colour
              </label>
              <div className="flex gap-2 flex-wrap">
                {ACCENT_PRESETS.map((preset) => {
                  const active = preset.name === accentName
                  return (
                    <button
                      key={preset.name}
                      onClick={() => setAccent(preset.name)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all touch-manipulation ${
                        active ? 'bg-bg-hover ring-1 ring-accent-primary/40' : 'hover:bg-bg-hover/50'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, ${preset.primary}, ${preset.secondary})`,
                          boxShadow: active ? `0 0 16px ${preset.primary}80` : 'none'
                        }}
                      />
                      <span className="text-[10px] text-text-secondary">{preset.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'display' && (
          <div className="flex flex-col gap-5">
            {/* Auto-dim */}
            <div>
              <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
                Auto-dim
              </label>
              <div className="flex flex-col gap-2">
                <ToggleRow
                  title="Auto-dim when idle"
                  subtitle="Fade to a drifting clock after no input"
                  value={autoDimEnabled}
                  onChange={setAutoDimEnabled}
                />

                {autoDimEnabled && (
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle">
                    <label htmlFor="auto-dim-min" className="text-sm text-text-primary flex-1">
                      Dim after
                    </label>
                    <input
                      id="auto-dim-min"
                      type="number"
                      min={1}
                      max={60}
                      value={autoDimMinutes}
                      onChange={(e) => setAutoDimMinutes(parseInt(e.target.value) || 10)}
                      className="w-16 px-2 py-1 rounded-lg bg-bg-secondary border border-border-subtle text-text-primary text-sm text-center outline-none focus:border-accent-primary/50 [color-scheme:dark]"
                    />
                    <span className="text-xs text-text-secondary">min</span>
                  </div>
                )}

                <ToggleRow
                  title="Burn-in protection"
                  subtitle="Slowly shifts the screen by a pixel or two to stop static UI leaving marks"
                  value={burnInProtection}
                  onChange={setBurnInProtection}
                />
              </div>
            </div>

            {/* Photo frame */}
            <div>
              <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
                Photo Frame
              </label>
                <div className="flex flex-col gap-2">
                  <ToggleRow
                    title="Use photo frame while dimmed"
                    subtitle="Rotate through images from a chosen folder instead of the drifting clock"
                    value={photoFrameEnabled}
                    onChange={handleTogglePhotoFrame}
                  />

                  {photoFrameEnabled && (
                    <>
                      <button
                        onClick={handlePickPhotoFolder}
                        className="text-left px-4 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle hover:bg-bg-hover transition-colors touch-manipulation"
                      >
                        <p className="text-[10px] text-text-disabled uppercase tracking-wider">
                          Photo folder
                        </p>
                        <p className="text-xs text-text-primary truncate">
                          {photoFrameFolder || 'Click to choose…'}
                        </p>
                        {photoCount !== null && photoFrameFolder && (
                          <p className="text-[10px] text-text-disabled mt-0.5">
                            {photoCount} image{photoCount === 1 ? '' : 's'} found
                          </p>
                        )}
                      </button>

                      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle">
                        <label htmlFor="photo-interval" className="text-sm text-text-primary flex-1">
                          Change every
                        </label>
                        <input
                          id="photo-interval"
                          type="number"
                          min={5}
                          max={600}
                          value={photoFrameIntervalSec}
                          onChange={(e) => setPhotoFrameIntervalSec(parseInt(e.target.value) || 30)}
                          className="w-20 px-2 py-1 rounded-lg bg-bg-secondary border border-border-subtle text-text-primary text-sm text-center outline-none focus:border-accent-primary/50 [color-scheme:dark]"
                        />
                        <span className="text-xs text-text-secondary">sec</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
          </div>
        )}

        {tab === 'system' && (
          <div className="flex flex-col gap-5">
            {/* Startup */}
            {autostart !== null && (
              <div>
                <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
                  Startup
                </label>
                <ToggleRow
                  title="Launch on Windows startup"
                  subtitle="Automatically open Home Planner when you log in"
                  value={autostart}
                  onChange={handleToggleAutostart}
                />
              </div>
            )}

            {/* Edit lock */}
            <div>
              <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
                Edit Lock
              </label>
              <EditLockSettings />
            </div>

            {/* Google Calendar */}
            <div>
              <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
                Google Calendar
              </label>
              <GoogleCalendarSettings />
            </div>

            {/* Home Assistant */}
            <div>
              <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
                Home Assistant
              </label>
              <HomeAssistantSettings />
            </div>

            {/* Ring cameras */}
            <div>
              <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
                Ring Cameras
              </label>
              <RingSettings />
            </div>

            {/* Backup */}
            <div>
              <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
                Backup &amp; Restore
              </label>
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" onClick={handleExport} disabled={backingUp}>
                    {backingUp ? 'Backing up…' : 'Backup config now'}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmRestore(true)}>
                    Restore from backup…
                  </Button>

                  {schedule && (
                    <div className="mt-2 flex flex-col gap-2 p-3 rounded-xl bg-bg-tertiary border border-border-subtle">
                      <ToggleRow
                        title="Scheduled backups"
                        subtitle="Automatically save a copy on a schedule"
                        value={schedule.enabled}
                        onChange={handleToggleSchedule}
                        flat
                      />

                      {schedule.enabled && (
                        <>
                          <div className="flex gap-1.5 mt-1">
                            {(['daily', 'weekly'] as const).map((freq) => (
                              <button
                                key={freq}
                                onClick={() => handleChangeFrequency(freq)}
                                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all touch-manipulation ${
                                  schedule.frequency === freq
                                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                                    : 'bg-bg-secondary text-text-secondary border border-border-subtle hover:bg-bg-hover'
                                }`}
                              >
                                {freq}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={handlePickBackupFolder}
                            className="text-left px-3 py-2 rounded-lg bg-bg-secondary border border-border-subtle hover:bg-bg-hover transition-colors touch-manipulation"
                          >
                            <p className="text-[10px] text-text-disabled uppercase tracking-wider">Folder</p>
                            <p className="text-xs text-text-primary truncate">
                              {schedule.folder || 'Click to choose…'}
                            </p>
                          </button>
                          {schedule.lastBackupISO && (
                            <p className="text-[10px] text-text-disabled">
                              Last backup: {new Date(schedule.lastBackupISO).toLocaleString()}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

            {/* Updates */}
            {window.electronAPI?.updater && (
              <div>
                <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
                  Updates
                </label>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    const res = await window.electronAPI.updater.check()
                    if (!res.ok) toast.error(res.message || 'Update check failed')
                    else if (res.version) toast.success(`Update v${res.version} available`)
                    else toast.success('You\u2019re up to date')
                  }}
                >
                  Check for updates
                </Button>
              </div>
            )}

            {/* Layout presets */}
            <div>
              <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
                Layout Presets
              </label>
              <LayoutPresetManager />
            </div>

            {/* Layout */}
            <div>
              <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
                Layout
              </label>
              <div className="flex flex-col gap-2">
                <Button variant="ghost" onClick={() => setConfirmReset(true)}>
                  Reset widget layout
                </Button>
                <Button variant="danger" onClick={() => setConfirmClear(true)}>
                  Clear all widgets &amp; settings
                </Button>
              </div>
            </div>
          </div>
        )}

        {tab === 'dev' && <DevPanel />}

        {tab === 'about' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-xs text-text-disabled">
              <p className="text-sm text-text-primary font-medium">
                Home Planner v{__APP_VERSION__}
              </p>
              <p>Built for wall-mounted touchscreens.</p>
              <p>
                Press{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary">
                  Shift
                </kbd>{' '}
                +{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary">
                  ?
                </kbd>{' '}
                to see keyboard shortcuts.
              </p>
            </div>

            <div>
              <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
                Release Notes
              </label>
              {/* Capped height so the release-notes list scrolls inside the
                  About tab rather than ballooning the whole modal. */}
              <div className="max-h-[40vh] overflow-y-auto rounded-xl bg-bg-tertiary border border-border-subtle p-3 flex flex-col gap-4">
                {RELEASE_NOTES.map((release, idx) => (
                  <div key={release.version}>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span
                        className={`text-sm font-medium ${
                          idx === 0 ? 'text-accent-primary' : 'text-text-primary'
                        }`}
                      >
                        v{release.version}
                      </span>
                      <span className="text-[10px] text-text-disabled tabular-nums">
                        {release.date}
                      </span>
                      {idx === 0 && (
                        <span className="ml-auto text-[9px] uppercase tracking-wider text-accent-primary/80">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {release.sections.map((section) => (
                        <div key={section.title}>
                          <p className="text-[10px] uppercase tracking-wider text-text-disabled mb-1">
                            {section.title}
                          </p>
                          <ul className="flex flex-col gap-1">
                            {section.items.map((item, i) => (
                              <li
                                key={i}
                                className="text-xs text-text-secondary leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-text-disabled"
                              >
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    {idx < RELEASE_NOTES.length - 1 && (
                      <div className="mt-4 border-t border-border-subtle/60" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmReset}
        title="Reset layout?"
        message="This will rearrange all your widgets back to a default grid. Their settings will be kept."
        confirmLabel="Reset layout"
        variant="primary"
        onConfirm={handleResetLayout}
        onCancel={() => setConfirmReset(false)}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Clear everything?"
        message="This removes all widgets and their saved settings. This cannot be undone."
        confirmLabel="Clear all"
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClear(false)}
      />

      <ConfirmDialog
        open={confirmRestore}
        title="Restore backup?"
        message="This replaces ALL current widgets, events, and settings with those from the backup file. Your current data will be lost unless you back up first."
        confirmLabel="Choose file…"
        onConfirm={handleRestoreConfirmed}
        onCancel={() => setConfirmRestore(false)}
      />
    </>
  )
}

// ---------- Small toggle-row primitive ----------

interface ToggleRowProps {
  title: string
  subtitle?: string
  value: boolean
  onChange: (next: boolean) => void
  flat?: boolean // omit the outer card chrome (used inside other cards)
}

function ToggleRow({ title, subtitle, value, onChange, flat }: ToggleRowProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-full flex items-center justify-between touch-manipulation transition-colors ${
        flat
          ? ''
          : 'px-4 py-3 rounded-xl bg-bg-tertiary border border-border-subtle hover:bg-bg-hover'
      }`}
    >
      <div className="text-left">
        <p className="text-sm text-text-primary">{title}</p>
        {subtitle && <p className="text-[10px] text-text-disabled mt-0.5">{subtitle}</p>}
      </div>
      <div
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
          value ? 'bg-accent-primary' : 'bg-bg-hover'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  )
}
