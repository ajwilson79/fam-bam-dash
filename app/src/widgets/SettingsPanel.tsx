import React from 'react'
import { defaultSettings, loadSettings, saveSettings, type Settings } from '../lib/settings'

export default function SettingsPanel({ open, onClose }: { open: boolean; onClose: ()=>void }) {
  const [s, setS] = React.useState<Settings>(() => loadSettings())

  React.useEffect(() => { saveSettings(s) }, [s])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="w-[90vw] max-w-2xl bg-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button onClick={onClose} className="px-3 py-1 rounded bg-slate-700">Close</button>
        </div>

        <div className="space-y-6">
          {/* Weather */}
          <section>
            <h3 className="font-semibold mb-2">Weather</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col">
                <span className="text-sm text-slate-300">Latitude</span>
                <input type="number" step="0.0001" value={s.weather.lat} onChange={e=>setS(v=>({...v, weather:{...v.weather, lat:Number(e.target.value)}}))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1"/>
              </label>
              <label className="flex flex-col">
                <span className="text-sm text-slate-300">Longitude</span>
                <input type="number" step="0.0001" value={s.weather.lon} onChange={e=>setS(v=>({...v, weather:{...v.weather, lon:Number(e.target.value)}}))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1"/>
              </label>
            </div>
          </section>

          {/* Calendar */}
          <section>
            <h3 className="font-semibold mb-2">Google Calendar</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col col-span-2">
                <span className="text-sm text-slate-300">Calendar ID</span>
                <input value={s.calendar.calendarId} onChange={e=>setS(v=>({...v, calendar:{...v.calendar, calendarId:e.target.value}}))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1"/>
              </label>
              <label className="flex flex-col">
                <span className="text-sm text-slate-300">Max Events</span>
                <input type="number" min={1} max={50} value={s.calendar.maxEvents} onChange={e=>setS(v=>({...v, calendar:{...v.calendar, maxEvents:Number(e.target.value)}}))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1"/>
              </label>
            </div>
          </section>

          {/* Slideshow */}
          <section>
            <h3 className="font-semibold mb-2">Photo Slideshow</h3>
            <div className="grid grid-cols-2 gap-3 items-center">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={s.slideshow.shuffle} onChange={e=>setS(v=>({...v, slideshow:{...v.slideshow, shuffle:e.target.checked}}))}/>
                <span>Shuffle</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={s.slideshow.useGooglePhotos} onChange={e=>setS(v=>({...v, slideshow:{...v.slideshow, useGooglePhotos:e.target.checked}}))}/>
                <span>Use Google Photos (requires env & consent)</span>
              </label>
              <label className="flex flex-col col-span-2">
                <span className="text-sm text-slate-300">Interval (ms)</span>
                <input type="number" min={3000} step={1000} value={s.slideshow.intervalMs} onChange={e=>setS(v=>({...v, slideshow:{...v.slideshow, intervalMs:Number(e.target.value)}}))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1"/>
              </label>
            </div>
          </section>

          <div className="flex gap-3">
            <button onClick={()=>setS(defaultSettings())} className="px-3 py-2 rounded bg-slate-700">Reset to defaults</button>
            <button onClick={()=>{
              const data = JSON.stringify(s, null, 2)
              const blob = new Blob([data], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'fam-bam-settings.json'
              a.click()
              URL.revokeObjectURL(url)
            }} className="px-3 py-2 rounded bg-slate-700">Export JSON</button>
          </div>
        </div>
      </div>
    </div>
  )
}
