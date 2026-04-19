export type Settings = {
  weather: { zip: string; lat: number; lon: number; refreshIntervalMs: number; units: 'imperial' | 'metric' }
  calendar: { calendarId: string; maxEvents: number; refreshIntervalMs: number }
  slideshow: { intervalMs: number; shuffle: boolean; useGooglePhotos: boolean }
  theme: 'dark' | 'light'
}

const KEY = 'fam-bam-settings'
const DEFAULT_REFRESH_MS = 15 * 60 * 1000

export function defaultSettings(): Settings {
  return {
    weather: {
      zip: '',
      lat: Number(import.meta.env.VITE_LAT) || 37.7749,
      lon: Number(import.meta.env.VITE_LON) || -122.4194,
      refreshIntervalMs: DEFAULT_REFRESH_MS,
      units: 'imperial',
    },
    calendar: {
      calendarId: String(import.meta.env.VITE_GCAL_CALENDAR_ID || ''),
      maxEvents: 10,
      refreshIntervalMs: DEFAULT_REFRESH_MS,
    },
    slideshow: { intervalMs: 12000, shuffle: true, useGooglePhotos: !!import.meta.env.VITE_GOOGLE_PHOTOS_ALBUM_ID },
    theme: 'dark',
  }
}

function num(val: unknown, fallback: number, min: number, max: number): number {
  const n = Number(val)
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback
}

function boolOr(val: unknown, fallback: boolean): boolean {
  return typeof val === 'boolean' ? val : fallback
}

function strOr(val: unknown, fallback: string): string {
  return typeof val === 'string' ? val : fallback
}

function obj(val: unknown): Record<string, unknown> {
  return val !== null && typeof val === 'object' ? (val as Record<string, unknown>) : {}
}

function validateSettings(raw: unknown): Settings {
  const def = defaultSettings()
  if (raw === null || typeof raw !== 'object') return def
  const r = raw as Record<string, unknown>
  const w = obj(r.weather)
  const c = obj(r.calendar)
  const sl = obj(r.slideshow)
  return {
    weather: {
      zip: strOr(w.zip, def.weather.zip),
      lat: num(w.lat, def.weather.lat, -90, 90),
      lon: num(w.lon, def.weather.lon, -180, 180),
      refreshIntervalMs: num(w.refreshIntervalMs, def.weather.refreshIntervalMs, 60_000, 86_400_000),
      units: w.units === 'metric' ? 'metric' : 'imperial',
    },
    calendar: {
      calendarId: strOr(c.calendarId, def.calendar.calendarId),
      maxEvents: Math.round(num(c.maxEvents, def.calendar.maxEvents, 1, 50)),
      refreshIntervalMs: num(c.refreshIntervalMs, def.calendar.refreshIntervalMs, 60_000, 86_400_000),
    },
    slideshow: {
      intervalMs: num(sl.intervalMs, def.slideshow.intervalMs, 3_000, 3_600_000),
      shuffle: boolOr(sl.shuffle, def.slideshow.shuffle),
      useGooglePhotos: boolOr(sl.useGooglePhotos, def.slideshow.useGooglePhotos),
    },
    theme: r.theme === 'light' ? 'light' : 'dark',
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultSettings()
    return validateSettings(JSON.parse(raw))
  } catch {
    return defaultSettings()
  }
}

const listeners = new Set<() => void>()
export function subscribeSettings(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function setSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } finally {
    listeners.forEach((fn) => {
      try { fn() } catch {}
    })
  }
}
