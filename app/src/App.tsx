import './index.css'
import Weather from './widgets/Weather'


function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="grid grid-cols-4 grid-rows-4 gap-4 p-4">
        <div className="col-span-2 row-span-1 bg-slate-800 rounded-xl p-4 flex items-center justify-center">
          <h1 className="text-4xl font-semibold">Fam Bam Dash</h1>
        </div>
        <div className="col-span-2 row-span-2 bg-slate-800 rounded-xl p-4 flex items-center justify-center">
          <Clock />
        </div>
        <div className="col-span-2 row-span-2 bg-slate-800 rounded-xl p-4 flex items-center justify-center">
          <Weather />
        </div>
        <div className="col-span-4 row-span-1 bg-slate-800 rounded-xl p-4 flex items-center justify-center">
          <div>Calendar (placeholder)</div>
        </div>
      </div>
    </div>
  )
}

import React from 'react'

function Clock() {
  const [now, setNow] = React.useState(new Date())
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <div className="text-center">
      <div className="text-7xl font-bold">{time}</div>
      <div className="text-2xl mt-2 text-slate-300">{date}</div>
    </div>
  )
}

export default App
