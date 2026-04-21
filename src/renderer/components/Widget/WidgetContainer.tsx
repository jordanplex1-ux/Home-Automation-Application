import { Component as ReactComponent, useState, type ErrorInfo, type ReactNode } from 'react'
import { GripHorizontal, Settings, Trash2, AlertTriangle, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { getWidget } from '../../widgets/registry'
import { useWidgetStore } from '../../stores/useWidgetStore'
import { IconButton } from '../ui/IconButton'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { toast } from '../../stores/useToastStore'
import type { WidgetInstance } from '../../widgets/types'

interface ErrorBoundaryProps {
  children: ReactNode
  widgetName: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class WidgetErrorBoundary extends ReactComponent<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.widgetName}] Widget crashed:`, error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-3">
          <AlertTriangle size={24} className="text-accent-warning" />
          <p className="text-xs text-text-secondary">Widget crashed</p>
          <p className="text-[10px] text-text-disabled max-w-[200px] truncate">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-accent-primary hover:bg-accent-primary/10 transition-colors touch-manipulation"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

interface WidgetContainerProps {
  instance: WidgetInstance
}

export function WidgetContainer({ instance }: WidgetContainerProps) {
  const isEditing = useWidgetStore((s) => s.isEditing)
  const removeWidget = useWidgetStore((s) => s.removeWidget)
  const openSettings = useWidgetStore((s) => s.openSettings)
  const def = getWidget(instance.widgetId)
  const queryClient = useQueryClient()
  const [confirmRemove, setConfirmRemove] = useState(false)

  if (!def) return null

  const Component = def.component
  const canRefresh = !!def.queryKeyPrefixes?.length

  const handleRefresh = () => {
    if (!def.queryKeyPrefixes) return
    for (const prefix of def.queryKeyPrefixes) {
      queryClient.invalidateQueries({ queryKey: [prefix] })
    }
    toast.success(`Refreshing ${def.name}`)
  }

  return (
    <div className="h-full flex flex-col bg-bg-secondary/80 backdrop-blur-md border border-border-subtle rounded-2xl overflow-hidden">
      {/* Header with drag handle */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0 border-b border-border-subtle/50">
        {isEditing && (
          <div className="drag-handle cursor-grab active:cursor-grabbing text-text-disabled hover:text-text-secondary touch-manipulation">
            <GripHorizontal size={18} />
          </div>
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <def.icon className="w-4 h-4 text-accent-primary shrink-0" />
          <span className="text-sm font-medium text-text-secondary truncate">
            {def.name}
          </span>
        </div>
        {isEditing && (
          <div className="flex items-center gap-0.5">
            {canRefresh && (
              <IconButton label="Refresh" onClick={handleRefresh}>
                <RefreshCw size={16} />
              </IconButton>
            )}
            {def.settingsComponent && (
              <IconButton label="Settings" onClick={() => openSettings(instance.instanceId)}>
                <Settings size={16} />
              </IconButton>
            )}
            <IconButton label="Remove" onClick={() => setConfirmRemove(true)}>
              <Trash2 size={16} className="text-accent-danger" />
            </IconButton>
          </div>
        )}
      </div>

      {/* Widget content */}
      <div className="flex-1 overflow-hidden p-3">
        <WidgetErrorBoundary widgetName={def.name}>
          <Component
            instanceId={instance.instanceId}
            config={instance.config}
            isEditing={isEditing}
          />
        </WidgetErrorBoundary>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title={`Remove ${def.name}?`}
        message="This widget and its settings will be removed from your dashboard. You can add it back from the widget picker."
        confirmLabel="Remove"
        onConfirm={() => {
          removeWidget(instance.instanceId)
          setConfirmRemove(false)
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </div>
  )
}
