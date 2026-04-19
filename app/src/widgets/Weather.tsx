import { useEffect, useState } from 'react'
import { codeToIcon, fetchWeather, type WeatherData } from '../lib/weather'
import { loadSettings, subscribeSettings } from '../lib/settings'
import { debounce } from '../lib/utils'

function useWeather() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let intervalId: ReturnType<typeof setInterval> | undefined

    async function load() {
      try {
        setError(null)
        const s = loadSettings()
        const w = await fetchWeather(s.weather.lat, s.weather.lon, s.weather.units === 'imperial')
        if (mounted) setData(w)
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Weather failed')
      }
    }

    function scheduleInterval() {
      clearInterval(intervalId)
      intervalId = setInterval(load, loadSettings().weather.refreshIntervalMs)
    }

    load()
    scheduleInterval()
    const unsub = subscribeSettings(debounce(() => { load(); scheduleInterval() }, 300))

    return () => {
      mounted = false
      clearInterval(intervalId)
      unsub()
    }
  }, [])

  return { data, error }
}

// Compact: current conditions only — lives in the clock row
export default function Weather() {
  const { data, error } = useWeather()
  const imperial = loadSettings().weather.units === 'imperial'

  if (error) return <div style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</div>
  if (!data) return <div className="text-theme-muted" style={{ fontSize: '0.875rem' }}>Loading…</div>

  return (
    <div className="weather-current">
      <span className="weather-icon">{codeToIcon(data.current.weathercode)}</span>
      <div>
        <div className="weather-temp">{Math.round(data.current.temperature)}°</div>
        <div className="weather-wind">Wind {Math.round(data.current.windspeed)} {imperial ? 'mph' : 'km/h'}</div>
      </div>
    </div>
  )
}

// Full: 5-day forecast + hourly — spans full width below the clock row
export function WeatherFull() {
  const { data } = useWeather()

  if (!data) return null

  const days = data.daily.time?.slice(0, 5) || []

  const currentHour = new Date().getHours()
  const todayStr = new Date().toISOString().slice(0, 10)
  const startIdx = data.hourly.time.findIndex(
    t => t.startsWith(todayStr) && parseInt(t.slice(11, 13)) === currentHour
  )
  const hourlySlots = data.hourly.time
    .map((t, i) => ({ t, i }))
    .slice(startIdx >= 0 ? startIdx : 0, startIdx >= 0 ? startIdx + 24 : 24)

  return (
    <div className="weather-full">
      {hourlySlots.length > 0 && (
        <div className="weather-hourly">
          {hourlySlots.map(({ t, i }) => {
            const hour = parseInt(t.slice(11, 13))
            const isCurrent = hour === new Date().getHours()
            const label = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`
            const pop = data.hourly.precipitation_probability[i]
            return (
              <div key={t} className={`weather-hour${isCurrent ? ' is-now' : ''}`}>
                <div className="weather-hour-time">{isCurrent ? 'Now' : label}</div>
                <div className="weather-hour-icon">{codeToIcon(data.hourly.weathercode[i])}</div>
                <div className="weather-hour-temp">{Math.round(data.hourly.temperature_2m[i])}°</div>
                {pop > 0 && <div className="weather-hour-pop">{pop}%</div>}
              </div>
            )
          })}
        </div>
      )}

      <div className="weather-forecast">
        {days.map((d, i) => (
          <div key={d} className="weather-day">
            <div className="weather-day-name">
              {new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
            </div>
            <div className="weather-day-icon">{codeToIcon(data.daily.weathercode[i])}</div>
            <div className="weather-day-high">{Math.round(data.daily.temperature_2m_max[i])}°</div>
            <div className="weather-day-low">{Math.round(data.daily.temperature_2m_min[i])}°</div>
          </div>
        ))}
      </div>
    </div>
  )
}
