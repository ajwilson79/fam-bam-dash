import { withRetry } from './retry'

export type WeatherData = {
  current: {
    temperature: number
    windspeed: number
    weathercode: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    weathercode: number[]
    precipitation_probability: number[]
  }
  daily: {
    time: string[]
    weathercode: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
}

export type ZipResult = { lat: number; lon: number; city: string; state: string }

export async function zipToLatLon(zip: string): Promise<ZipResult> {
  const res = await fetch(`https://api.zippopotam.us/us/${zip.trim()}`)
  if (!res.ok) throw new Error(`ZIP code "${zip}" not found`)
  const data = await res.json() as {
    places: Array<{ 'place name': string; state: string; latitude: string; longitude: string }>
  }
  const place = data.places?.[0]
  if (!place) throw new Error(`No location for ZIP "${zip}"`)
  return {
    lat: parseFloat(place.latitude),
    lon: parseFloat(place.longitude),
    city: place['place name'],
    state: place.state,
  }
}

export function getEnvCoords() {
  const lat = import.meta.env.VITE_LAT
  const lon = import.meta.env.VITE_LON
  if (!lat || !lon) throw new Error('Missing VITE_LAT or VITE_LON in env')
  return { lat: Number(lat), lon: Number(lon) }
}

export async function fetchWeather(lat: number, lon: number, imperial = false): Promise<WeatherData> {
  return withRetry(async () => {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: 'temperature_2m,weather_code,wind_speed_10m',
      hourly: 'temperature_2m,weather_code,precipitation_probability',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min',
      forecast_days: '6',
      timezone: 'auto',
      ...(imperial ? { temperature_unit: 'fahrenheit', wind_speed_unit: 'mph' } : {}),
    })
    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch weather')
    const json = await res.json()
    return {
      current: {
        temperature: json.current?.temperature_2m,
        windspeed: json.current?.wind_speed_10m,
        weathercode: json.current?.weather_code,
      },
      hourly: {
        time: json.hourly?.time ?? [],
        temperature_2m: json.hourly?.temperature_2m ?? [],
        weathercode: json.hourly?.weather_code ?? [],
        precipitation_probability: json.hourly?.precipitation_probability ?? [],
      },
      daily: {
        time: json.daily?.time,
        weathercode: json.daily?.weather_code,
        temperature_2m_max: json.daily?.temperature_2m_max,
        temperature_2m_min: json.daily?.temperature_2m_min,
      },
    }
  })
}

export function codeToIcon(code: number): string {
  if ([0].includes(code)) return '☀️'
  if ([1, 2].includes(code)) return '🌤️'
  if ([3].includes(code)) return '☁️'
  if ([45, 48].includes(code)) return '🌫️'
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️'
  if ([61, 63, 65, 66, 67].includes(code)) return '🌧️'
  if ([71, 73, 75, 77].includes(code)) return '❄️'
  if ([80, 81, 82].includes(code)) return '🌧️'
  if ([85, 86].includes(code)) return '❄️'
  if ([95, 96, 99].includes(code)) return '⛈️'
  return '🌡️'
}
