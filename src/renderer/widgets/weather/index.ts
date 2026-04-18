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
  defaultConfig: { apiKey: '', lat: '', lon: '' },
  defaultLayout: { w: 4, h: 3, minW: 3, minH: 2 },
  refreshInterval: 15 * 60 * 1000,
  category: 'info'
})
