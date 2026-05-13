import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { useWidgetStore } from '../../stores/useWidgetStore'
import { useAppSettingsStore } from '../../stores/useAppSettingsStore'
import { useGoogleCalendarStore } from '../../stores/useGoogleCalendarStore'
import { toast } from '../../stores/useToastStore'

/**
 * Health / diagnostics screen for the App Settings modal. Shows what's
 * running, what the updater thinks, last backup, query cache state, and an
 * easy "copy debug info" for bug reports.
 */
export function DevPanel() {
  const queryClient = useQueryClient()

  const widgets = useWidgetStore((s) => s.instances)
  const activeScreen = useAppSettingsStore((s) => s.activeScreen)
  const accentName = useAppSettingsStore((s) => s.accentName)
  const googleSelected = useGoogleCalendarStore((s) => s.selected)

  const [updaterStatus, setUpdaterStatus] = useState<UpdateStatus | null>(null)
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null)
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null)
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([])
  const [tick, setTick] = useState(0)

  // Subscribe to updater status events
  useEffect(() => {
    const off = window.electronAPI?.updater?.onStatus?.((s) => setUpdaterStatus(s))
    return off
  }, [])

  // Periodic refresh for the cache-size readout
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 5000)
    return () => window.clearInterval(id)
  }, [])

  // One-shot loads
  useEffect(() => {
    window.electronAPI?.backup?.getSchedule?.()
      .then(setSchedule).catch(() => setSchedule(null))
    window.electronAPI?.google?.isConfigured?.()
      .then(setGoogleConfigured).catch(() => setGoogleConfigured(false))
    window.electronAPI?.google?.listAccounts?.()
      .then(setGoogleAccounts).catch(() => setGoogleAccounts([]))
  }, [])

  const cache = queryClient.getQueryCache().getAll()
  const cacheStats = {
    total: cache.length,
    fetching: cache.filter((q) => q.state.fetchStatus === 'fetching').length,
    errored: cache.filter((q) => q.state.status === 'error').length,
    stale: cache.filter((q) => q.isStale()).length
  }

  const handleCopyDebugInfo = async () => {
    const lines = [
      `Home Planner v${__APP_VERSION__}`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `Active screen: ${activeScreen}`,
      `Accent: ${accentName}`,
      `Widgets: ${widgets.length}`,
      ...widgets.map((w) => `  • ${w.widgetId}  id=${w.instanceId}`),
      ``,
      `Updater status: ${updaterStatus?.kind ?? 'unknown'}`,
      schedule ? `Last backup: ${schedule.lastBackupISO ?? 'never'}` : `Backup schedule: unavailable`,
      `Backup folder: ${schedule?.folder ?? '(none)'}`,
      ``,
      `Google configured: ${googleConfigured ?? '?'}`,
      `Google accounts: ${googleAccounts.length}`,
      ...googleAccounts.map((a) => {
        const sel = googleSelected[a.email]?.length ?? 0
        return `  • ${a.email}  (${sel} calendar${sel === 1 ? '' : 's'} selected)`
      }),
      ``,
      `Query cache:`,
      `  total: ${cacheStats.total}`,
      `  fetching: ${cacheStats.fetching}`,
      `  errored: ${cacheStats.errored}`,
      `  stale: ${cacheStats.stale}`,
      ``,
      `User agent: ${navigator.userAgent}`,
      `Platform: ${navigator.platform}`,
      `Viewport: ${window.innerWidth}×${window.innerHeight}`
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      toast.success('Debug info copied to clipboard')
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  const handleInvalidateAll = () => {
    queryClient.invalidateQueries()
    toast.success('All queries invalidated')
  }

  return (
    <div className="flex flex-col gap-5">
      {/* App + build */}
      <Section title="App">
        <Row label="Version" value={`v${__APP_VERSION__}`} mono />
        <Row label="Active screen" value={activeScreen} />
        <Row label="Accent" value={accentName} />
        <Row label="Widgets on Family Hub" value={widgets.length.toString()} />
      </Section>

      {/* Updater */}
      <Section title="Updater">
        <Row label="Status" value={describeUpdater(updaterStatus)} />
        {updaterStatus?.kind === 'downloading' && (
          <Row label="Progress" value={`${Math.round(updaterStatus.percent)}%`} />
        )}
        {updaterStatus?.kind === 'downloaded' && (
          <Row label="Pending install" value={updaterStatus.version} mono />
        )}
        {updaterStatus?.kind === 'error' && (
          <Row label="Error" value={updaterStatus.message} mono />
        )}
      </Section>

      {/* Backup */}
      <Section title="Backup">
        <Row label="Scheduled" value={schedule?.enabled ? `Yes (${schedule.frequency})` : 'No'} />
        <Row label="Last backup" value={schedule?.lastBackupISO ? new Date(schedule.lastBackupISO).toLocaleString() : 'Never'} />
        <Row label="Folder" value={schedule?.folder ?? '(not set)'} mono />
      </Section>

      {/* Google */}
      <Section title="Google Calendar">
        <Row label="OAuth configured" value={googleConfigured ? 'Yes' : 'No'} />
        <Row label="Connected accounts" value={googleAccounts.length.toString()} />
        {googleAccounts.map((a) => {
          const sel = googleSelected[a.email]?.length ?? 0
          return (
            <Row
              key={a.email}
              label={a.email}
              value={`${sel} calendar${sel === 1 ? '' : 's'} synced`}
              mono
            />
          )
        })}
      </Section>

      {/* Query cache */}
      <Section title={`Query cache (refreshed live · tick ${tick})`}>
        <Row label="Total queries" value={cacheStats.total.toString()} />
        <Row label="Currently fetching" value={cacheStats.fetching.toString()} />
        <Row label="Errored" value={cacheStats.errored.toString()} />
        <Row label="Stale" value={cacheStats.stale.toString()} />
        <div className="pt-2">
          <Button variant="ghost" onClick={handleInvalidateAll}>
            <span className="flex items-center justify-center gap-1.5">
              <RefreshCw size={14} />
              Invalidate all queries
            </span>
          </Button>
        </div>
      </Section>

      {/* Copy out */}
      <div>
        <Button variant="ghost" onClick={handleCopyDebugInfo}>
          <span className="flex items-center justify-center gap-1.5">
            <Copy size={14} />
            Copy debug info
          </span>
        </Button>
        <p className="text-[10px] text-text-disabled mt-1.5">
          Paste into a bug report so we know exactly what state the app is in.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small inline UI
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-text-secondary mb-2 block uppercase tracking-wider">
        {title}
      </label>
      <div className="rounded-xl bg-bg-tertiary border border-border-subtle p-3 flex flex-col gap-1.5">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-text-secondary shrink-0">{label}</span>
      <span
        className={`text-text-primary text-right break-all ${
          mono ? 'font-mono text-[11px]' : ''
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function describeUpdater(status: UpdateStatus | null): string {
  if (!status) return 'Idle'
  switch (status.kind) {
    case 'checking':       return 'Checking for updates…'
    case 'available':      return `Update available: v${status.version}`
    case 'not-available':  return 'Up to date'
    case 'downloading':    return `Downloading (${Math.round(status.percent)}%)`
    case 'downloaded':     return `Downloaded v${status.version} — ready to install`
    case 'error':          return `Error: ${status.message}`
  }
}
