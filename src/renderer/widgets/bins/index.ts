import { Trash2 } from 'lucide-react'
import { registerWidget } from '../registry'
import { BinCollectionWidget } from './BinCollectionWidget'
import { BinCollectionSettings } from './BinCollectionSettings'

registerWidget({
  id: 'bins',
  name: 'Bin Collection',
  description: 'Upcoming bin collection days for Barnsley MBC',
  icon: Trash2,
  component: BinCollectionWidget,
  settingsComponent: BinCollectionSettings,
  defaultConfig: { uprn: '', postcode: '' },
  defaultLayout: { w: 4, h: 3, minW: 3, minH: 2 },
  refreshInterval: 6 * 60 * 60 * 1000,
  queryKeyPrefixes: ['bins-barnsley'],
  category: 'info'
})
