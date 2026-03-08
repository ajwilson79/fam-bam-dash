import { useEffect, useState } from 'react'
import { defaultSettings, loadSettings, setSettings, type Settings } from '../lib/settings'

export default function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [s, setS] = useState<Settings>(() => loadSettings())

  useEffect(() => { setSettings(s) }, [s])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-slate-800 rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">⚙️ Settings</h2>
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors touch-manipulation"
          >
            Close
          </button>
        </div>

        <div className="space-y-6">
          {/* Weather */}
          <section className="bg-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">🌦️ Weather</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col">
                <span className="text-sm text-slate-300 mb-1">Latitude</span>
                <input 
                  type="number" 
                  step="0.0001" 
                  value={s.weather.lat} 
                  onChange={e => setS(v => ({ ...v, weather: { ...v.weather, lat: Number(e.target.value) } }))} 
                  className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm text-slate-300 mb-1">Longitude</span>
                <input 
                  type="number" 
                  step="0.0001" 
                  value={s.weather.lon} 
                  onChange={e => setS(v => ({ ...v, weather: { ...v.weather, lon: Number(e.target.value) } }))} 
                  className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none"
                />
              </label>
            </div>
          </section>

          {/* Calendar */}
          <section className="bg-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">📅 Google Calendar</h3>
            <div className="space-y-4">
              <label className="flex flex-col">
                <span className="text-sm text-slate-300 mb-1">Calendar ID</span>
                <input 
                  value={s.calendar.calendarId} 
                  onChange={e => setS(v => ({ ...v, calendar: { ...v.calendar, calendarId: e.target.value } }))} 
                  placeholder="your-email@gmail.com"
                  className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-sm text-slate-300 mb-1">Max Events</span>
                <input 
                  type="number" 
                  min={1} 
                  max={50} 
                  value={s.calendar.maxEvents} 
                  onChange={e => setS(v => ({ ...v, calendar: { ...v.calendar, maxEvents: Number(e.target.value) } }))} 
                  className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none"
                />
              </label>
            </div>
          </section>

          {/* Slideshow */}
          <section className="bg-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">🖼️ Photo Slideshow</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={s.slideshow.shuffle} 
                  onChange={e => setS(v => ({ ...v, slideshow: { ...v.slideshow, shuffle: e.target.checked } }))}
                  className="w-5 h-5 cursor-pointer"
                />
                <span>Shuffle photos</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={s.slideshow.useGooglePhotos} 
                  onChange={e => setS(v => ({ ...v, slideshow: { ...v.slideshow, useGooglePhotos: e.target.checked } }))}
                  className="w-5 h-5 cursor-pointer"
                />
                <span>Use Google Photos (requires env vars & consent)</span>
              </label>
              <label className="flex flex-col">
                <span className="text-sm text-slate-300 mb-1">Interval (milliseconds)</span>
                <input 
                  type="number" 
                  min={3000} 
                  step={1000} 
                  value={s.slideshow.intervalMs} 
                  onChange={e => setS(v => ({ ...v, slideshow: { ...v.slideshow, intervalMs: Number(e.target.value) } }))} 
                  className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none"
                />
              </label>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button 
              onClick={() => setS(defaultSettings())} 
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors touch-manipulation"
            >
              Reset to Defaults
            </button>
            <button 
              onClick={() => {
                const data = JSON.stringify(s, null, 2)
                const blob = new Blob([data], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'fam-bam-settings.json'
                a.click()
                URL.revokeObjectURL(url)
              }} 
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors touch-manipulation"
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
