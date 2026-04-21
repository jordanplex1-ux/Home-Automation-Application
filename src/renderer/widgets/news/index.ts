import { Newspaper } from 'lucide-react'
import { registerWidget } from '../registry'
import { NewsWidget } from './NewsWidget'
import { NewsSettings } from './NewsSettings'

registerWidget({
  id: 'news',
  name: 'News Ticker',
  description: 'Scrolling headlines from major UK news outlets',
  icon: Newspaper,
  component: NewsWidget,
  settingsComponent: NewsSettings,
  defaultConfig: {
    sources: ['bbc', 'guardian', 'sky', 'gbnews'],
    speed: 'medium'
  },
  // Wide and short — the classic ticker shape
  defaultLayout: { w: 12, h: 1, minW: 4, minH: 1 },
  refreshInterval: 15 * 60 * 1000,
  queryKeyPrefixes: ['news'],
  category: 'info'
})
