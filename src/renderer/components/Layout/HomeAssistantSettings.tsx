import { useEffect, useMemo, useState } from 'react'
import { Home, Trash2, PlugZap, Search, Check, AlertTriangle } from 'lucide-react'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useHaStore } from '../../stores/useHaStore'
import { toast } from '../../stores/useToastStore'

/**
 * Home Assistant connection + entity selection. Lives in the System tab.
 *
 * HA is the hub for every smart-home device; this panel is where the wall
 * panel is pointed at it and told which entities to surface.
 */
export function HomeAssistantSettings() {
  const status = useHaStore((s) => s.status)

  const [config, setConfig] = useState<HaConfig | null>(null)
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  // Shown inline as well as via toast — a toast alone is easy to miss.
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  // Entity picker
  const [entities, setEntities] = useState<HaEntitySummary[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const api = window.electronAPI?.homeAssistant

  useEffect(() => {
    if (!api) return
    api.getConfig()
      .then((c) => {
        setConfig(c)
        setUrl(c.url ?? '')
        setSelected(c.entityIds)
      })
      .catch(() => setConfig(null))
  }, [api])

  // Refresh the entity list whenever we're connected and the picker is open.
  useEffect(() => {
    if (!api || !pickerOpen || status.state !== 'connected') return
    api.listEntities().then(setEntities).catch(() => setEntities([]))
  }, [api, pickerOpen, status.state])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? entities.filter(
          (e) => e.name.toLowerCase().includes(q) || e.entity_id.toLowerCase().includes(q)
        )
      : entities
    // Cap the rendered list — a busy HA can have hundreds of entities and the
    // wall panel doesn't need to paint them all at once.
    return list.slice(0, 200)
  }, [entities, query])

  if (!api) {
    return (
      <p className="text-xs text-text-disabled">
        Home Assistant integration isn’t available in this build.
      </p>
    )
  }

  const handleTest = async () => {
    if (!url.trim()) {
      setResult({ ok: false, message: 'Enter your Home Assistant URL first.' })
      return
    }
    if (!token && !config?.hasToken) {
      setResult({ ok: false, message: 'Paste a long-lived access token first.' })
      return
    }
    setTesting(true)
    setResult(null)
    try {
      const res = await api.testConnection(url.trim(), token || undefined)
      const message = res.ok
        ? `Connected to Home Assistant ${res.haVersion ?? ''}`.trim()
        : res.message || 'Connection failed'
      setResult({ ok: res.ok, message })
      if (res.ok) toast.success(message)
      else toast.error(message)
    } catch (err) {
      const message = (err as Error).message
      setResult({ ok: false, message })
      toast.error(message)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!url.trim()) {
      setResult({ ok: false, message: 'Enter your Home Assistant URL first.' })
      return
    }
    if (!token && !config?.hasToken) {
      setResult({ ok: false, message: 'Paste a long-lived access token first.' })
      return
    }
    setSaving(true)
    setResult(null)
    try {
      await api.setConfig({
        url: url.trim(),
        ...(token ? { token } : {})
      })
      setToken('') // don't keep the secret in component state
      const c = await api.getConfig()
      setConfig(c)
      setResult({ ok: true, message: 'Saved — connecting to Home Assistant…' })
      toast.success('Home Assistant settings saved')
    } catch (err) {
      const message = (err as Error).message
      setResult({ ok: false, message })
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    await api.disconnect()
    setConfirmDisconnect(false)
    setConfig({ url: null, hasToken: false, entityIds: [] })
    setUrl('')
    setToken('')
    setSelected([])
    useHaStore.getState().reset()
    toast.success('Home Assistant disconnected')
  }

  const toggleEntity = async (entityId: string) => {
    const next = selected.includes(entityId)
      ? selected.filter((id) => id !== entityId)
      : [...selected, entityId]
    setSelected(next)
    await api.setConfig({ entityIds: next })
  }

  const statusLabel =
    status.state === 'connected' ? `Connected${status.haVersion ? ` · HA ${status.haVersion}` : ''}`
    : status.state === 'connecting' ? 'Connecting…'
    : status.state === 'error' ? 'Error'
    : config?.hasToken ? 'Disconnected — retrying' : 'Not configured'

  const statusColour =
    status.state === 'connected' ? 'text-accent-success'
    : status.state === 'error' ? 'text-accent-danger'
    : 'text-text-disabled'

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Status */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-bg-tertiary border border-border-subtle">
          <Home size={16} className={`shrink-0 ${statusColour}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${statusColour}`}>{statusLabel}</p>
            <p className="text-[10px] text-text-disabled truncate">
              {status.error
                ? status.error
                : status.state === 'connected'
                ? `${status.entityCount} entities available · ${status.selectedCount} shown on the wall`
                : config?.url || 'Enter your Home Assistant URL below'}
            </p>
          </div>
          {config?.hasToken && (
            <button
              onClick={() => setConfirmDisconnect(true)}
              aria-label="Disconnect Home Assistant"
              className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-text-disabled hover:text-accent-danger hover:bg-accent-danger/10 transition-colors touch-manipulation"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Connection details */}
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://192.168.0.237:8123"
          className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-primary/50"
        />
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={config?.hasToken ? 'Long-lived token (saved — leave blank to keep)' : 'Long-lived access token'}
          className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-primary/50"
        />
        <p className="text-[10px] text-text-disabled -mt-1">
          Create one in Home Assistant under your profile → Security → Long-lived
          access tokens. It’s encrypted on this machine.
        </p>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleTest} disabled={testing} className="flex-1">
            <span className="flex items-center justify-center gap-1.5">
              <PlugZap size={14} />
              {testing ? 'Testing…' : 'Test'}
            </span>
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Saving…' : 'Save & connect'}
          </Button>
        </div>

        {/* Inline result — visible even when a toast is missed or obscured */}
        {result && (
          <div
            className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-xs ${
              result.ok
                ? 'bg-accent-success/10 border-accent-success/30 text-accent-success'
                : 'bg-accent-danger/10 border-accent-danger/30 text-accent-danger'
            }`}
          >
            {result.ok ? (
              <Check size={14} className="shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            )}
            <span className="flex-1 break-words">{result.message}</span>
          </div>
        )}

        {/* Entity picker */}
        {status.state === 'connected' && (
          <div className="mt-1">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-bg-tertiary border border-border-subtle hover:bg-bg-hover transition-colors touch-manipulation"
            >
              <div className="text-left">
                <p className="text-sm text-text-primary">Entities on the wall</p>
                <p className="text-[10px] text-text-disabled mt-0.5">
                  {selected.length === 0
                    ? 'None selected yet — pick sensors and switches to display'
                    : `${selected.length} selected`}
                </p>
              </div>
              <span className="text-xs text-accent-primary">{pickerOpen ? 'Done' : 'Choose'}</span>
            </button>

            {pickerOpen && (
              <div className="mt-2 rounded-xl bg-bg-tertiary border border-border-subtle overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
                  <Search size={14} className="text-text-disabled shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search entities…"
                    className="flex-1 min-w-0 bg-transparent text-sm text-text-primary outline-none"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filtered.length === 0 && (
                    <p className="text-xs text-text-disabled px-3 py-3">No matching entities.</p>
                  )}
                  {filtered.map((e) => {
                    const isOn = selected.includes(e.entity_id)
                    return (
                      <button
                        key={e.entity_id}
                        onClick={() => toggleEntity(e.entity_id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors touch-manipulation ${
                          isOn ? 'bg-accent-primary/10' : 'hover:bg-bg-hover'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isOn
                              ? 'bg-accent-primary border-accent-primary text-bg-primary'
                              : 'border-border-subtle'
                          }`}
                        >
                          {isOn && <Check size={11} strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate">{e.name}</p>
                          <p className="text-[10px] text-text-disabled truncate font-mono">
                            {e.entity_id}
                          </p>
                        </div>
                        <span className="text-[10px] text-text-secondary shrink-0 tabular-nums">
                          {e.state}
                          {e.unit ? ` ${e.unit}` : ''}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDisconnect}
        title="Disconnect Home Assistant?"
        message="The stored URL, access token and entity selection will be removed. Your Home Assistant setup itself is untouched."
        confirmLabel="Disconnect"
        onConfirm={handleDisconnect}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </>
  )
}
