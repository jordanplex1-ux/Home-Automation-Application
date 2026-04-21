import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { toast } from '../../stores/useToastStore'
import type { WidgetSettingsProps } from '../types'

export function WeatherSettings({ config, onConfigChange }: WidgetSettingsProps) {
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '')
  const [lat, setLat] = useState((config.lat as string) || '')
  const [lon, setLon] = useState((config.lon as string) || '')
  const showAirQuality = (config.showAirQuality as boolean) ?? true

  const handleSave = () => {
    onConfigChange({ apiKey, lat, lon })
    toast.success('Weather settings saved')
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-xs text-text-secondary mb-1 block">
          OpenWeatherMap API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your API key"
          className="w-full px-3 py-2 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-primary/50 transition-all"
        />
        <p className="text-[10px] text-text-disabled mt-1">
          Get a free key at openweathermap.org/api
        </p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-text-secondary mb-1 block">Latitude</label>
          <input
            type="text"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="e.g. 51.5074"
            className="w-full px-3 py-2 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-primary/50 transition-all"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-text-secondary mb-1 block">Longitude</label>
          <input
            type="text"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            placeholder="e.g. -0.1278"
            className="w-full px-3 py-2 rounded-xl bg-bg-tertiary border border-border-subtle text-text-primary text-sm outline-none focus:border-accent-primary/50 transition-all"
          />
        </div>
      </div>

      <button
        onClick={() => onConfigChange({ showAirQuality: !showAirQuality })}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-bg-tertiary border border-border-subtle hover:bg-bg-hover transition-colors touch-manipulation"
      >
        <div className="text-left">
          <p className="text-sm text-text-primary">Show air quality &amp; pollen</p>
          <p className="text-[10px] text-text-disabled mt-0.5">
            Adds a compact AQI + dominant pollen row (free data via Open-Meteo)
          </p>
        </div>
        <div
          className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
            showAirQuality ? 'bg-accent-primary' : 'bg-bg-hover'
          }`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              showAirQuality ? 'translate-x-[18px]' : 'translate-x-0.5'
            }`}
          />
        </div>
      </button>

      <Button onClick={handleSave}>Save</Button>
    </div>
  )
}
