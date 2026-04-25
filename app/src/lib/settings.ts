import { adminHeaders } from './admin'

export type Settings = {
  weather: { zip: string; lat: number; lon: number; refreshIntervalMs: number; units: 'imperial' | 'metric' }
  calendar: { calendarId: string; maxEvents: number; refreshIntervalMs: number }
  slideshow: { intervalMs: number; shuffle: boolean; useGooglePhotos: boolean }
  todo: { autoRemoveMinutes: number }
  idle: { enabled: boolean; timeoutMinutes: number }
  motionSensor: {
    nightStartHour: number   // 0–23, hour when night mode begins (default 22 = 10pm)
    nightEndHour: number     // 0–23, hour when night mode ends (default 7 = 7am)
    dayScreenOffMinutes: number   // minutes of no motion before screen off during day
    nightScreenOffMinutes: number // minutes of no motion before screen off at night
  }
  theme: 'dark' | 'light'
}

const KEY = 'fam-bam-settings'
const DEFAULT_REFRESH_MS = 15 * 60 * 1000

// Stable per-tab ID so the server can skip reloading the tab that made the change
export function getTabId(): string {
  let id = sessionStorage.getItem('fam-bam-tab-id')
  if (!id) {
    id = Math.random().toString(36).slice(2, 10)
    sessionStorage.setItem('fam-bam-tab-id', id)
  }
  return id
}

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
    todo: { autoRemoveMinutes: 10 },
    idle: { enabled: true, timeoutMinutes: 5 },
    motionSensor: {
      nightStartHour: 22,
      nightEndHour: 7,
      dayScreenOffMinutes: 10,
      nightScreenOffMinutes: 1,
    },
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
  const td = obj(r.todo)
  const il = obj(r.idle)
  const ms = obj(r.motionSensor)
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
    todo: {
      autoRemoveMinutes: Math.round(num(td.autoRemoveMinutes, def.todo.autoRemoveMinutes, 1, 1440)),
    },
    idle: {
      enabled: boolOr(il.enabled, def.idle.enabled),
      timeoutMinutes: Math.round(num(il.timeoutMinutes, def.idle.timeoutMinutes, 1, 1440)),
    },
    motionSensor: {
      nightStartHour: Math.round(num(ms.nightStartHour, def.motionSensor.nightStartHour, 0, 23)),
      nightEndHour: Math.round(num(ms.nightEndHour, def.motionSensor.nightEndHour, 0, 23)),
      dayScreenOffMinutes: Math.round(num(ms.dayScreenOffMinutes, def.motionSensor.dayScreenOffMinutes, 1, 1440)),
      nightScreenOffMinutes: Math.round(num(ms.nightScreenOffMinutes, def.motionSensor.nightScreenOffMinutes, 1, 60)),
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

// Restores settings from server file on startup. Server is authoritative — always wins.
export async function syncSettingsFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/settings')
    if (!res.ok) return
    const raw = await res.json() as unknown
    if (raw === null) return
    const validated = validateSettings(raw)
    const validatedStr = JSON.stringify(validated)
    const local = localStorage.getItem(KEY)
    if (local !== validatedStr) {
      localStorage.setItem(KEY, validatedStr)
      listeners.forEach(fn => { try { fn() } catch {} })
    }
  } catch { /* server unavailable — local-only is fine */ }
}

const listeners = new Set<() => void>()
export function subscribeSettings(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function setSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tab-Id': getTabId(), ...adminHeaders() },
      body: JSON.stringify(s),
    }).catch(() => { /* best-effort: dashboard theme toggle 401s silently without PIN, that's fine */ })
  } finally {
    listeners.forEach((fn) => {
      try { fn() } catch { /* ignore subscriber errors */ }
    })
  }
}
