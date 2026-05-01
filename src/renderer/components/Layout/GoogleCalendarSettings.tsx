import { useEffect, useState } from 'react'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Spinner } from '../ui/Spinner'
import { toast } from '../../stores/useToastStore'
import {
  useGoogleCalendarStore,
  ACCOUNT_COLORS,
  pickColorForNewAccount
} from '../../stores/useGoogleCalendarStore'

/**
 * Manages Google account connections and which calendars are synced. Lives
 * inside the System tab of the App Settings modal.
 */
export function GoogleCalendarSettings() {
  const selected = useGoogleCalendarStore((s) => s.selected)
  const accountColors = useGoogleCalendarStore((s) => s.accountColors)
  const toggleCalendar = useGoogleCalendarStore((s) => s.toggleCalendar)
  const setAccountColor = useGoogleCalendarStore((s) => s.setAccountColor)
  const removeAccountPrefs = useGoogleCalendarStore((s) => s.removeAccount)

  const [configured, setConfigured] = useState<boolean | null>(null)
  const [accounts, setAccounts] = useState<GoogleAccount[]>([])
  const [calendarsByAccount, setCalendarsByAccount] = useState<Record<string, GoogleCalendarSummary[]>>({})
  const [loadingCalendars, setLoadingCalendars] = useState<Record<string, boolean>>({})
  const [connecting, setConnecting] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState<GoogleAccount | null>(null)

  const api = window.electronAPI?.google

  // Initial load: configured? + which accounts are connected.
  useEffect(() => {
    if (!api) {
      setConfigured(false)
      return
    }
    api.isConfigured().then(setConfigured).catch(() => setConfigured(false))
    api.listAccounts().then(setAccounts).catch(() => setAccounts([]))
  }, [api])

  // Whenever the accounts list changes, fetch each account's calendars
  useEffect(() => {
    if (!api) return
    for (const account of accounts) {
      if (calendarsByAccount[account.email]) continue
      setLoadingCalendars((prev) => ({ ...prev, [account.email]: true }))
      api.listCalendars(account.email)
        .then((res) => {
          if (res.ok) {
            setCalendarsByAccount((prev) => ({ ...prev, [account.email]: res.calendars }))
          } else {
            toast.error(`Couldn't load calendars for ${account.email}`)
          }
        })
        .catch(() => toast.error(`Couldn't load calendars for ${account.email}`))
        .finally(() => setLoadingCalendars((prev) => ({ ...prev, [account.email]: false })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts])

  const handleConnect = async () => {
    if (!api) return
    setConnecting(true)
    try {
      const res = await api.beginAuth()
      if (res.ok) {
        // Assign a default colour if this is the first time we've seen the account
        if (!accountColors[res.account.email]) {
          setAccountColor(res.account.email, pickColorForNewAccount(accountColors))
        }
        // Refresh accounts list (will trigger calendar fetch via the effect above)
        const next = await api.listAccounts()
        setAccounts(next)
        toast.success(`Connected ${res.account.email}`)
      } else {
        toast.error(res.message || 'Connection failed')
      }
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async (account: GoogleAccount) => {
    if (!api) return
    await api.disconnect(account.email)
    removeAccountPrefs(account.email)
    setAccounts((prev) => prev.filter((a) => a.email !== account.email))
    setCalendarsByAccount((prev) => {
      const next = { ...prev }
      delete next[account.email]
      return next
    })
    setConfirmDisconnect(null)
    toast.success(`Disconnected ${account.email}`)
  }

  if (configured === null) {
    return (
      <div className="flex items-center gap-2 text-text-disabled text-xs">
        <Spinner size="sm" /> Checking Google integration…
      </div>
    )
  }

  if (configured === false) {
    return (
      <div className="px-4 py-3 rounded-xl bg-bg-tertiary border border-border-subtle">
        <p className="text-xs text-text-secondary leading-relaxed">
          Google Calendar integration isn't configured. Open
          {' '}<code className="px-1 py-0.5 rounded bg-bg-secondary text-text-primary text-[10px]">src/main/google-auth.ts</code>{' '}
          and paste your Google Cloud OAuth Client ID and Secret, then restart the app.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {accounts.length === 0 && (
          <p className="text-xs text-text-disabled">
            No Google accounts connected yet. Connect an account to pull in their calendar.
          </p>
        )}

        {accounts.map((account) => {
          const calendars = calendarsByAccount[account.email] ?? []
          const enabledIds = selected[account.email] ?? []
          const colour = accountColors[account.email] ?? ACCOUNT_COLORS[0]
          const isLoading = loadingCalendars[account.email]

          return (
            <div
              key={account.email}
              className="rounded-xl border border-border-subtle bg-bg-tertiary overflow-hidden"
            >
              {/* Header row: name + colour swatch + disconnect */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle/60">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: colour }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{account.name}</p>
                  <p className="text-[10px] text-text-disabled truncate">{account.email}</p>
                </div>
                <button
                  onClick={() => setConfirmDisconnect(account)}
                  className="p-1.5 rounded-lg text-text-disabled hover:text-accent-danger hover:bg-accent-danger/10 transition-colors touch-manipulation"
                  aria-label="Disconnect account"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Colour picker */}
              <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border-subtle/40">
                <span className="text-[10px] uppercase tracking-wider text-text-disabled mr-1">
                  Colour
                </span>
                {ACCOUNT_COLORS.map((c) => {
                  const active = c === colour
                  return (
                    <button
                      key={c}
                      onClick={() => setAccountColor(account.email, c)}
                      className={`w-5 h-5 rounded-full transition-all touch-manipulation ${
                        active ? 'ring-2 ring-offset-2 ring-offset-bg-tertiary ring-white/40 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Set colour ${c}`}
                    />
                  )
                })}
              </div>

              {/* Calendars list */}
              <div className="px-2 py-2">
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-text-disabled px-2 py-2">
                    <RefreshCw size={12} className="animate-spin" />
                    Loading calendars…
                  </div>
                )}
                {!isLoading && calendars.length === 0 && (
                  <p className="text-xs text-text-disabled px-2 py-2">No calendars accessible.</p>
                )}
                {calendars.map((cal) => {
                  const enabled = enabledIds.includes(cal.id)
                  return (
                    <button
                      key={cal.id}
                      onClick={() => toggleCalendar(account.email, cal.id)}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all touch-manipulation ${
                        enabled ? 'bg-accent-primary/10' : 'hover:bg-bg-hover'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          enabled
                            ? 'bg-accent-primary border-accent-primary text-bg-primary'
                            : 'border-border-subtle'
                        }`}
                      >
                        {enabled ? '✓' : ''}
                      </div>
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cal.backgroundColor || colour }}
                      />
                      <span className="text-sm text-text-primary truncate flex-1 min-w-0">
                        {cal.summary}
                        {cal.primary && (
                          <span className="ml-1.5 text-[9px] uppercase tracking-wider text-text-disabled">
                            primary
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        <Button variant="ghost" onClick={handleConnect} disabled={connecting}>
          <span className="flex items-center justify-center gap-1.5">
            <Plus size={14} />
            {connecting ? 'Waiting for browser…' : 'Connect Google account'}
          </span>
        </Button>

        <p className="text-[10px] text-text-disabled">
          Read-only — events from connected calendars appear on the day planner alongside local
          events. Edit or remove them in Google Calendar; the wall display reflects changes within
          ~10 minutes.
        </p>
      </div>

      <ConfirmDialog
        open={confirmDisconnect !== null}
        title={`Disconnect ${confirmDisconnect?.email}?`}
        message="The refresh token will be removed and events from this account will stop appearing. You can reconnect at any time."
        confirmLabel="Disconnect"
        onConfirm={() => confirmDisconnect && handleDisconnect(confirmDisconnect)}
        onCancel={() => setConfirmDisconnect(null)}
      />
    </>
  )
}
