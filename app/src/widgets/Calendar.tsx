import { useEffect, useState } from 'react'
import { fetchUpcomingEvents, formatEventTime, type GCalEvent } from '../lib/gcal'
import { loadSettings, subscribeSettings } from '../lib/settings'

export default function Calendar() {
  const [events, setEvents] = useState<GCalEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const s = loadSettings()
        const evs = await fetchUpcomingEvents({ 
          calendarId: s.calendar.calendarId, 
          maxResults: s.calendar.maxEvents, 
          windowDays: 60 
        })
        if (mounted) setEvents(evs)
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Calendar failed')
      }
    }
    load()
    const id = setInterval(load, 15 * 60 * 1000)
    const unsub = subscribeSettings(() => load())
    return () => {
      mounted = false
      clearInterval(id)
      unsub()
    }
  }, [])

  if (error) return (
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-2">📅 Calendar</h2>
      <div className="text-red-400 text-sm">{error}</div>
    </div>
  )
  
  if (!events) return (
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-2">📅 Calendar</h2>
      <div className="text-slate-400">Loading events…</div>
    </div>
  )
  
  if (events.length === 0) return (
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-2">📅 Calendar</h2>
      <div className="text-slate-400">No upcoming events</div>
    </div>
  )

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-3">📅 Upcoming Events</h2>
      <ul className="space-y-2">
        {events.map((ev) => (
          <li key={ev.id} className="bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-colors">
            <div className="font-semibold">{ev.summary || 'Untitled event'}</div>
            <div className="text-sm text-slate-300 mt-1">{formatEventTime(ev)}</div>
            {ev.location && <div className="text-xs text-slate-400 mt-1">📍 {ev.location}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}
