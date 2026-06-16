import { CloudSun } from 'lucide-react'
import { registerWidget } from '../registry'
import { WeatherWidget } from './WeatherWidget'
import { WeatherSettings } from './WeatherSettings'

registerWidget({
  id: 'weather',
  name: 'Weather',
  description: 'Current conditions and hourly forecast',
  icon: CloudSun,
  component: WeatherWidget,
  settingsComponent: WeatherSettings,
  defaultConfig: { apiKey: '', lat: '', lon: '', showAirQuality: true },
  defaultLayout: { w: 8, h: 6, minW: 6, minH: 4 },
  refreshInterval: 15 * 60 * 1000,
  queryKeyPrefixes: ['weather', 'air-quality'],
  category: 'info'
})
