import { useState } from 'react'
import {
  Thermometer, Droplets, Gauge, BatteryMedium, Lightbulb, Power,
  DoorOpen, Activity, Wind, Sun, Zap, Radio
} from 'lucide-react'
import { entityName, entityDomain } from '../../../stores/useHaStore'
import { toast } from '../../../stores/useToastStore'

interface EntityTileProps {
  entity: HaEntity
}

/** Domains where a tap should toggle the thing on/off. */
const TOGGLEABLE = new Set(['switch', 'light', 'input_boolean', 'fan', 'siren'])

const UNAVAILABLE = new Set(['unavailable', 'unknown'])

function iconFor(entity: HaEntity) {
  const deviceClass = entity.attributes.device_class as string | undefined
  const domain = entityDomain(entity)

  switch (deviceClass) {
    case 'temperature': return Thermometer
    case 'humidity': return Droplets
    case 'pressure':
    case 'atmospheric_pressure': return Gauge
    case 'battery': return BatteryMedium
    case 'door':
    case 'window':
    case 'garage_door': return DoorOpen
    case 'motion':
    case 'occupancy':
    case 'presence': return Radio
    case 'power':
    case 'energy': return Zap
    case 'illuminance': return Sun
  }
  switch (domain) {
    case 'light': return Lightbulb
    case 'switch':
    case 'input_boolean': return Power
    case 'fan': return Wind
    default: return Activity
  }
}

/** Round floaty sensor values so the wall doesn't show 21.400000000000002. */
function formatState(entity: HaEntity): string {
  const raw = entity.state
  if (UNAVAILABLE.has(raw)) return '—'
  const num = Number(raw)
  if (!Number.isNaN(num) && raw.trim() !== '') {
    // Pressure readings are big and don't need decimals; everything else gets 1dp
    const decimals = Math.abs(num) >= 100 ? 0 : 1
    return num.toFixed(decimals).replace(/\.0$/, '')
  }
  // Tidy up common textual states
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_/g, ' ')
}

export function EntityTile({ entity }: EntityTileProps) {
  const [busy, setBusy] = useState(false)
  const Icon = iconFor(entity)
  const domain = entityDomain(entity)
  const name = entityName(entity)
  const unit = entity.attributes.unit_of_measurement as string | undefined

  const unavailable = UNAVAILABLE.has(entity.state)
  const isToggleable = TOGGLEABLE.has(domain) && !unavailable
  const isOn = entity.state === 'on'

  const handleToggle = async () => {
    if (!isToggleable || busy) return
    setBusy(true)
    try {
      // `homeassistant.toggle` works across every toggleable domain, so we
      // don't need per-domain service mapping.
      const res = await window.electronAPI.homeAssistant.callService(
        'homeassistant',
        'toggle',
        entity.entity_id
      )
      if (!res.ok) toast.error(res.message)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const accent = unavailable
    ? 'text-text-disabled'
    : isToggleable && isOn
    ? 'text-accent-warning'
    : 'text-accent-primary'

  const Wrapper = isToggleable ? 'button' : 'div'

  return (
    <Wrapper
      {...(isToggleable ? { onClick: handleToggle, disabled: busy } : {})}
      className={`flex flex-col gap-2 p-4 rounded-2xl border text-left transition-all min-h-[104px] ${
        isToggleable
          ? 'touch-manipulation active:scale-[0.98] cursor-pointer'
          : ''
      } ${
        isToggleable && isOn
          ? 'bg-accent-warning/10 border-accent-warning/40 shadow-glow-sm'
          : 'bg-bg-secondary/80 border-border-subtle hover:bg-bg-hover/40'
      } ${busy ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-2">
        <Icon size={16} className={`shrink-0 ${accent}`} />
        <span className="text-xs text-text-secondary truncate flex-1 min-w-0">{name}</span>
      </div>

      <div className="flex items-baseline gap-1 mt-auto">
        <span
          className={`text-3xl font-light tabular-nums leading-none ${
            unavailable ? 'text-text-disabled' : 'text-text-primary'
          }`}
        >
          {formatState(entity)}
        </span>
        {unit && !unavailable && (
          <span className="text-sm text-text-secondary">{unit}</span>
        )}
      </div>

      {isToggleable && (
        <span className="text-[10px] uppercase tracking-wider text-text-disabled">
          {unavailable ? 'Unavailable' : 'Tap to toggle'}
        </span>
      )}
    </Wrapper>
  )
}
