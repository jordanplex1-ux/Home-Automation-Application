import { Cpu, Construction, Video } from 'lucide-react'
import { useRingStatus } from '../../hooks/useRingStatus'
import { CameraSnapshot } from './homeAutomation/CameraSnapshot'

export function HomeAutomation() {
  const { status, available } = useRingStatus()
  const hasCameras = available && status.configured && status.cameras.length > 0

  return (
    <div className="h-full overflow-auto">
      {hasCameras ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <Video size={16} className="text-accent-primary" />
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              Cameras
            </h2>
            {!status.connected && (
              <span className="text-[10px] text-accent-warning">reconnecting…</span>
            )}
          </div>

          {/* Responsive camera grid — each tile near-live via snapshot polling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {status.cameras.map((cam) => (
              <CameraSnapshot
                key={cam.id}
                cameraId={cam.id}
                cameraName={cam.name}
                className="aspect-video"
              />
            ))}
          </div>

          <p className="text-[10px] text-text-disabled px-1 mt-1">
            Live views refresh every few seconds. A doorbell press pops the
            camera full-screen over any screen.
          </p>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
            <div className="relative">
              <Cpu size={64} className="text-accent-primary opacity-30" />
              <Construction
                size={28}
                className="absolute -bottom-1 -right-1 text-accent-warning"
              />
            </div>
            <h2 className="text-xl font-light text-text-primary">Home Automation</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {available && status.configured
                ? 'Ring is connected but no cameras were found yet. Give it a moment, or check the Ring section in Settings → System.'
                : 'Under development. Connect a Ring account in Settings → System to show camera live views here. More smart-home controls are coming.'}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-disabled mt-2">
              {available && status.configured ? 'Waiting for cameras' : 'Coming soon'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
