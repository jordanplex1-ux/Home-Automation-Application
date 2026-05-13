import { useEffect, useState } from 'react'
import { Delete, X } from 'lucide-react'

interface PinModalProps {
  open: boolean
  title: string
  subtitle?: string
  /**
   * Called with the entered PIN digits when the user submits.
   * Return `true` if the PIN is correct (modal closes); `false` to indicate
   * "wrong PIN" and let the user try again.
   */
  onSubmit: (pin: string) => Promise<boolean> | boolean
  onCancel: () => void
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
const PIN_LENGTH = 4

/**
 * Touchscreen-friendly PIN entry. Big numeric keypad, no system keyboard
 * popping up over your dashboard.
 */
export function PinModal({ open, title, subtitle, onSubmit, onCancel }: PinModalProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setPin('')
      setError(false)
      setSubmitting(false)
    }
  }, [open])

  // Auto-submit on reaching full length
  useEffect(() => {
    if (pin.length !== PIN_LENGTH || submitting) return
    setSubmitting(true)
    Promise.resolve(onSubmit(pin)).then((ok) => {
      // Always reset for the next entry. If the caller closes the modal on
      // success, the `open` effect resets us too — these run idempotently.
      // The crucial case is multi-step flows (enter PIN → confirm PIN) where
      // the modal stays open between steps; without this reset the dots stay
      // filled and `submitting` stays true, locking the keypad.
      setPin('')
      setSubmitting(false)
      setError(!ok)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  if (!open) return null

  const handleDigit = (d: string) => {
    if (submitting) return
    if (error) setError(false)
    setPin((p) => (p.length < PIN_LENGTH ? p + d : p))
  }

  const handleBackspace = () => {
    if (submitting) return
    if (error) setError(false)
    setPin((p) => p.slice(0, -1))
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm anim-fade" onClick={onCancel} />
      <div className="relative bg-bg-secondary border border-border-subtle rounded-2xl shadow-glow-md w-full max-w-sm mx-4 anim-scale overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-medium text-text-primary">{title}</h2>
            {subtitle && <p className="text-xs text-text-disabled mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors touch-manipulation"
          >
            <X size={18} />
          </button>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 py-6">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const filled = i < pin.length
            return (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  error
                    ? 'bg-accent-danger border-accent-danger'
                    : filled
                    ? 'bg-accent-primary border-accent-primary shadow-glow-sm'
                    : 'bg-transparent border-border-subtle'
                }`}
              />
            )
          })}
        </div>

        {error && (
          <p className="text-center text-xs text-accent-danger -mt-2 mb-2">Incorrect PIN</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 px-5 pb-5">
          {DIGITS.map((d) => (
            <KeypadButton key={d} onClick={() => handleDigit(d)}>
              {d}
            </KeypadButton>
          ))}
          <div />
          <KeypadButton onClick={() => handleDigit('0')}>0</KeypadButton>
          <KeypadButton onClick={handleBackspace} ariaLabel="Backspace">
            <Delete size={20} />
          </KeypadButton>
        </div>
      </div>
    </div>
  )
}

function KeypadButton({
  children,
  onClick,
  ariaLabel
}: {
  children: React.ReactNode
  onClick: () => void
  ariaLabel?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="h-14 rounded-xl bg-bg-tertiary border border-border-subtle text-xl font-light text-text-primary hover:bg-bg-hover active:scale-95 transition-all touch-manipulation flex items-center justify-center"
    >
      {children}
    </button>
  )
}
