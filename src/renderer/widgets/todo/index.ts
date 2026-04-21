import { ListChecks } from 'lucide-react'
import { registerWidget } from '../registry'
import { TodoWidget } from './TodoWidget'
import { TodoSettings } from './TodoSettings'

registerWidget({
  id: 'todo',
  name: 'To-do List',
  description: 'Simple checklist with optional auto-delete for completed items',
  icon: ListChecks,
  component: TodoWidget,
  settingsComponent: TodoSettings,
  defaultConfig: { autoDeleteMs: 24 * 60 * 60 * 1000 }, // 1 day
  defaultLayout: { w: 3, h: 4, minW: 2, minH: 2 },
  category: 'utility'
})
