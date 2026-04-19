import { useEffect, useState } from 'react'
import { fetchUpcomingEvents, type GCalEvent } from '../lib/gcal'
import { loadSettings, subscribeSettings } from '../lib/settings'
import { debounce } from '../lib/utils'

function getDayLabel(dayStart: Date, todayStart: Date): string {
  const diff = Math.round((dayStart.getTime() - todayStart.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 7) return dayStart.toLocaleDateString(undefined, { weekday: 'long' })
  return dayStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
}

const TZ = import.meta.env.VITE_TIMEZONE || undefined

function eventTimeShort(ev: GCalEvent): string {
  if (!ev.start.dateTime) return 'All day'
  const d = new Date(ev.start.dateTime)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: TZ })
}

function localDateKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: TZ }) // YYYY-MM-DD
}

function groupByDay(events: GCalEvent[]): Array<{ key: string; label: string; events: GCalEvent[] }> {
  const todayStr = localDateKey(new Date())
  const todayStart = new Date(todayStr + 'T00:00:00')
  const map = new Map<string, { label: string; date: Date; events: GCalEvent[] }>()
  for (const ev of events) {
    const raw = ev.start.dateTime ?? (ev.start.date ? ev.start.date + 'T00:00:00' : null)
    if (!raw) continue
    const d = new Date(raw)
    const key = localDateKey(d)
    if (!map.has(key)) {
      const dayStart = new Date(key + 'T00:00:00')
      map.set(key, { label: getDayLabel(dayStart, todayStart), date: dayStart, events: [] })
    }
    map.get(key)!.events.push(ev)
  }
  return [...map.entries()]
    .filter(([key]) => key >= todayStr)
    .map(([key, val]) => ({ key, ...val }))
}

function CalendarSkeleton() {
  return (
    <div className="agenda-wrap">
      <div className="widget-label">Schedule</div>
      {[0, 1, 2].map(i => (
        <div key={i} className="agenda-day">
          <div className="animate-pulse" style={{ height: '11px', background: 'var(--color-divider)', borderRadius: '3px', width: '50%', marginBottom: '8px' }} />
          <div className="animate-pulse" style={{ height: '13px', background: 'var(--color-divider)', borderRadius: '3px', width: '80%', marginBottom: '4px' }} />
          <div className="animate-pulse" style={{ height: '13px', background: 'var(--color-divider)', borderRadius: '3px', width: '65%' }} />
        </div>
      ))}
    </div>
  )
}

export default function Calendar() {
  const [events, setEvents] = useState<GCalEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let intervalId: ReturnType<typeof setInterval> | undefined

    async function load() {
      try {
        setError(null)
        const s = loadSettings()
        const evs = await fetchUpcomingEvents({
          calendarId: s.calendar.calendarId,
          maxResults: 100,
          windowDays: 30,
        })
        if (mounted) setEvents(evs)
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Calendar failed')
      }
    }

    function scheduleInterval() {
      clearInterval(intervalId)
      intervalId = setInterval(load, loadSettings().calendar.refreshIntervalMs)
    }

    load()
    scheduleInterval()
    const unsub = subscribeSettings(debounce(() => { load(); scheduleInterval() }, 300))

    return () => {
      mounted = false
      clearInterval(intervalId)
      unsub()
    }
  }, [])

  if (error) return (
    <div className="agenda-wrap">
      <div className="widget-label">Schedule</div>
      <div style={{ color: '#f87171', fontSize: '0.8rem' }}>{error}</div>
    </div>
  )

  if (!events) return <CalendarSkeleton />

  const days = groupByDay(events)

  if (days.length === 0) return (
    <div className="agenda-wrap">
      <div className="widget-label">Schedule</div>
      <div className="text-theme-muted" style={{ fontSize: '0.8rem' }}>No upcoming events</div>
    </div>
  )

  return (
    <div className="agenda-wrap">
      <div className="widget-label">Schedule</div>
      {days.map(day => (
        <div key={day.key} className="agenda-day">
          <div className="agenda-day-label">{day.label}</div>
          {day.events.map(ev => (
            <div key={ev.id} className="agenda-event">
              <span
                className="agenda-event-dot"
                style={ev.calendarColor ? { background: ev.calendarColor } : { visibility: 'hidden' }}
              />
              <div className="agenda-event-time">{eventTimeShort(ev)}</div>
              <div className="agenda-event-title">{ev.summary || 'Untitled'}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
