import './index.css'
import Calendar from './widgets/Calendar'
import Weather from './widgets/Weather'
import PhotoSlideshow from './widgets/PhotoSlideshow'
import Todo from './widgets/Todo'
import SettingsPanel from './widgets/SettingsPanel'
import Clock from './widgets/Clock'
import { useState } from 'react'

function App() {
  const [openSettings, setOpenSettings] = useState(false)

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <header className="bg-slate-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Fam Bam Dash</h1>
        <button 
          onClick={() => setOpenSettings(true)} 
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors touch-manipulation"
          aria-label="Open settings"
        >
          ⚙️ Settings
        </button>
      </header>

      {/* Main Grid Layout */}
      <main className="h-[calc(100vh-72px)] p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Clock & Weather */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-800 rounded-xl p-6 flex items-center justify-center min-h-[200px]">
            <Clock />
          </div>
          <div className="bg-slate-800 rounded-xl p-6 flex-1">
            <Weather />
          </div>
        </div>

        {/* Middle Column - Photo Slideshow */}
        <div className="min-h-[400px] lg:min-h-0">
          <PhotoSlideshow />
        </div>

        {/* Right Column - Todo & Calendar */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-800 rounded-xl p-6 flex-1 min-h-[300px]">
            <Todo />
          </div>
          <div className="bg-slate-800 rounded-xl p-6 max-h-[300px] overflow-auto">
            <Calendar />
          </div>
        </div>
      </main>

      <SettingsPanel open={openSettings} onClose={() => setOpenSettings(false)} />
    </div>
  )
}

export default App
