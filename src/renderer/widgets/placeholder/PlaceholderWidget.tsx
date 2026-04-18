import type { WidgetProps } from '../types'

export function PlaceholderWidget({ instanceId }: WidgetProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2">
      <div className="text-3xl">🧪</div>
      <p className="text-text-secondary text-sm text-center">
        Placeholder widget
      </p>
      <p className="text-text-disabled text-xs font-mono">{instanceId.slice(0, 12)}</p>
    </div>
  )
}
