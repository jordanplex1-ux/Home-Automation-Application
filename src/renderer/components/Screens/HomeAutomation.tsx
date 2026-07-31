import { useMemo } from 'react'
import { Cpu, Construction, Video, Home, AlertTriangle } from 'lucide-react'
import { useRingStatus } from '../../hooks/useRingStatus'
import { useHaStore, sortEntities } from '../../stores/useHaStore'
import { CameraSnapshot } from './homeAutomation/CameraSnapshot'
import { EntityTile } from './homeAutomation/EntityTile'

export function HomeAutomation() {
  const { status: ringStatus, available: ringAvailable } = useRingStatus()
  const haStatus = useHaStore((s) => s.status)
  // Select the raw map (stable reference) and sort in a memo — see sortEntities.
  const entityMap = useHaStore((s) => s.entities)
  const entities = useMemo(() => sortEntities(entityMap), [entityMap])

  const hasCameras = ringAvailable && ringStatus.configured && ringStatus.cameras.length > 0
  const hasEntities = entities.length > 0
  const haConnecting = haStatus.configured && haStatus.state !== 'connected'

  // Nothing configured at all — keep the original guidance screen.
  if (!hasCameras && !hasEntities && !haConnecting) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
          <div className="relative">
            <Cpu size={64} className="text-accent-primary opacity-30" />
            <Construction size={28} className="absolute -bottom-1 -right-1 text-accent-warning" />
          </div>
          <h2 className="text-xl font-light text-text-primary">Home Automation</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Connect Home Assistant in Settings → System to show your sensors and
            controls here. Ring cameras appear here too once linked.
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-text-disabled mt-2">
            Nothing connected yet
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto flex flex-col gap-5">
      {/* Home Assistant entities */}
      {(hasEntities || haConnecting) && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <Home size={16} className="text-accent-primary" />
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              Home
            </h2>
            {haStatus.state === 'connecting' && (
              <span className="text-[10px] text-text-disabled">connecting…</span>
            )}
            {haStatus.state === 'error' && (
              <span className="flex items-center gap-1 text-[10px] text-accent-danger">
                <AlertTriangle size={11} />
                {haStatus.error ?? 'connection error'}
              </span>
            )}
            {haStatus.state === 'disconnected' && haStatus.configured && (
              <span className="text-[10px] text-accent-warning">reconnecting…</span>
            )}
          </div>

          {hasEntities ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {entities.map((entity) => (
                <EntityTile key={entity.entity_id} entity={entity} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-disabled px-1">
              {haStatus.state === 'connected'
                ? 'Connected — choose which entities to show in Settings → System → Home Assistant.'
                : 'Waiting for Home Assistant…'}
            </p>
          )}
        </section>
      )}

      {/* Ring cameras */}
      {hasCameras && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <Video size={16} className="text-accent-primary" />
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              Cameras
            </h2>
            {!ringStatus.connected && (
              <span className="text-[10px] text-accent-warning">reconnecting…</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {ringStatus.cameras.map((cam) => (
              <CameraSnapshot
                key={cam.id}
                cameraId={cam.id}
                cameraName={cam.name}
                className="aspect-video"
              />
            ))}
          </div>

          <p className="text-[10px] text-text-disabled px-1">
            Live views refresh every few seconds. A doorbell press pops the
            camera full-screen over any screen.
          </p>
        </section>
      )}
    </div>
  )
}
