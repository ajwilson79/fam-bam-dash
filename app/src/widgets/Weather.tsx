import React from 'react'
import { codeToIcon, fetchWeather, getEnvCoords, type WeatherData } from '../lib/weather'

export default function Weather() {
  const [data, setData] = React.useState<WeatherData | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const { lat, lon } = getEnvCoords()
        const w = await fetchWeather(lat, lon)
        if (mounted) setData(w)
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Weather failed')
      }
    }
    load()
    const id = setInterval(load, 15 * 60 * 1000) // refresh every 15 min
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  if (error) return <div className="text-red-400">{error}</div>
  if (!data) return <div>Loading weather…</div>

  const currentIcon = codeToIcon(data.current.weathercode)
  const days = data.daily.time?.slice(0, 5) || []

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="text-5xl">{currentIcon}</div>
        <div>
          <div className="text-4xl font-bold">{Math.round(data.current.temperature)}°</div>
          <div className="text-sm text-slate-300">Wind {Math.round(data.current.windspeed)} km/h</div>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {days.map((d, i) => (
          <div key={d} className="bg-slate-700 rounded-lg p-2 text-center">
            <div className="text-xs text-slate-300">{new Date(d).toLocaleDateString(undefined, { weekday: 'short' })}</div>
            <div className="text-2xl my-1">{codeToIcon(data.daily.weathercode[i])}</div>
            <div className="text-sm">
              <span className="font-semibold">{Math.round(data.daily.temperature_2m_max[i])}°</span>
              <span className="text-slate-300"> / {Math.round(data.daily.temperature_2m_min[i])}°</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
