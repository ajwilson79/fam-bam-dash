import { describe, it, expect, vi, afterEach } from 'vitest'
import { codeToIcon, fetchWeather } from '../lib/weather'

afterEach(() => vi.restoreAllMocks())

describe('codeToIcon', () => {
  it('maps clear sky', () => expect(codeToIcon(0)).toBe('☀️'))
  it('maps partly cloudy', () => expect(codeToIcon(1)).toBe('🌤️'))
  it('maps overcast', () => expect(codeToIcon(3)).toBe('☁️'))
  it('maps fog', () => expect(codeToIcon(45)).toBe('🌫️'))
  it('maps drizzle', () => expect(codeToIcon(51)).toBe('🌦️'))
  it('maps rain', () => expect(codeToIcon(61)).toBe('🌧️'))
  it('maps snow', () => expect(codeToIcon(71)).toBe('❄️'))
  it('maps thunderstorm', () => expect(codeToIcon(95)).toBe('⛈️'))
  it('falls back for unknown code', () => expect(codeToIcon(999)).toBe('🌡️'))
})

describe('fetchWeather', () => {
  it('normalises API response', async () => {
    const mockJson = {
      current: { temperature_2m: 20, wind_speed_10m: 10, weather_code: 1 },
      daily: {
        time: ['2024-01-01', '2024-01-02'],
        weather_code: [0, 1],
        temperature_2m_max: [22, 20],
        temperature_2m_min: [15, 13],
      },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockJson }))

    const data = await fetchWeather(37.77, -122.42)
    expect(data.current.temperature).toBe(20)
    expect(data.current.windspeed).toBe(10)
    expect(data.current.weathercode).toBe(1)
    expect(data.daily.time).toEqual(['2024-01-01', '2024-01-02'])
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(fetchWeather(0, 0)).rejects.toThrow('Failed to fetch weather')
  })

  it('retries on failure and succeeds', async () => {
    vi.useFakeTimers()
    const mockJson = {
      current: { temperature_2m: 5, wind_speed_10m: 3, weather_code: 0 },
      daily: { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [] },
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValue({ ok: true, json: async () => mockJson })
    vi.stubGlobal('fetch', fetchMock)

    const promise = fetchWeather(0, 0)
    await vi.runAllTimersAsync()
    const data = await promise
    expect(data.current.temperature).toBe(5)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})
