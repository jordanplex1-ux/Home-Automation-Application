import { Droplets, Wind, Thermometer, Leaf, Waves } from 'lucide-react'
import { getWeatherIconUrl } from '../../../services/weather.service'
import type { CurrentWeather } from '../../../services/types/weather.types'
import {
  AQI_LABEL,
  AQI_COLOR,
  POLLEN_LABEL,
  POLLEN_COLOR,
  type AirQualityData
} from '../../../services/air-quality.service'

interface CurrentWeatherViewProps {
  data: CurrentWeather
  air?: AirQualityData | null
}

export function CurrentWeatherView({ data, air }: CurrentWeatherViewProps) {
  return (
    <div className="flex items-center gap-5">
      {/* Icon + temp — left column. */}
      <div className="flex items-center gap-1 shrink-0">
        <img
          src={getWeatherIconUrl(data.icon)}
          alt={data.description}
          className="w-20 h-20 -ml-3"
        />
        <div>
          <p className="text-5xl font-light text-text-primary tabular-nums leading-none">
            {data.temp}°
          </p>
          <p className="text-xs text-text-secondary capitalize mt-1.5">{data.description}</p>
        </div>
      </div>

      {/* Details — two explicit columns so stat ordering is independent of
          row-by-row grid flow. Left column: core weather stats. Right column:
          air quality + pollen. All values on-screen (touchscreen — no tooltips). */}
      <div className="shrink-0 flex gap-6 text-xs">
        {/* Left column */}
        <div className="flex flex-col gap-1.5">
          <Stat icon={<Thermometer size={14} />} label={`Feels ${data.feelsLike}°`} />
          <Stat icon={<Wind size={14} />} label={`${data.windSpeed} km/h`} />
          <Stat icon={<Droplets size={14} />} label={`${data.humidity}%`} />
        </div>

        {/* Right column — only rendered when air quality data is available */}
        {air && (
          <div className="flex flex-col gap-1.5">
            <Stat
              icon={<Waves size={14} className={AQI_COLOR[air.aqiBand]} />}
              label={
                <>
                  <span className="text-text-disabled">Air</span>
                  {' '}
                  <span className={AQI_COLOR[air.aqiBand]}>{AQI_LABEL[air.aqiBand]}</span>
                  {air.aqi != null && (
                    <>
                      {' '}
                      <span className="text-text-disabled tabular-nums">
                        ({Math.round(air.aqi)})
                      </span>
                    </>
                  )}
                </>
              }
            />
            {air.pm10 != null && (
              <Stat
                icon={<PMIcon text="10" />}
                label={
                  <span className="tabular-nums">
                    {air.pm10.toFixed(1)}
                    <span className="text-text-disabled ml-0.5">µg</span>
                  </span>
                }
              />
            )}
            {air.pm25 != null && (
              <Stat
                icon={<PMIcon text="2.5" />}
                label={
                  <span className="tabular-nums">
                    {air.pm25.toFixed(1)}
                    <span className="text-text-disabled ml-0.5">µg</span>
                  </span>
                }
              />
            )}
            {air.dominantPollen && (
              <Stat
                icon={<Leaf size={14} className={POLLEN_COLOR[air.dominantPollen.level]} />}
                label={
                  <>
                    <span className="text-text-secondary">{air.dominantPollen.type}</span>
                    {' '}
                    <span className={POLLEN_COLOR[air.dominantPollen.level]}>
                      {POLLEN_LABEL[air.dominantPollen.level]}
                    </span>
                    {' '}
                    <span className="text-text-disabled tabular-nums">
                      ({Math.round(air.dominantPollen.value)})
                    </span>
                  </>
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PMIcon({ text }: { text: string }) {
  return (
    <span className="text-[9px] text-text-disabled font-semibold tabular-nums leading-none">
      PM{text}
    </span>
  )
}

interface StatProps {
  icon: React.ReactNode
  label: React.ReactNode
}

function Stat({ icon, label }: StatProps) {
  return (
    <div className="flex items-center gap-2 text-text-secondary whitespace-nowrap">
      <span className="shrink-0 w-5 h-4 flex items-center justify-center">{icon}</span>
      <span>{label}</span>
    </div>
  )
}
