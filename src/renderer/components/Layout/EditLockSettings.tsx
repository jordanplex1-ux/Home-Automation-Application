import { useState } from 'react'
import { useAppSettingsStore } from '../../stores/useAppSettingsStore'
import { PinModal } from '../ui/PinModal'
import { Button } from '../ui/Button'
import { hashPin, verifyPin } from '../../lib/pin'
import { toast } from '../../stores/useToastStore'

type SetupStep = 'idle' | 'verify-current' | 'enter-new' | 'confirm-new'

/**
 * Display row + flow for the edit lock. Lives inside the System tab of the
 * App Settings modal. Owns the multi-step PIN setup flow (verify current,
 * enter new, confirm new) using the shared PinModal.
 */
export function EditLockSettings() {
  const editLockEnabled = useAppSettingsStore((s) => s.editLockEnabled)
  const editLockPinHash = useAppSettingsStore((s) => s.editLockPinHash)
  const setEditLock = useAppSettingsStore((s) => s.setEditLock)

  const [step, setStep] = useState<SetupStep>('idle')
  const [pendingPin, setPendingPin] = useState<string | null>(null)

  // Begin: turning ON requires picking a PIN; turning OFF requires entering
  // the current PIN first.
  const handleToggle = () => {
    if (editLockEnabled) {
      setStep('verify-current')
    } else {
      setStep('enter-new')
    }
  }

  const handleChangePin = () => {
    setStep('verify-current')
    // After verification we'll transition to enter-new (handled in handleSubmit)
  }

  const handleSubmit = async (pin: string): Promise<boolean> => {
    switch (step) {
      case 'verify-current': {
        if (!editLockPinHash) {
          // Edge case: nothing to verify against — just allow continuation
          setStep('enter-new')
          return true
        }
        const ok = await verifyPin(pin, editLockPinHash)
        if (!ok) return false
        // Branch: if the lock was on, we're verifying to either disable OR
        // change. We can distinguish by whether the user pressed "Change PIN"
        // (then we want enter-new) or the toggle (then we want to disable).
        // We track that via pendingPin: null = disable, '' = change.
        if (pendingPin === '') {
          setStep('enter-new')
        } else {
          setEditLock(false, null)
          setStep('idle')
          toast.success('Edit lock disabled')
        }
        return true
      }
      case 'enter-new': {
        setPendingPin(pin)
        setStep('confirm-new')
        return true
      }
      case 'confirm-new': {
        if (pin !== pendingPin) {
          setPendingPin(null)
          setStep('enter-new')
          toast.error('PINs didn’t match — try again')
          return false
        }
        const hash = await hashPin(pin)
        setEditLock(true, hash)
        setPendingPin(null)
        setStep('idle')
        toast.success('Edit lock enabled')
        return true
      }
      default:
        return true
    }
  }

  const handleCancel = () => {
    setStep('idle')
    setPendingPin(null)
  }

  const modalTitle =
    step === 'verify-current' ? 'Enter current PIN'
    : step === 'enter-new'    ? 'Choose a new PIN'
    : step === 'confirm-new'  ? 'Re-enter PIN to confirm'
    : ''

  return (
    <>
      <div className="flex flex-col gap-2">
        <button
          onClick={handleToggle}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-bg-tertiary border border-border-subtle hover:bg-bg-hover transition-colors touch-manipulation"
        >
          <div className="text-left">
            <p className="text-sm text-text-primary">Lock edit mode with a PIN</p>
            <p className="text-[10px] text-text-disabled mt-0.5">
              Stops kids (and others) toggling edit mode and rearranging widgets
            </p>
          </div>
          <div
            className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
              editLockEnabled ? 'bg-accent-primary' : 'bg-bg-hover'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                editLockEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`}
            />
          </div>
        </button>

        {editLockEnabled && (
          <Button
            variant="ghost"
            onClick={() => {
              setPendingPin('') // sentinel meaning "change, don't disable"
              handleChangePin()
            }}
          >
            Change PIN
          </Button>
        )}
      </div>

      <PinModal
        open={step !== 'idle'}
        title={modalTitle}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </>
  )
}
