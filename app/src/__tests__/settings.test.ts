import { describe, it, expect, vi } from 'vitest'
import { defaultSettings, loadSettings, setSettings, subscribeSettings } from '../lib/settings'

describe('defaultSettings', () => {
  it('returns valid defaults', () => {
    const s = defaultSettings()
    expect(s.weather.lat).toBeTypeOf('number')
    expect(s.weather.lon).toBeTypeOf('number')
    expect(s.weather.refreshIntervalMs).toBeGreaterThanOrEqual(60_000)
    expect(s.calendar.maxEvents).toBe(10)
    expect(s.calendar.refreshIntervalMs).toBeGreaterThanOrEqual(60_000)
    expect(s.slideshow.intervalMs).toBe(12000)
    expect(s.theme).toBe('dark')
  })
})

describe('loadSettings', () => {
  it('returns defaults when localStorage is empty', () => {
    const s = loadSettings()
    expect(s).toEqual(defaultSettings())
  })

  it('round-trips through setSettings', () => {
    const s = defaultSettings()
    s.weather.lat = 51.5
    s.weather.lon = -0.1
    s.theme = 'light'
    setSettings(s)
    expect(loadSettings()).toEqual(s)
  })

  it('falls back to defaults on corrupt JSON', () => {
    localStorage.setItem('fam-bam-settings', 'not-json{{{')
    expect(loadSettings()).toEqual(defaultSettings())
  })

  it('clamps out-of-range lat/lon', () => {
    localStorage.setItem('fam-bam-settings', JSON.stringify({ weather: { lat: 999, lon: -999 } }))
    const s = loadSettings()
    expect(s.weather.lat).toBe(90)
    expect(s.weather.lon).toBe(-180)
  })

  it('clamps refreshIntervalMs to minimum', () => {
    localStorage.setItem('fam-bam-settings', JSON.stringify({
      weather: { refreshIntervalMs: 1 },
      calendar: { refreshIntervalMs: 0 },
    }))
    const s = loadSettings()
    expect(s.weather.refreshIntervalMs).toBe(60_000)
    expect(s.calendar.refreshIntervalMs).toBe(60_000)
  })

  it('clamps maxEvents', () => {
    localStorage.setItem('fam-bam-settings', JSON.stringify({ calendar: { maxEvents: 999 } }))
    expect(loadSettings().calendar.maxEvents).toBe(50)
  })

  it('falls back boolean fields to default when non-boolean', () => {
    localStorage.setItem('fam-bam-settings', JSON.stringify({ slideshow: { shuffle: 'yes', useGooglePhotos: 1 } }))
    const s = loadSettings()
    expect(s.slideshow.shuffle).toBe(defaultSettings().slideshow.shuffle)
    expect(s.slideshow.useGooglePhotos).toBe(defaultSettings().slideshow.useGooglePhotos)
  })

  it('defaults unknown theme to dark', () => {
    localStorage.setItem('fam-bam-settings', JSON.stringify({ theme: 'purple' }))
    expect(loadSettings().theme).toBe('dark')
  })
})

describe('subscribeSettings', () => {
  it('notifies listeners on setSettings', () => {
    const listener = vi.fn()
    const unsub = subscribeSettings(listener)
    setSettings(defaultSettings())
    expect(listener).toHaveBeenCalledTimes(1)
    unsub()
  })

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn()
    const unsub = subscribeSettings(listener)
    unsub()
    setSettings(defaultSettings())
    expect(listener).not.toHaveBeenCalled()
  })
})
