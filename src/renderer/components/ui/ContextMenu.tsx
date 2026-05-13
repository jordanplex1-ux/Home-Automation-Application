import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
}

interface ContextMenuProps {
  open: boolean
  /** Anchor point in viewport coordinates. */
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

/**
 * Floating context menu anchored at viewport coordinates. Clamps within the
 * window edges and dismisses on outside-click / Escape / scroll. Rendered
 * into document.body via portal so it isn't clipped by widget overflow.
 */
export function ContextMenu({ open, x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Outside-click + Escape dismissal
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onScroll = () => onClose()
    // Defer the listener by a tick so the originating pointer event that
    // opened the menu doesn't immediately close it.
    const id = window.setTimeout(() => {
      window.addEventListener('pointerdown', onDown, true)
      window.addEventListener('keydown', onKey)
      window.addEventListener('scroll', onScroll, true)
    }, 0)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, onClose])

  if (!open) return null

  // Clamp position inside the viewport. Estimate menu size — actual size is
  // measured after first render and re-positioned, but we want a reasonable
  // first placement to avoid a visible flicker.
  const estWidth = 180
  const estHeight = items.length * 40 + 8
  const left = Math.min(x, window.innerWidth - estWidth - 8)
  const top = Math.min(y, window.innerHeight - estHeight - 8)

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[80] min-w-[170px] py-1 rounded-xl bg-bg-secondary border border-border-subtle shadow-glow-md backdrop-blur-md anim-scale"
      style={{ left, top }}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={() => {
            item.onClick()
            onClose()
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors touch-manipulation ${
            item.danger
              ? 'text-accent-danger hover:bg-accent-danger/10'
              : 'text-text-primary hover:bg-bg-hover'
          }`}
        >
          {item.icon && <span className="shrink-0 w-4 h-4 flex items-center justify-center">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>,
    document.body
  )
}
