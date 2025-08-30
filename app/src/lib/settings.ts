export type Settings = {
  weather: { lat: number; lon: number }
  calendar: { calendarId: string; maxEvents: number }
  slideshow: { intervalMs: number; shuffle: boolean; useGooglePhotos: boolean }
}

const KEY = 'fam-bam-settings'

export function defaultSettings(): Settings {
  return {
    weather: { lat: Number(import.meta.env.VITE_LAT) || 37.7749, lon: Number(import.meta.env.VITE_LON) || -122.4194 },
    calendar: { calendarId: String(import.meta.env.VITE_GCAL_CALENDAR_ID || ''), maxEvents: 10 },
    slideshow: { intervalMs: 12000, shuffle: true, useGooglePhotos: !!import.meta.env.VITE_GOOGLE_PHOTOS_ALBUM_ID },
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultSettings()
    const parsed = JSON.parse(raw)
    return { ...defaultSettings(), ...parsed }
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
}
