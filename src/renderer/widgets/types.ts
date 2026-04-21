import type { ComponentType } from 'react'

export interface WidgetDefinition {
  id: string
  name: string
  description: string
  icon: ComponentType<{ className?: string }>
  component: ComponentType<WidgetProps>
  settingsComponent?: ComponentType<WidgetSettingsProps>
  defaultConfig: Record<string, unknown>
  defaultLayout: { w: number; h: number; minW?: number; minH?: number }
  refreshInterval?: number
  /**
   * Root segments of any TanStack Query keys this widget owns. Used by the
   * per-widget refresh button in edit mode to invalidate just this widget's
   * queries. Omit for widgets with no live data (e.g. todo, day planner).
   */
  queryKeyPrefixes?: readonly string[]
  category: 'core' | 'info' | 'utility'
}

export interface WidgetProps {
  instanceId: string
  config: Record<string, unknown>
  isEditing: boolean
}

export interface WidgetSettingsProps {
  instanceId: string
  config: Record<string, unknown>
  onConfigChange: (patch: Record<string, unknown>) => void
}

export interface WidgetInstance {
  instanceId: string
  widgetId: string
  config: Record<string, unknown>
  layout: { x: number; y: number; w: number; h: number }
}
