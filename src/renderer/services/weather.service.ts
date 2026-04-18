import { apiFetch } from './api-client'
import type { OWMOneCallResponse, OWMGeoResult, WeatherData } from './types/weather.types'

const BASE = 'https://api.openweathermap.org/data/3.0'
const GEO_BASE = 'https://api.openweathermap.org/geo/1.0'

export async function fetchWeather(
  lat: number,
  lon: number,
  apiKey: string
): Promise<WeatherData> {
  const [data, geo] = await Promise.all([
    apiFetch<OWMOneCallResponse>(
      `${BASE}/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely,daily,alerts&appid=${apiKey}`
    ),
    apiFetch<OWMGeoResult[]>(
      `${GEO_BASE}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
    ).catch(() => [] as OWMGeoResult[])
  ])

  const current = data.current
  const hourly = Array.isArray(data.hourly) ? data.hourly.slice(0, 8) : []
  const place = geo?.[0]
  const locationName = place?.name
    ? place.state && place.state !== place.name
      ? `${place.name}, ${place.state}`
      : place.name
    : `${lat.toFixed(2)}, ${lon.toFixed(2)}`

  return {
    current: {
      temp: Math.round(current?.temp ?? 0),
      feelsLike: Math.round(current?.feels_like ?? 0),
      humidity: current?.humidity ?? 0,
      windSpeed: Math.round((current?.wind_speed ?? 0) * 3.6), // m/s to km/h
      description: current?.weather?.[0]?.description || '',
      icon: current?.weather?.[0]?.icon || '01d',
      location: locationName
    },
    hourly: hourly.map((item) => ({
      time: new Date((item.dt ?? 0) * 1000).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      temp: Math.round(item.temp ?? 0),
      icon: item.weather?.[0]?.icon || '01d',
      description: item.weather?.[0]?.description || ''
    }))
  }
}

export function getWeatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`
}
