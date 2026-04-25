import { useEffect, useRef, useState } from 'react'
import { fetchUpcomingEvents, type GCalEvent } from '../lib/gcal'
import { loadSettings, subscribeSettings } from '../lib/settings'
import { debounce } from '../lib/utils'

export type CountdownEntry = { id: string; title: string; dateTime: string }

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

function getEventDateTime(ev: GCalEvent): Date | null {
  const raw = ev.start.dateTime ?? (ev.start.date ? ev.start.date + 'T00:00:00' : null)
  return raw ? new Date(raw) : null
}

function formatCountdown(dateTime: string): string {
  const diff = new Date(dateTime).getTime() - Date.now()
  if (diff <= 0) return 'Today!'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

async function loadCountdowns(): Promise<CountdownEntry[]> {
  try {
    const res = await fetch('/api/countdowns')
    if (!res.ok) return []
    const data = await res.json() as unknown
    return Array.isArray(data) ? (data as CountdownEntry[]) : []
  } catch {
    return []
  }
}

function saveCountdowns(entries: CountdownEntry[]): void {
  fetch('/api/countdowns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entries),
  }).catch(() => {})
}

function CountdownSection({ countdowns }: { countdowns: CountdownEntry[] }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const future = countdowns.filter(cd => new Date(cd.dateTime).getTime() > Date.now())
  if (future.length === 0) return null

  return (
    <div className="countdown-section">
      {future.map(cd => (
        <div key={cd.id} className="countdown-card">
          <span className="countdown-name">{cd.title}</span>
          <span className="countdown-time">{formatCountdown(cd.dateTime)}</span>
        </div>
      ))}
    </div>
  )
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
  const [countdowns, setCountdowns] = useState<CountdownEntry[]>([])
  const isCleaningRef = useRef(false)

  // Load persisted countdowns from server on mount
  useEffect(() => {
    loadCountdowns().then(setCountdowns)
  }, [])

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
          windowDays: 90,
        })
        if (mounted) {
          setEvents(evs)
          // Auto-remove countdowns whose event date has passed
          setCountdowns(prev => {
            const now = Date.now()
            const active = prev.filter(cd => new Date(cd.dateTime).getTime() > now)
            if (active.length !== prev.length) {
              isCleaningRef.current = true
              saveCountdowns(active)
              isCleaningRef.current = false
            }
            return active
          })
        }
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

  function toggleCountdown(ev: GCalEvent) {
    const dt = getEventDateTime(ev)
    if (!dt || dt.getTime() <= Date.now()) return
    setCountdowns(prev => {
      const isActive = prev.some(c => c.id === ev.id)
      const updated: CountdownEntry[] = isActive
        ? prev.filter(c => c.id !== ev.id)
        : [...prev, {
            id: ev.id,
            title: ev.summary || 'Untitled',
            dateTime: ev.start.dateTime ?? (ev.start.date! + 'T00:00:00'),
          }]
      saveCountdowns(updated)
      return updated
    })
  }

  if (error) return (
    <div className="agenda-wrap">
      <div className="widget-label">Schedule</div>
      <div style={{ color: '#f87171', fontSize: '0.8rem' }}>{error}</div>
    </div>
  )

  if (!events) return <CalendarSkeleton />

  const days = groupByDay(events)
  const countdownIds = new Set(countdowns.map(c => c.id))

  return (
    <div className="agenda-wrap">
      <CountdownSection countdowns={countdowns} />
      <div className="widget-label">Schedule</div>
      {days.length === 0 ? (
        <div className="text-theme-muted" style={{ fontSize: '0.8rem' }}>No upcoming events</div>
      ) : days.map(day => (
        <div key={day.key} className="agenda-day">
          <div className="agenda-day-label">{day.label}</div>
          {day.events.map(ev => {
            const dt = getEventDateTime(ev)
            const isFuture = dt !== null && dt.getTime() > Date.now()
            const isActive = countdownIds.has(ev.id)
            return (
              <div key={ev.id} className="agenda-event">
                <span
                  className="agenda-event-dot"
                  style={ev.calendarColor ? { background: ev.calendarColor } : { visibility: 'hidden' }}
                />
                <div className="agenda-event-time">{eventTimeShort(ev)}</div>
                <div className="agenda-event-title">{ev.summary || 'Untitled'}</div>
                {isFuture && (
                  <button
                    className={`countdown-toggle${isActive ? ' is-active' : ''}`}
                    onClick={() => toggleCountdown(ev)}
                    title={isActive ? 'Remove countdown' : 'Add countdown'}
                  >
                    ⏱
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
