import { Leaf, Wind } from 'lucide-react'
import {
  AQI_LABEL,
  AQI_COLOR,
  POLLEN_LABEL,
  POLLEN_COLOR,
  type AirQualityData
} from '../../../services/air-quality.service'

interface AirQualityViewProps {
  data: AirQualityData
}

export function AirQualityView({ data }: AirQualityViewProps) {
  return (
    <div className="flex items-center gap-3 text-[10px]">
      <div className="flex items-center gap-1.5">
        <Wind size={12} className={AQI_COLOR[data.aqiBand]} />
        <span className="text-text-secondary">Air</span>
        <span className={`font-medium ${AQI_COLOR[data.aqiBand]}`}>
          {AQI_LABEL[data.aqiBand]}
        </span>
        {data.aqi != null && (
          <span className="text-text-disabled tabular-nums">({Math.round(data.aqi)})</span>
        )}
      </div>
      {data.dominantPollen && (
        <>
          <span className="w-px h-3 bg-border-subtle" />
          <div className="flex items-center gap-1.5">
            <Leaf size={12} className={POLLEN_COLOR[data.dominantPollen.level]} />
            <span className="text-text-secondary">{data.dominantPollen.type}</span>
            <span className={`font-medium ${POLLEN_COLOR[data.dominantPollen.level]}`}>
              {POLLEN_LABEL[data.dominantPollen.level]}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
