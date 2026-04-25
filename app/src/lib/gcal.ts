import { withRetry } from './retry'
import { parseIcal } from './ical'
import { fetchAllOAuthEvents } from './gapi'
import { loadAccounts } from './oauth'

export type GCalEvent = {
  id: string
  summary?: string
  location?: string
  htmlLink?: string
  start: { date?: string; dateTime?: string; timeZone?: string }
  end: { date?: string; dateTime?: string; timeZone?: string }
  calendarColor?: string
}

async function saveCalendarCache(events: GCalEvent[]): Promise<void> {
  fetch('/api/calendar-cache', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(events),
  }).catch(() => {})
}

async function loadCalendarCache(): Promise<GCalEvent[] | null> {
  try {
    const res = await fetch('/api/calendar-cache')
    if (!res.ok) return null
    const data = await res.json() as unknown
    return Array.isArray(data) && data.length > 0 ? data as GCalEvent[] : null
  } catch {
    return null
  }
}

export async function fetchUpcomingEvents({
  maxResults = 10,
  windowDays = 60,
  calendarId: calendarIdOverride,
}: { maxResults?: number; windowDays?: number; calendarId?: string } = {}): Promise<GCalEvent[]> {
  try {
    const events = await withRetry(async () => {
      // 1. OAuth — preferred when accounts are connected
      if (loadAccounts().length > 0) {
        return fetchAllOAuthEvents({ windowDays, maxResults })
      }

      // 2. iCal proxy (Vite server-side feed, no API key needed)
      const icalRes = await fetch('/api/ical').catch(() => null)
      if (icalRes?.ok) {
        const text = await icalRes.text()
        if (text.includes('BEGIN:VCALENDAR')) {
          return parseIcal(text, { maxResults, windowDays })
        }
      }

      // 3. Google Calendar JSON API (requires VITE_GCAL_API_KEY)
      const key = import.meta.env.VITE_GCAL_API_KEY as string | undefined
      const calendarId = calendarIdOverride || (import.meta.env.VITE_GCAL_CALENDAR_ID as string | undefined)
      if (!key || !calendarId) throw new Error('No calendar source configured. Connect a Google account in the admin panel.')

      const now = new Date()
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
      url.searchParams.set('key', key)
      url.searchParams.set('singleEvents', 'true')
      url.searchParams.set('orderBy', 'startTime')
      url.searchParams.set('timeMin', now.toISOString())
      url.searchParams.set('timeMax', new Date(now.getTime() + windowDays * 86400000).toISOString())
      url.searchParams.set('maxResults', String(maxResults))
      url.searchParams.set('fields', 'items(id,summary,location,htmlLink,start,end)')

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`Google Calendar error: ${res.status} ${await res.text()}`)
      const json = await res.json() as { items?: GCalEvent[] }
      return json.items ?? []
    })
    // Persist fresh events to server cache for remote browsers and offline fallback
    saveCalendarCache(events)
    return events
  } catch (primaryError) {
    // Primary fetch failed — serve whatever was last cached
    const cached = await loadCalendarCache()
    if (cached) return cached
    throw primaryError
  }
}

export function formatEventTime(ev: GCalEvent): string {
  const optsDate: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
  if (!ev.start.dateTime && ev.start.date) {
    return `${new Date(ev.start.date).toLocaleDateString(undefined, optsDate)} • All day`
  }
  const start = ev.start.dateTime ? new Date(ev.start.dateTime) : ev.start.date ? new Date(ev.start.date) : null
  const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : null
  if (!start) return 'TBA'
  const optsTime: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
  const datePart = start.toLocaleDateString(undefined, optsDate)
  if (!end) return `${datePart} • ${start.toLocaleTimeString(undefined, optsTime)}`
  const sameDay = start.toDateString() === end.toDateString()
  if (sameDay) return `${datePart} • ${start.toLocaleTimeString(undefined, optsTime)} – ${end.toLocaleTimeString(undefined, optsTime)}`
  return `${datePart} • ${start.toLocaleTimeString(undefined, optsTime)}`
}
