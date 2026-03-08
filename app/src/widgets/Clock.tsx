import { useEffect, useState } from 'react'

export default function Clock() {
  const [now, setNow] = useState(new Date())
  
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  
  return (
    <div className="text-center">
      <div className="text-6xl lg:text-7xl font-bold tabular-nums">{time}</div>
      <div className="text-xl lg:text-2xl mt-2 text-slate-300">{date}</div>
    </div>
  )
}
