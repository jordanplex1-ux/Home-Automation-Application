import { apiFetch } from './api-client'

// Open-Meteo Air Quality API — free, no key required
const BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality'

interface OpenMeteoAirQualityResponse {
  current?: {
    european_aqi?: number
    pm2_5?: number
    pm10?: number
    alder_pollen?: number
    birch_pollen?: number
    grass_pollen?: number
    mugwort_pollen?: number
    olive_pollen?: number
    ragweed_pollen?: number
  }
}

export interface AirQualityData {
  aqi: number | null       // European AQI 0-100+ (lower = better)
  aqiBand: AQIBand
  pm25: number | null      // µg/m³
  pm10: number | null      // µg/m³
  pollen: PollenReading[]
  dominantPollen: PollenReading | null
}

export type AQIBand = 'good' | 'fair' | 'moderate' | 'poor' | 'very-poor' | 'extreme' | 'unknown'

export interface PollenReading {
  type: 'Alder' | 'Birch' | 'Grass' | 'Mugwort' | 'Olive' | 'Ragweed'
  value: number            // grains/m³
  level: 'low' | 'moderate' | 'high' | 'very-high'
}

export async function fetchAirQuality(lat: number, lon: number): Promise<AirQualityData> {
  const url =
    `${BASE}?latitude=${lat}&longitude=${lon}` +
    `&current=european_aqi,pm2_5,pm10,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen`

  const raw = await apiFetch<OpenMeteoAirQualityResponse>(url)
  const c = raw.current ?? {}

  const pollen: PollenReading[] = [
    { type: 'Alder',   value: c.alder_pollen   ?? 0, level: pollenLevel(c.alder_pollen) },
    { type: 'Birch',   value: c.birch_pollen   ?? 0, level: pollenLevel(c.birch_pollen) },
    { type: 'Grass',   value: c.grass_pollen   ?? 0, level: pollenLevel(c.grass_pollen) },
    { type: 'Mugwort', value: c.mugwort_pollen ?? 0, level: pollenLevel(c.mugwort_pollen) },
    { type: 'Olive',   value: c.olive_pollen   ?? 0, level: pollenLevel(c.olive_pollen) },
    { type: 'Ragweed', value: c.ragweed_pollen ?? 0, level: pollenLevel(c.ragweed_pollen) }
  ].filter((p) => p.value > 0)

  const dominantPollen = pollen.length
    ? pollen.reduce((a, b) => (b.value > a.value ? b : a))
    : null

  return {
    aqi: c.european_aqi ?? null,
    aqiBand: aqiBand(c.european_aqi),
    pm25: c.pm2_5 ?? null,
    pm10: c.pm10 ?? null,
    pollen,
    dominantPollen
  }
}

function aqiBand(aqi: number | undefined): AQIBand {
  if (aqi == null) return 'unknown'
  if (aqi <= 20) return 'good'
  if (aqi <= 40) return 'fair'
  if (aqi <= 60) return 'moderate'
  if (aqi <= 80) return 'poor'
  if (aqi <= 100) return 'very-poor'
  return 'extreme'
}

export const AQI_LABEL: Record<AQIBand, string> = {
  good: 'Good',
  fair: 'Fair',
  moderate: 'Moderate',
  poor: 'Poor',
  'very-poor': 'Very poor',
  extreme: 'Extreme',
  unknown: '—'
}

export const AQI_COLOR: Record<AQIBand, string> = {
  good: 'text-accent-success',
  fair: 'text-accent-success',
  moderate: 'text-accent-warning',
  poor: 'text-accent-warning',
  'very-poor': 'text-accent-danger',
  extreme: 'text-accent-danger',
  unknown: 'text-text-disabled'
}

// Pollen thresholds (grains/m³) — loosely based on UK Met Office bandings,
// averaged across pollen types for a simple unified scale.
function pollenLevel(v: number | undefined): 'low' | 'moderate' | 'high' | 'very-high' {
  const x = v ?? 0
  if (x < 10) return 'low'
  if (x < 50) return 'moderate'
  if (x < 100) return 'high'
  return 'very-high'
}

export const POLLEN_LABEL: Record<PollenReading['level'], string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  'very-high': 'Very high'
}

export const POLLEN_COLOR: Record<PollenReading['level'], string> = {
  low: 'text-accent-success',
  moderate: 'text-accent-warning',
  high: 'text-accent-warning',
  'very-high': 'text-accent-danger'
}
