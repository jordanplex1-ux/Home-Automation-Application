import { RefreshCw, Moon, Maximize2, Settings as SettingsIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { IconButton } from '../ui/IconButton'
import { toast } from '../../stores/useToastStore'

interface QuickActionsProps {
  onDim: () => void
  onOpenSettings: () => void
}

export function QuickActions({ onDim, onOpenSettings }: QuickActionsProps) {
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    queryClient.invalidateQueries()
    toast.success('Refreshing all widgets')
  }

  const handleFullscreen = () => {
    const api = window.electronAPI?.window
    if (api?.toggleFullscreen) {
      api.toggleFullscreen()
    } else if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <IconButton label="Refresh all" onClick={handleRefresh}>
        <RefreshCw size={18} />
      </IconButton>
      <IconButton label="Dim screen" onClick={onDim}>
        <Moon size={18} />
      </IconButton>
      <IconButton label="Toggle fullscreen" onClick={handleFullscreen}>
        <Maximize2 size={18} />
      </IconButton>
      <IconButton label="App settings" onClick={onOpenSettings}>
        <SettingsIcon size={18} />
      </IconButton>
    </div>
  )
}
