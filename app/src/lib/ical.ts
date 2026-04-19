import type { GCalEvent } from './gcal'

function unfold(raw: string): string[] {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n')
    .filter(l => l.length > 0)
}

function unescape(val: string): string {
  return val
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

function parseDt(prop: string, val: string): { date?: string; dateTime?: string } {
  if (prop.includes('VALUE=DATE')) {
    return { date: `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}` }
  }
  const y = val.slice(0, 4), mo = val.slice(4, 6), d = val.slice(6, 8)
  const h = val.slice(9, 11), mi = val.slice(11, 13), s = val.slice(13, 15) || '00'
  if (val.endsWith('Z')) {
    return { dateTime: `${y}-${mo}-${d}T${h}:${mi}:${s}Z` }
  }
  // TZID or floating — treat as local time (correct when device tz = calendar tz)
  return { dateTime: `${y}-${mo}-${d}T${h}:${mi}:${s}` }
}

export function parseIcal(raw: string, { maxResults = 50, windowDays = 60 } = {}): GCalEvent[] {
  const lines = unfold(raw)
  const now = Date.now()
  const windowEnd = now + windowDays * 86400000

  const events: GCalEvent[] = []
  let inEvent = false
  let ev: Partial<GCalEvent> = {}

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; ev = { start: {}, end: {} }; continue }
    if (line === 'END:VEVENT') {
      inEvent = false
      if (ev.id && (ev.summary !== undefined)) {
        const startMs = ev.start?.dateTime
          ? new Date(ev.start.dateTime).getTime()
          : ev.start?.date ? new Date(ev.start.date + 'T00:00:00').getTime() : null
        if (startMs !== null && startMs >= now - 60000 && startMs <= windowEnd) {
          events.push(ev as GCalEvent)
        }
      }
      continue
    }
    if (!inEvent) continue

    const ci = line.indexOf(':')
    if (ci === -1) continue
    const prop = line.slice(0, ci).toUpperCase()
    const val = unescape(line.slice(ci + 1))

    if (prop === 'UID') ev.id = val
    else if (prop === 'SUMMARY') ev.summary = val
    else if (prop === 'LOCATION') ev.location = val
    else if (prop.startsWith('DTSTART')) ev.start = parseDt(prop, val)
    else if (prop.startsWith('DTEND')) ev.end = parseDt(prop, val)
  }

  events.sort((a, b) => {
    const ta = a.start.dateTime ?? (a.start.date + 'T00:00:00')
    const tb = b.start.dateTime ?? (b.start.date + 'T00:00:00')
    return ta < tb ? -1 : ta > tb ? 1 : 0
  })

  return events.slice(0, maxResults)
}
