// OpenWeatherMap One Call API 3.0 response types (simplified)

export interface OWMOneCallResponse {
  lat: number
  lon: number
  timezone: string
  current: {
    dt: number
    temp: number
    feels_like: number
    humidity: number
    wind_speed: number
    weather: { id: number; main: string; description: string; icon: string }[]
  }
  hourly: OWMHourlyItem[]
}

export interface OWMHourlyItem {
  dt: number
  temp: number
  feels_like: number
  humidity: number
  wind_speed: number
  weather: { id: number; main: string; description: string; icon: string }[]
}

export interface OWMGeoResult {
  name: string
  country?: string
  state?: string
  lat: number
  lon: number
}

// App-internal types
export interface CurrentWeather {
  temp: number
  feelsLike: number
  humidity: number
  windSpeed: number
  description: string
  icon: string
  location: string
}

export interface HourlyForecast {
  time: string
  temp: number
  icon: string
  description: string
}

export interface WeatherData {
  current: CurrentWeather
  hourly: HourlyForecast[]
}
