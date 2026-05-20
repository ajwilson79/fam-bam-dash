import { describe, it, expect, vi } from 'vitest'
import {
  defaultSettings, effectiveTheme, loadSettings, setSettings, subscribeSettings, themeForHour,
} from '../lib/settings'

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

  it('defaults autoTheme and clamps out-of-range hours', () => {
    expect(loadSettings().autoTheme).toEqual(defaultSettings().autoTheme)
    localStorage.setItem('fam-bam-settings', JSON.stringify({
      autoTheme: { enabled: true, lightStartHour: 99, darkStartHour: -5 },
    }))
    const s = loadSettings()
    expect(s.autoTheme.enabled).toBe(true)
    expect(s.autoTheme.lightStartHour).toBe(23)
    expect(s.autoTheme.darkStartHour).toBe(0)
  })
})

describe('themeForHour', () => {
  it('returns light inside a normal daytime window [7, 21)', () => {
    expect(themeForHour(7, 7, 21)).toBe('light')
    expect(themeForHour(12, 7, 21)).toBe('light')
    expect(themeForHour(20, 7, 21)).toBe('light')
  })

  it('returns dark outside the window, boundary-exclusive at darkStart', () => {
    expect(themeForHour(21, 7, 21)).toBe('dark')
    expect(themeForHour(23, 7, 21)).toBe('dark')
    expect(themeForHour(6, 7, 21)).toBe('dark')
  })

  it('handles a window that wraps past midnight (light 21 → 7)', () => {
    expect(themeForHour(23, 21, 7)).toBe('light')
    expect(themeForHour(3, 21, 7)).toBe('light')
    expect(themeForHour(7, 21, 7)).toBe('dark')
    expect(themeForHour(12, 21, 7)).toBe('dark')
  })

  it('returns dark when the two hours are equal', () => {
    expect(themeForHour(10, 9, 9)).toBe('dark')
  })
})

describe('effectiveTheme', () => {
  it('returns the manual theme when autoTheme is disabled', () => {
    const s = { ...defaultSettings(), theme: 'light' as const }
    expect(effectiveTheme(s, new Date(2026, 0, 1, 2))).toBe('light')
  })

  it('returns the scheduled theme when autoTheme is enabled', () => {
    const s = {
      ...defaultSettings(),
      theme: 'light' as const,
      autoTheme: { enabled: true, lightStartHour: 7, darkStartHour: 21 },
    }
    expect(effectiveTheme(s, new Date(2026, 0, 1, 13))).toBe('light')
    expect(effectiveTheme(s, new Date(2026, 0, 1, 23))).toBe('dark')
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
