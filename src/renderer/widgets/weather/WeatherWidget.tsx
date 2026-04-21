import { useQuery } from '@tanstack/react-query'
import { CloudOff } from 'lucide-react'
import { fetchWeather } from '../../services/weather.service'
import { fetchAirQuality } from '../../services/air-quality.service'
import { CurrentWeatherView } from './components/CurrentWeatherView'
import { HourlyForecastView } from './components/HourlyForecastView'
import { Spinner } from '../../components/ui/Spinner'
import type { WidgetProps } from '../types'

const WEATHER_API_KEY = '8351aa5a69330eeb51ee1e4a5de26f80'
const WEATHER_LAT = 53.568233
const WEATHER_LON = -1.454471

export function WeatherWidget({ instanceId: _instanceId, config }: WidgetProps) {
  const showAirQuality = (config.showAirQuality as boolean) ?? true

  const weatherQuery = useQuery({
    queryKey: ['weather', WEATHER_LAT, WEATHER_LON],
    queryFn: () => fetchWeather(WEATHER_LAT, WEATHER_LON, WEATHER_API_KEY),
    refetchInterval: 60 * 60 * 1000,
    staleTime: 55 * 60 * 1000
  })

  const airQuery = useQuery({
    queryKey: ['air-quality', WEATHER_LAT, WEATHER_LON],
    queryFn: () => fetchAirQuality(WEATHER_LAT, WEATHER_LON),
    refetchInterval: 60 * 60 * 1000,
    staleTime: 55 * 60 * 1000,
    enabled: showAirQuality
  })

  if (weatherQuery.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  if (weatherQuery.isError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
        <CloudOff size={28} className="text-accent-danger" />
        <p className="text-xs text-text-secondary">Failed to load weather</p>
        <button
          onClick={() => weatherQuery.refetch()}
          className="px-3 py-1.5 rounded-lg text-xs text-accent-primary hover:bg-accent-primary/10 transition-colors touch-manipulation"
        >
          Retry
        </button>
      </div>
    )
  }

  const data = weatherQuery.data
  const airData = airQuery.data

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Location */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-secondary">{data?.current.location}</p>
        {(weatherQuery.isRefetching || airQuery.isRefetching) && <Spinner size="sm" />}
      </div>

      {/* Current conditions (with air quality + pollen inline when enabled) */}
      {data && (
        <CurrentWeatherView
          data={data.current}
          air={showAirQuality ? airData : null}
        />
      )}

      {/* Hourly forecast */}
      {data && data.hourly.length > 0 && (
        <div className="flex-1 min-h-0">
          <p className="text-[10px] text-text-disabled mb-1.5 uppercase tracking-wider">Forecast</p>
          <HourlyForecastView data={data.hourly} />
        </div>
      )}
    </div>
  )
}
