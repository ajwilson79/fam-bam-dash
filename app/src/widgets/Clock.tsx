import { useEffect, useState } from 'react'

export default function Clock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  const spaceIdx = timeStr.lastIndexOf(' ')
  const digits = spaceIdx >= 0 ? timeStr.slice(0, spaceIdx) : timeStr
  const ampm = spaceIdx >= 0 ? timeStr.slice(spaceIdx + 1) : ''
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="clock-wrap">
      <div className="clock-time-row">
        <span className="clock-digits">{digits}</span>
        {ampm && <span className="clock-ampm">{ampm}</span>}
      </div>
      <div className="clock-date">{date}</div>
    </div>
  )
}
