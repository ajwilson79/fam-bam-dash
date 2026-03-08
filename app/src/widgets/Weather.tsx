import { useEffect, useState } from 'react'
import { codeToIcon, fetchWeather, type WeatherData } from '../lib/weather'
import { loadSettings, subscribeSettings } from '../lib/settings'

export default function Weather() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const s = loadSettings()
        const w = await fetchWeather(s.weather.lat, s.weather.lon)
        if (mounted) setData(w)
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Weather failed')
      }
    }
    load()
    const id = setInterval(load, 15 * 60 * 1000) // refresh every 15 min
    const unsub = subscribeSettings(() => load())
    return () => {
      mounted = false
      clearInterval(id)
      unsub()
    }
  }, [])

  if (error) return <div className="text-red-400 text-center">{error}</div>
  if (!data) return <div className="text-center text-slate-400">Loading weather…</div>

  const currentIcon = codeToIcon(data.current.weathercode)
  const days = data.daily.time?.slice(0, 5) || []

  return (
    <div className="w-full h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4">Weather</h2>
      
      {/* Current Weather */}
      <div className="flex items-center gap-4 mb-6">
        <div className="text-6xl">{currentIcon}</div>
        <div>
          <div className="text-5xl font-bold tabular-nums">{Math.round(data.current.temperature)}°</div>
          <div className="text-sm text-slate-400">Wind {Math.round(data.current.windspeed)} km/h</div>
        </div>
      </div>

      {/* 5-Day Forecast */}
      <div className="grid grid-cols-5 gap-2">
        {days.map((d, i) => (
          <div key={d} className="bg-slate-700 rounded-lg p-2 text-center">
            <div className="text-xs text-slate-400 mb-1">
              {new Date(d).toLocaleDateString(undefined, { weekday: 'short' })}
            </div>
            <div className="text-2xl my-1">{codeToIcon(data.daily.weathercode[i])}</div>
            <div className="text-xs">
              <div className="font-semibold">{Math.round(data.daily.temperature_2m_max[i])}°</div>
              <div className="text-slate-400">{Math.round(data.daily.temperature_2m_min[i])}°</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
