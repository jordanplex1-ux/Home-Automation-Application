import { useCallback, useRef } from 'react'

interface UseLongPressOptions {
  delayMs?: number
  movementToleranceCSSPx?: number
}

interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
}

/**
 * Fires `onLongPress(point)` when the user holds a pointer down for
 * `delayMs` without moving more than `movementToleranceCSSPx`. A normal tap
 * (release before delay) doesn't fire — so this can coexist with regular
 * click handlers on children: the tap arrives via click, the long-press
 * arrives only when the user genuinely waits.
 *
 * Also handles right-click (`contextmenu`) for mouse users, mapping it to
 * the same callback.
 */
export function useLongPress(
  onLongPress: (point: { x: number; y: number }) => void,
  { delayMs = 500, movementToleranceCSSPx = 10 }: UseLongPressOptions = {}
): LongPressHandlers {
  const timerRef = useRef<number | null>(null)
  const startRef = useRef<{ x: number; y: number; pointerId: number } | null>(null)
  const firedRef = useRef(false)

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startRef.current = null
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Ignore presses on form controls — we never want long-press to interrupt
      // typing, sliders, etc.
      const t = e.target as HTMLElement
      if (
        t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.tagName === 'SELECT' ||
        t.isContentEditable
      ) {
        return
      }
      firedRef.current = false
      startRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId }
      timerRef.current = window.setTimeout(() => {
        if (!startRef.current) return
        firedRef.current = true
        onLongPress({ x: startRef.current.x, y: startRef.current.y })
      }, delayMs)
    },
    [delayMs, onLongPress]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current) return
      if (e.pointerId !== startRef.current.pointerId) return
      const dx = e.clientX - startRef.current.x
      const dy = e.clientY - startRef.current.y
      if (Math.hypot(dx, dy) > movementToleranceCSSPx) clear()
    },
    [clear, movementToleranceCSSPx]
  )

  const onPointerUp = useCallback(() => clear(), [clear])
  const onPointerCancel = useCallback(() => clear(), [clear])

  // Map mouse right-click to the same handler so desktop users can also
  // open the context menu.
  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onLongPress({ x: e.clientX, y: e.clientY })
    },
    [onLongPress]
  )

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onContextMenu }
}
