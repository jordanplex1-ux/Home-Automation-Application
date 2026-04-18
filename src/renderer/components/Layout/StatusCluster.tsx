import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useIsFetching } from '@tanstack/react-query'

export function StatusCluster() {
  const online = useOnlineStatus()
  const fetchingCount = useIsFetching()
  const [lastSync, setLastSync] = useState<number>(Date.now())
  const [, force] = useState(0)

  useEffect(() => {
    if (fetchingCount === 0) setLastSync(Date.now())
  }, [fetchingCount])

  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const ago = Math.floor((Date.now() - lastSync) / 1000)
  let agoLabel: string
  if (fetchingCount > 0) agoLabel = 'Syncing…'
  else if (ago < 60) agoLabel = 'Just synced'
  else if (ago < 3600) agoLabel = `${Math.floor(ago / 60)}m ago`
  else agoLabel = `${Math.floor(ago / 3600)}h ago`

  return (
    <div className="flex items-center gap-3 text-text-disabled text-xs">
      <span>Home Planner v0.1.0</span>
      <span className="w-px h-4 bg-border-subtle" />
      <div className="flex items-center gap-1.5" title={online ? 'Online' : 'Offline'}>
        {online ? (
          <Wifi size={12} className="text-accent-success" />
        ) : (
          <WifiOff size={12} className="text-accent-danger" />
        )}
        <span>{online ? 'Online' : 'Offline'}</span>
      </div>
      <span className="w-px h-4 bg-border-subtle" />
      <span>{agoLabel}</span>
    </div>
  )
}
