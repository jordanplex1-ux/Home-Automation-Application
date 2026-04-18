interface DimOverlayProps {
  active: boolean
  onWake: () => void
}

export function DimOverlay({ active, onWake }: DimOverlayProps) {
  if (!active) return null
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center anim-fade cursor-pointer"
      onClick={onWake}
      onTouchStart={onWake}
    >
      <p className="text-text-disabled text-sm">Tap to wake</p>
    </div>
  )
}
