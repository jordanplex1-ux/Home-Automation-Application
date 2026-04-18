import { Box } from 'lucide-react'
import { registerWidget } from '../registry'
import { PlaceholderWidget } from './PlaceholderWidget'

registerWidget({
  id: 'placeholder',
  name: 'Placeholder',
  description: 'A test widget for verifying the grid layout',
  icon: Box,
  component: PlaceholderWidget,
  defaultConfig: {},
  defaultLayout: { w: 3, h: 3, minW: 2, minH: 2 },
  category: 'utility'
})
