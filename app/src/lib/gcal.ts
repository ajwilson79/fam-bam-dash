export type GCalEvent = {
  id: string
  summary?: string
  location?: string
  htmlLink?: string
  start: { date?: string; dateTime?: string; timeZone?: string }
  end: { date?: string; dateTime?: string; timeZone?: string }
}

export function getEnvGCal() {
  const key = import.meta.env.VITE_GCAL_API_KEY
  const calendarId = import.meta.env.VITE_GCAL_CALENDAR_ID
  if (!key || !calendarId) throw new Error('Missing VITE_GCAL_API_KEY or VITE_GCAL_CALENDAR_ID in env')
  return { key, calendarId }
}

export async function fetchUpcomingEvents({
  maxResults = 10,
  windowDays = 30,
}: { maxResults?: number; windowDays?: number } = {}): Promise<GCalEvent[]> {
  const { key, calendarId } = getEnvGCal()
  const now = new Date()
  const timeMin = now.toISOString()
  const timeMax = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000).toISOString()
  const base = 'https://www.googleapis.com/calendar/v3/calendars'
  const url = new URL(`${base}/${encodeURIComponent(calendarId)}/events`)
  url.searchParams.set('key', key)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('maxResults', String(maxResults))
  url.searchParams.set('fields', 'items(id,summary,location,htmlLink,start,end)')

  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google Calendar error: ${res.status} ${text}`)
  }
  const json = await res.json()
  return (json.items || []) as GCalEvent[]
}

export function formatEventTime(ev: GCalEvent): string {
  const optsDate: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
  const hasTimes = !!ev.start.dateTime || !!ev.end.dateTime
  if (!hasTimes && ev.start.date && ev.end.date) {
    const start = new Date(ev.start.date)
    return `${start.toLocaleDateString(undefined, optsDate)} • All day`
  }
  const start = ev.start.dateTime ? new Date(ev.start.dateTime) : ev.start.date ? new Date(ev.start.date) : null
  const end = ev.end.dateTime ? new Date(ev.end.dateTime) : ev.end.date ? new Date(ev.end.date) : null
  if (!start) return 'TBA'
  const optsTime: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
  const datePart = start.toLocaleDateString(undefined, optsDate)
  if (!end) return `${datePart} • ${start.toLocaleTimeString(undefined, optsTime)}`
  // If end is same day, show time range; else show start date/time
  const sameDay = start.toDateString() === end.toDateString()
  if (sameDay) {
    return `${datePart} • ${start.toLocaleTimeString(undefined, optsTime)} – ${end.toLocaleTimeString(undefined, optsTime)}`
  }
  return `${datePart} • ${start.toLocaleTimeString(undefined, optsTime)}`
}
