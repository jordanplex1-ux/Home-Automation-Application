import { CalendarDays } from 'lucide-react'
import { registerWidget } from '../registry'
import { DayPlannerWidget } from './DayPlannerWidget'
import { DayPlannerSettings } from './DayPlannerSettings'

registerWidget({
  id: 'day-planner',
  name: 'Day Planner',
  description: 'Daily schedule with timeline, events, and mini calendar',
  icon: CalendarDays,
  component: DayPlannerWidget,
  settingsComponent: DayPlannerSettings,
  defaultConfig: { showMiniCalendar: true },
  defaultLayout: { w: 6, h: 5, minW: 4, minH: 3 },
  category: 'core'
})
