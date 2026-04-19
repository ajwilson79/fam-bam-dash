import type { GCalEvent } from './gcal'
import {
  getValidToken,
  loadAccounts,
  loadCalendars,
  saveCalendars,
  type CalendarEntry,
} from './oauth'

type GCalListItem = {
  id: string
  summary: string
  backgroundColor?: string
  primary?: boolean
}

export async function fetchCalendarList(email: string): Promise<GCalListItem[]> {
  const token = await getValidToken(email)
  if (!token) throw new Error(`No valid token for ${email}`)
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendarList', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`CalendarList ${res.status}: ${await res.text()}`)
  const json = await res.json() as { items?: GCalListItem[] }
  return json.items ?? []
}

// Fetches the Google calendar list for an account and merges it into stored CalendarEntry list.
// Existing enabled/disabled choices are preserved; new calendars default to enabled.
export async function syncCalendars(email: string): Promise<CalendarEntry[]> {
  const items = await fetchCalendarList(email)
  const existing = loadCalendars()

  const updated: CalendarEntry[] = items.map(item => {
    const prev = existing.find(e => e.accountEmail === email && e.calendarId === item.id)
    return {
      accountEmail: email,
      calendarId: item.id,
      name: item.summary,
      backgroundColor: item.backgroundColor ?? '#4285F4',
      enabled: prev ? prev.enabled : true,
    }
  })

  saveCalendars([...existing.filter(e => e.accountEmail !== email), ...updated])
  return updated
}

export async function fetchEventsForCalendar(
  email: string,
  calendarId: string,
  windowDays: number,
): Promise<GCalEvent[]> {
  const token = await getValidToken(email)
  if (!token) return []

  const now = new Date()
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  )
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('timeMin', now.toISOString())
  url.searchParams.set('timeMax', new Date(now.getTime() + windowDays * 86400000).toISOString())
  url.searchParams.set('maxResults', '100')
  url.searchParams.set('fields', 'items(id,summary,location,htmlLink,start,end)')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const json = await res.json() as { items?: GCalEvent[] }
  return json.items ?? []
}

export async function fetchAllOAuthEvents({
  windowDays = 60,
  maxResults = 100,
} = {}): Promise<GCalEvent[]> {
  const accounts = loadAccounts()
  const calendars = loadCalendars().filter(c => c.enabled)
  if (accounts.length === 0 || calendars.length === 0) return []

  const accountEmails = new Set(accounts.map(a => a.email))
  const active = calendars.filter(c => accountEmails.has(c.accountEmail))

  const results = await Promise.allSettled(
    active.map(c => fetchEventsForCalendar(c.accountEmail, c.calendarId, windowDays))
  )

  const all: GCalEvent[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value)
  }

  // Deduplicate and sort
  const seen = new Set<string>()
  const unique = all.filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true)))
  unique.sort((a, b) => {
    const ta = a.start.dateTime ?? a.start.date! + 'T00:00:00'
    const tb = b.start.dateTime ?? b.start.date! + 'T00:00:00'
    return ta < tb ? -1 : ta > tb ? 1 : 0
  })
  return unique.slice(0, maxResults)
}
