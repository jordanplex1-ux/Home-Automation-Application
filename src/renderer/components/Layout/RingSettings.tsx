import { useState } from 'react'
import { Video, Trash2, LogIn, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useRingStatus } from '../../hooks/useRingStatus'
import { useAppSettingsStore } from '../../stores/useAppSettingsStore'
import { toast } from '../../stores/useToastStore'

type Step = 'idle' | 'credentials' | '2fa' | 'working'

/**
 * Ring account connection: two-step login (email/password → 2FA code), shows
 * connected cameras, and a disconnect action. Lives in the System tab.
 */
export function RingSettings() {
  const { status, available, refresh } = useRingStatus()
  const ringMotionAlerts = useAppSettingsStore((s) => s.ringMotionAlerts)
  const setRingMotionAlerts = useAppSettingsStore((s) => s.setRingMotionAlerts)

  const [step, setStep] = useState<Step>('idle')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [prompt, setPrompt] = useState('')
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [refreshingCams, setRefreshingCams] = useState(false)

  if (!available) {
    return (
      <p className="text-xs text-text-disabled">
        Ring integration isn’t available in this build.
      </p>
    )
  }

  const api = window.electronAPI.ring

  const handleStartLogin = async () => {
    if (!email.trim() || !password) return
    setStep('working')
    try {
      const res = await api.loginStart(email.trim(), password)
      if (!res.ok) {
        toast.error(res.message || 'Login failed')
        setStep('credentials')
        return
      }
      if (res.needs2fa) {
        setPrompt(res.prompt)
        setCode('')
        setStep('2fa')
      } else {
        finishConnected()
      }
    } catch (err) {
      toast.error((err as Error).message)
      setStep('credentials')
    }
  }

  const handleSubmit2fa = async () => {
    if (!code.trim()) return
    setStep('working')
    try {
      const res = await api.login2fa(code.trim())
      if (res.ok) {
        finishConnected()
      } else {
        toast.error(res.message || 'Incorrect code')
        setStep('2fa')
      }
    } catch (err) {
      toast.error((err as Error).message)
      setStep('2fa')
    }
  }

  const finishConnected = () => {
    // Clear sensitive fields from memory once we're in.
    setEmail('')
    setPassword('')
    setCode('')
    setStep('idle')
    refresh()
    toast.success('Ring connected')
  }

  const handleLogout = async () => {
    await api.logout()
    setConfirmLogout(false)
    refresh()
    toast.success('Ring disconnected')
  }

  const handleRefreshCameras = async () => {
    setRefreshingCams(true)
    try {
      const res = await api.listCameras()
      refresh()
      if (res.ok) toast.success(`Found ${res.cameras.length} camera${res.cameras.length === 1 ? '' : 's'}`)
      else toast.error(res.message || 'Could not fetch cameras')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setRefreshingCams(false)
    }
  }

  // ---- Connected view ----
  if (status.configured) {
    return (
      <>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-bg-tertiary border border-border-subtle">
            <Video size={16} className="text-accent-success shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary">
                {status.connected ? 'Connected' : 'Reconnecting…'}
              </p>
              <p className="text-[10px] text-text-disabled">
                {status.error
                  ? status.error
                  : `${status.cameras.length} camera${status.cameras.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <button
              onClick={handleRefreshCameras}
              aria-label="Refresh cameras"
              disabled={refreshingCams}
              className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-text-disabled hover:text-text-primary hover:bg-bg-hover transition-colors touch-manipulation disabled:opacity-40"
            >
              <RefreshCw size={14} className={refreshingCams ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setConfirmLogout(true)}
              aria-label="Disconnect Ring"
              className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-text-disabled hover:text-accent-danger hover:bg-accent-danger/10 transition-colors touch-manipulation"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {status.cameras.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-tertiary/50 text-sm text-text-secondary"
            >
              <Video size={13} className="text-text-disabled" />
              {c.name}
            </div>
          ))}

          {/* Motion alert opt-in */}
          <button
            onClick={() => setRingMotionAlerts(!ringMotionAlerts)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-bg-tertiary border border-border-subtle hover:bg-bg-hover transition-colors touch-manipulation"
          >
            <div className="text-left">
              <p className="text-sm text-text-primary">Pop up on motion too</p>
              <p className="text-[10px] text-text-disabled mt-0.5">
                Show the live feed for motion events, not just doorbell presses
              </p>
            </div>
            <div
              className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                ringMotionAlerts ? 'bg-accent-primary' : 'bg-bg-hover'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  ringMotionAlerts ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`}
              />
            </div>
          </button>

          <p className="text-[10px] text-text-disabled mt-1">
            Live views appear on the Home Automation screen. A doorbell press
            pops the camera over whatever’s on screen.
          </p>
        </div>

        <ConfirmDialog
          open={confirmLogout}
          title="Disconnect Ring?"
          message="The stored Ring session will be removed and cameras will stop appearing. You can reconnect any time."
          confirmLabel="Disconnect"
          onConfirm={handleLogout}
          onCancel={() => setConfirmLogout(false)}
        />
      </>
    )
  }

  // ---- 2FA step ----
  if (step === '2fa') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-text-secondary">{prompt}</p>
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit2fa()}
          placeholder="2FA code"
          autoFocus
          className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm tracking-widest text-center outline-none focus:border-accent-primary/50"
        />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setStep('credentials')} className="flex-1">
            Back
          </Button>
          <Button onClick={handleSubmit2fa} disabled={!code.trim()} className="flex-1">
            Verify
          </Button>
        </div>
      </div>
    )
  }

  // ---- Credentials step (and idle/working) ----
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] text-text-disabled">
        Sign in with your Ring account. Credentials are used once to obtain a
        token, which is stored locally — your password isn’t kept.
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Ring email"
        className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-primary/50"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleStartLogin()}
        placeholder="Ring password"
        className="w-full px-3 py-2.5 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-primary/50"
      />
      <Button
        onClick={handleStartLogin}
        disabled={step === 'working' || !email.trim() || !password}
      >
        <span className="flex items-center justify-center gap-1.5">
          <LogIn size={14} />
          {step === 'working' ? 'Connecting…' : 'Connect Ring'}
        </span>
      </Button>
    </div>
  )
}
