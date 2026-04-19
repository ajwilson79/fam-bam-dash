import { useEffect, useState } from 'react'
import { codeToIcon, fetchWeather, type WeatherData } from '../lib/weather'
import { loadSettings, subscribeSettings } from '../lib/settings'
import { debounce } from '../lib/utils'

export default function Weather() {
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

  if (error) return <div style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</div>
  if (!data) return <div className="text-theme-muted" style={{ fontSize: '0.875rem' }}>Loading weather…</div>

  const imperial = loadSettings().weather.units === 'imperial'
  const currentIcon = codeToIcon(data.current.weathercode)
  const days = data.daily.time?.slice(0, 5) || []

  return (
    <div className="weather-portrait">
      <div className="weather-current">
        <span className="weather-icon">{currentIcon}</span>
        <div>
          <div className="weather-temp">{Math.round(data.current.temperature)}°</div>
          <div className="weather-wind">Wind {Math.round(data.current.windspeed)} {imperial ? 'mph' : 'km/h'}</div>
        </div>
      </div>

      <div className="weather-forecast">
        {days.map((d, i) => (
          <div key={d} className="weather-day">
            <div className="weather-day-name">
              {new Date(d).toLocaleDateString(undefined, { weekday: 'short' })}
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
