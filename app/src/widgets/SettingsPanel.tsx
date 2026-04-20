import { useState } from 'react'
import { defaultSettings, loadSettings, setSettings, type Settings } from '../lib/settings'
import { zipToLatLon } from '../lib/weather'
import CalendarAdmin from './CalendarAdmin'
import PhotoUpload from './PhotoUpload'
import TodoAdmin from './TodoAdmin'

type Tab = 'settings' | 'calendars' | 'photos' | 'todos'

export default function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('settings')
  const [s, setS] = useState<Settings>(() => loadSettings())
  const [zipInput, setZipInput] = useState(() => loadSettings().weather.zip)
  const [zipStatus, setZipStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [zipBusy, setZipBusy] = useState(false)

  function update(next: Settings) {
    setS(next)
    setSettings(next)
  }

  async function lookupZip() {
    const z = zipInput.trim()
    if (!z) return
    setZipBusy(true)
    setZipStatus(null)
    try {
      const { lat, lon, city, state } = await zipToLatLon(z)
      const next = { ...s, weather: { ...s.weather, zip: z, lat, lon } }
      update(next)
      setZipStatus({ ok: true, msg: `${city}, ${state} (${lat.toFixed(4)}, ${lon.toFixed(4)})` })
    } catch (err) {
      setZipStatus({ ok: false, msg: err instanceof Error ? err.message : 'Lookup failed' })
    } finally {
      setZipBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-theme-card rounded-xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-5 pb-0 flex-shrink-0">
          <div className="flex gap-1">
            {([['settings', '⚙️ Settings'], ['calendars', '📅 Calendars'], ['photos', '🖼️ Photos'], ['todos', '✅ To-Do']] as [Tab, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors touch-manipulation ${
                  tab === id
                    ? 'bg-theme-elevated text-theme border-b-2 border-[var(--color-accent)]'
                    : 'text-theme-muted hover:text-theme'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-theme-elevated hover:opacity-80 transition-opacity touch-manipulation text-sm text-theme border border-[var(--color-text-muted)]"
          >
            Close
          </button>
        </div>

        {/* Tab content */}
        <div className="overflow-auto flex-1 px-6 py-5">
          {tab === 'settings' && (
            <div className="space-y-6">
              {/* Weather */}
              <section className="bg-theme-elevated rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">🌦️ Weather</h3>
                <div className="flex flex-col gap-4">
                  {/* ZIP lookup */}
                  <div>
                    <span className="text-sm text-slate-300 block mb-1">ZIP Code <span className="text-slate-500">(US)</span></span>
                    <div className="flex gap-2">
                      <input
                        value={zipInput}
                        onChange={e => setZipInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && lookupZip()}
                        placeholder="e.g. 10001"
                        maxLength={10}
                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none w-36"
                      />
                      <button
                        onClick={lookupZip}
                        disabled={zipBusy || !zipInput.trim()}
                        className="px-4 py-2 rounded-lg bg-theme-card border border-slate-600 hover:border-sky-500 transition-colors disabled:opacity-40 text-sm"
                      >
                        {zipBusy ? 'Looking up…' : 'Look up'}
                      </button>
                    </div>
                    {zipStatus && (
                      <div className={`mt-1.5 text-sm ${zipStatus.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                        {zipStatus.ok ? '📍 ' : '⚠ '}{zipStatus.msg}
                      </div>
                    )}
                  </div>

                  {/* Manual lat/lon fallback */}
                  <details className="group">
                    <summary className="text-sm text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors">
                      Manual coordinates (advanced)
                    </summary>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <label className="flex flex-col">
                        <span className="text-sm text-slate-300 mb-1">Latitude</span>
                        <input type="number" step="0.0001" value={s.weather.lat}
                          onChange={e => update({ ...s, weather: { ...s.weather, lat: Number(e.target.value) } })}
                          className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none" />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-sm text-slate-300 mb-1">Longitude</span>
                        <input type="number" step="0.0001" value={s.weather.lon}
                          onChange={e => update({ ...s, weather: { ...s.weather, lon: Number(e.target.value) } })}
                          className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none" />
                      </label>
                    </div>
                  </details>

                  {/* Units */}
                  <div>
                    <span className="text-sm text-slate-300 block mb-2">Units</span>
                    <div className="flex gap-4">
                      {(['imperial', 'metric'] as const).map(u => (
                        <label key={u} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="units" value={u} checked={s.weather.units === u}
                            onChange={() => update({ ...s, weather: { ...s.weather, units: u } })}
                            className="cursor-pointer" />
                          <span className="capitalize">{u === 'imperial' ? '°F / mph' : '°C / km/h'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Refresh */}
                  <label className="flex flex-col">
                    <span className="text-sm text-slate-300 mb-1">Refresh interval (minutes)</span>
                    <input type="number" min={1} max={1440}
                      value={Math.round(s.weather.refreshIntervalMs / 60_000)}
                      onChange={e => update({ ...s, weather: { ...s.weather, refreshIntervalMs: Math.max(1, Number(e.target.value)) * 60_000 } })}
                      className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none w-32" />
                  </label>
                </div>
              </section>

              {/* Slideshow */}
              <section className="bg-theme-elevated rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">🖼️ Photo Slideshow</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={s.slideshow.shuffle}
                      onChange={e => update({ ...s, slideshow: { ...s.slideshow, shuffle: e.target.checked } })}
                      className="w-5 h-5 cursor-pointer" />
                    <span>Shuffle photos</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={s.slideshow.useGooglePhotos}
                      onChange={e => update({ ...s, slideshow: { ...s.slideshow, useGooglePhotos: e.target.checked } })}
                      className="w-5 h-5 cursor-pointer" />
                    <span>Use Google Photos</span>
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm text-slate-300 mb-1">Interval (ms)</span>
                    <input type="number" min={3000} step={1000} value={s.slideshow.intervalMs}
                      onChange={e => update({ ...s, slideshow: { ...s.slideshow, intervalMs: Number(e.target.value) } })}
                      className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none" />
                  </label>
                </div>
              </section>

              {/* Screensaver */}
              <section className="bg-theme-elevated rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">💤 Screensaver</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={s.idle.enabled}
                      onChange={e => update({ ...s, idle: { ...s.idle, enabled: e.target.checked } })}
                      className="w-5 h-5 cursor-pointer" />
                    <span>Enable picture frame mode when idle</span>
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm text-slate-300 mb-1">Idle timeout (minutes)</span>
                    <input type="number" min={1} max={1440}
                      value={s.idle.timeoutMinutes}
                      onChange={e => update({ ...s, idle: { ...s.idle, timeoutMinutes: Math.max(1, Number(e.target.value)) } })}
                      className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none w-32" />
                  </label>
                </div>
              </section>

              {/* To-Do */}
              <section className="bg-theme-elevated rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">✅ To-Do</h3>
                <label className="flex flex-col">
                  <span className="text-sm text-slate-300 mb-1">Auto-remove checked items after (minutes)</span>
                  <input type="number" min={1} max={1440}
                    value={s.todo.autoRemoveMinutes}
                    onChange={e => update({ ...s, todo: { ...s.todo, autoRemoveMinutes: Math.max(1, Number(e.target.value)) } })}
                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none w-32" />
                </label>
              </section>

              {/* Theme */}
              <section className="bg-theme-elevated rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">🎨 Theme</h3>
                <div className="flex gap-6">
                  {(['dark', 'light'] as const).map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="theme" value={t} checked={s.theme === t}
                        onChange={() => update({ ...s, theme: t })} className="cursor-pointer" />
                      <span className="capitalize">{t}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => update(defaultSettings())}
                  className="px-4 py-2 rounded-lg bg-theme-elevated hover:opacity-80 transition-opacity touch-manipulation">
                  Reset to Defaults
                </button>
                <button onClick={() => {
                  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })
                  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'fam-bam-settings.json' })
                  a.click()
                  URL.revokeObjectURL(a.href)
                }} className="px-4 py-2 rounded-lg bg-theme-elevated hover:opacity-80 transition-opacity touch-manipulation">
                  Export JSON
                </button>
              </div>
            </div>
          )}

          {tab === 'calendars' && <CalendarAdmin />}
          {tab === 'photos' && <PhotoUpload />}
          {tab === 'todos' && <TodoAdmin />}
        </div>
      </div>
    </div>
  )
}
