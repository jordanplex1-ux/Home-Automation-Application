import { Droplets, Wind, Thermometer } from 'lucide-react'
import { getWeatherIconUrl } from '../../../services/weather.service'
import type { CurrentWeather } from '../../../services/types/weather.types'

interface CurrentWeatherViewProps {
  data: CurrentWeather
}

export function CurrentWeatherView({ data }: CurrentWeatherViewProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Icon + temp */}
      <div className="flex items-center gap-1">
        <img
          src={getWeatherIconUrl(data.icon)}
          alt={data.description}
          className="w-14 h-14 -ml-2"
        />
        <div>
          <p className="text-3xl font-light text-text-primary tabular-nums">
            {data.temp}°
          </p>
          <p className="text-[10px] text-text-secondary capitalize">{data.description}</p>
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col gap-1 ml-auto">
        <div className="flex items-center gap-1.5 text-text-secondary">
          <Thermometer size={12} />
          <span className="text-[10px]">Feels {data.feelsLike}°</span>
        </div>
        <div className="flex items-center gap-1.5 text-text-secondary">
          <Droplets size={12} />
          <span className="text-[10px]">{data.humidity}%</span>
        </div>
        <div className="flex items-center gap-1.5 text-text-secondary">
          <Wind size={12} />
          <span className="text-[10px]">{data.windSpeed} km/h</span>
        </div>
      </div>
    </div>
  )
}
