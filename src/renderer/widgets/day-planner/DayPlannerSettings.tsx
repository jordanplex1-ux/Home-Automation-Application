import type { WidgetSettingsProps } from '../types'

export function DayPlannerSettings({ config, onConfigChange }: WidgetSettingsProps) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center justify-between">
        <span className="text-sm text-text-primary">Show mini calendar</span>
        <button
          onClick={() => onConfigChange({ showMiniCalendar: !config.showMiniCalendar })}
          className={`w-11 h-6 rounded-full transition-colors relative touch-manipulation ${
            config.showMiniCalendar !== false ? 'bg-accent-primary' : 'bg-bg-tertiary'
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              config.showMiniCalendar !== false ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </label>
    </div>
  )
}
