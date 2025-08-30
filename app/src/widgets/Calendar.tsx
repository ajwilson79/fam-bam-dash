import React from 'react'
import { fetchUpcomingEvents, formatEventTime, type GCalEvent } from '../lib/gcal'

export default function Calendar() {
  const [events, setEvents] = React.useState<GCalEvent[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const evs = await fetchUpcomingEvents({ maxResults: 10, windowDays: 60 })
        if (mounted) setEvents(evs)
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Calendar failed')
      }
    }
    load()
    const id = setInterval(load, 15 * 60 * 1000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  if (error) return <div className="text-red-400 text-center">{error}</div>
  if (!events) return <div>Loading events…</div>
  if (events.length === 0) return <div className="text-slate-300">No upcoming events</div>

  return (
    <div className="w-full">
      <ul className="space-y-2">
        {events.map((ev) => (
          <li key={ev.id} className="bg-slate-700 rounded-lg p-3">
            <div className="text-lg font-semibold">{ev.summary || 'Untitled event'}</div>
            <div className="text-sm text-slate-300">{formatEventTime(ev)}</div>
            {ev.location && <div className="text-sm text-slate-400">{ev.location}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}
