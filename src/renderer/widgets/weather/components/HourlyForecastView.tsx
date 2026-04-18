import { getWeatherIconUrl } from '../../../services/weather.service'
import type { HourlyForecast } from '../../../services/types/weather.types'

interface HourlyForecastViewProps {
  data: HourlyForecast[]
}

export function HourlyForecastView({ data }: HourlyForecastViewProps) {
  return (
    <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {data.map((hour, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg bg-bg-tertiary/30 shrink-0 min-w-[52px]"
        >
          <span className="text-[10px] text-text-disabled">{hour.time}</span>
          <img
            src={getWeatherIconUrl(hour.icon)}
            alt={hour.description}
            className="w-7 h-7"
          />
          <span className="text-xs font-medium text-text-primary tabular-nums">
            {hour.temp}°
          </span>
        </div>
      ))}
    </div>
  )
}
