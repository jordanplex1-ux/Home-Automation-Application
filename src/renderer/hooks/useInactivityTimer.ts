import { useEffect, useRef } from 'react'

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'pointerdown',
  'pointermove',
  'touchstart',
  'keydown',
  'wheel'
]

/**
 * Fires `onTimeout` once the window has been idle for `timeoutMs`.
 * Any pointer / touch / key / wheel event resets the timer.
 *
 * Pass `enabled: false` to disable entirely.
 */
export function useInactivityTimer(
  timeoutMs: number,
  onTimeout: () => void,
  enabled = true
) {
  // Keep latest callback in a ref so we don't rebind listeners on every render
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  useEffect(() => {
    if (!enabled || timeoutMs <= 0) return

    let timerId: number | null = null
    const clear = () => {
      if (timerId !== null) {
        window.clearTimeout(timerId)
        timerId = null
      }
    }
    const reset = () => {
      clear()
      timerId = window.setTimeout(() => onTimeoutRef.current(), timeoutMs)
    }

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, reset, { passive: true } as AddEventListenerOptions)
    )
    reset() // start the clock immediately

    return () => {
      clear()
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [timeoutMs, enabled])
}
