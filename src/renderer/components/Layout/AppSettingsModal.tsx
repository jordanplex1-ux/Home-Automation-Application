import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useAppSettingsStore, ACCENT_PRESETS } from '../../stores/useAppSettingsStore'
import { useWidgetStore } from '../../stores/useWidgetStore'
import { toast } from '../../stores/useToastStore'

interface AppSettingsModalProps {
  open: boolean
  onClose: () => void
}

export function AppSettingsModal({ open, onClose }: AppSettingsModalProps) {
  const accentName = useAppSettingsStore((s) => s.accentName)
  const setAccent = useAppSettingsStore((s) => s.setAccent)
  const instances = useWidgetStore((s) => s.instances)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [autostart, setAutostart] = useState<boolean | null>(null)
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null)
  const [backingUp, setBackingUp] = useState(false)

  useEffect(() => {
    if (!open) return
    const api = window.electronAPI?.autostart
    if (api?.get) {
      api.get().then(setAutostart).catch(() => setAutostart(null))
    }
    const bapi = window.electronAPI?.backup
    if (bapi?.getSchedule) {
      bapi.getSchedule().then(setSchedule).catch(() => setSchedule(null))
    }
  }, [open])

  const handleExport = async () => {
    const api = window.electronAPI?.backup
    if (!api) { toast.error('Backup not available'); return }
    setBackingUp(true)
    try {
      const res = await api.export()
      if (res.ok) toast.success(`Backup saved`)
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
    // If turning on without a folder, prompt for one first
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

  const handlePickFolder = async () => {
    const api = window.electronAPI?.backup
    if (!api) return
    const folder = await api.pickFolder()
    if (!folder) return
    const next = await api.setSchedule({ folder })
    setSchedule(next)
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

  return (
    <>
      <Modal open={open} onClose={onClose} title="App Settings">
        <div className="flex flex-col gap-5">
          {/* Accent colour */}
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

          {/* Startup */}
          {autostart !== null && (
            <div>
              <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
                Startup
              </label>
              <button
                onClick={handleToggleAutostart}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-bg-tertiary border border-border-subtle hover:bg-bg-hover transition-colors touch-manipulation"
              >
                <div className="text-left">
                  <p className="text-sm text-text-primary">Launch on Windows startup</p>
                  <p className="text-[10px] text-text-disabled mt-0.5">
                    Automatically open Home Planner when you log in
                  </p>
                </div>
                <div
                  className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                    autostart ? 'bg-accent-primary' : 'bg-bg-hover'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      autostart ? 'translate-x-[18px]' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </button>
            </div>
          )}

          {/* Backup & Restore */}
          {window.electronAPI?.backup && (
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
                    <button
                      onClick={handleToggleSchedule}
                      className="w-full flex items-center justify-between touch-manipulation"
                    >
                      <div className="text-left">
                        <p className="text-sm text-text-primary">Scheduled backups</p>
                        <p className="text-[10px] text-text-disabled mt-0.5">
                          Automatically save a copy on a schedule
                        </p>
                      </div>
                      <div
                        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                          schedule.enabled ? 'bg-accent-primary' : 'bg-bg-hover'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            schedule.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </button>

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
                          onClick={handlePickFolder}
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
          )}

          {/* Layout actions */}
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

          {/* About */}
          <div>
            <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
              About
            </label>
            <div className="text-xs text-text-disabled space-y-1">
              <p>Home Planner v0.1.1</p>
              <p>Built for wall-mounted touchscreens</p>
              <p>Press <kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary">?</kbd> for keyboard shortcuts</p>
            </div>
          </div>
        </div>
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
