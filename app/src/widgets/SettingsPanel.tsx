import { useEffect, useState } from 'react'
import { defaultSettings, loadSettings, setSettings, syncSettingsFromServer, type Settings, type WebApp } from '../lib/settings'
import { zipToLatLon } from '../lib/weather'
import CalendarAdmin from './CalendarAdmin'
import PhotoUpload from './PhotoUpload'
import TodoAdmin from './TodoAdmin'
import AdminPinPrompt from './AdminPinPrompt'
import { adminHeaders } from '../lib/admin'

type Tab = 'settings' | 'calendars' | 'photos' | 'todos' | 'apps'

export default function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('settings')
  const [s, setS] = useState<Settings>(() => loadSettings())
  const [zipInput, setZipInput] = useState(() => loadSettings().weather.zip)
  const [zipStatus, setZipStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [zipBusy, setZipBusy] = useState(false)
  const [quitPromptOpen, setQuitPromptOpen] = useState(false)
  const [newApp, setNewApp] = useState<WebApp>({ name: '', url: '', icon: '🔗' })

  // Re-read from server each time the panel opens so a remote browser never
  // overwrites apps that were saved by another device.
  useEffect(() => {
    if (!open) return
    setS(loadSettings())
    syncSettingsFromServer().then(() => setS(loadSettings()))
  }, [open])

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
            {([['settings', '⚙️ Settings'], ['calendars', '📅 Calendars'], ['photos', '🖼️ Photos'], ['todos', '✅ To-Do'], ['apps', '🔗 Apps']] as [Tab, string][]).map(([id, label]) => (
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

              {/* Motion Sensor */}
              <section className="bg-theme-elevated rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-1">🚶 Motion Sensor</h3>
                <p className="text-xs text-slate-500 mb-3">Requires a PIR sensor wired to GPIO pin 17. Ignored if the sensor script is not running.</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col">
                      <span className="text-sm text-slate-300 mb-1">Night starts (hour, 0–23)</span>
                      <input type="number" min={0} max={23}
                        value={s.motionSensor.nightStartHour}
                        onChange={e => update({ ...s, motionSensor: { ...s.motionSensor, nightStartHour: Math.min(23, Math.max(0, Number(e.target.value))) } })}
                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none" />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-sm text-slate-300 mb-1">Night ends (hour, 0–23)</span>
                      <input type="number" min={0} max={23}
                        value={s.motionSensor.nightEndHour}
                        onChange={e => update({ ...s, motionSensor: { ...s.motionSensor, nightEndHour: Math.min(23, Math.max(0, Number(e.target.value))) } })}
                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none" />
                    </label>
                  </div>
                  <label className="flex flex-col">
                    <span className="text-sm text-slate-300 mb-1">Day: screen off after (minutes of no motion)</span>
                    <input type="number" min={1} max={1440}
                      value={s.motionSensor.dayScreenOffMinutes}
                      onChange={e => update({ ...s, motionSensor: { ...s.motionSensor, dayScreenOffMinutes: Math.max(1, Number(e.target.value)) } })}
                      className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none w-32" />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm text-slate-300 mb-1">Night: screen off after (minutes of no motion)</span>
                    <input type="number" min={1} max={60}
                      value={s.motionSensor.nightScreenOffMinutes}
                      onChange={e => update({ ...s, motionSensor: { ...s.motionSensor, nightScreenOffMinutes: Math.max(1, Number(e.target.value)) } })}
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
              <div className="flex gap-3 pt-2 flex-wrap">
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
                <button
                  onClick={() => setQuitPromptOpen(true)}
                  className="px-4 py-2 rounded-lg bg-red-900/60 hover:bg-red-800/80 text-red-200 transition-colors touch-manipulation ml-auto"
                >
                  Exit Kiosk
                </button>
              </div>
            </div>
          )}

          {tab === 'calendars' && <CalendarAdmin />}
          {tab === 'photos' && <PhotoUpload />}
          {tab === 'todos' && <TodoAdmin />}
          {tab === 'apps' && (
            <div className="space-y-6">
              <section className="bg-theme-elevated rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-1">🔗 Web App Shortcuts</h3>
                <p className="text-xs text-slate-500 mb-4">Each shortcut appears as a tile on the dashboard and opens in a full-screen overlay.</p>

                {/* Existing apps */}
                {s.webApps.length === 0 ? (
                  <p className="text-sm text-slate-500 mb-4">No apps added yet.</p>
                ) : (
                  <ul className="space-y-2 mb-4">
                    {s.webApps.map((app, i) => (
                      <li key={i} className="flex items-center gap-3 bg-theme-card rounded-lg px-3 py-2">
                        <span className="text-xl w-7 text-center">{app.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{app.name}</div>
                          <div className="text-xs text-slate-500 truncate">{app.url}</div>
                        </div>
                        <button
                          onClick={() => update({ ...s, webApps: s.webApps.filter((_, j) => j !== i) })}
                          className="px-2 py-1 rounded bg-red-900/50 hover:bg-red-800/70 text-red-300 text-xs transition-colors touch-manipulation flex-shrink-0"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add new app form */}
                <div className="border-t border-[var(--color-divider)] pt-4 space-y-3">
                  <h4 className="text-sm font-medium text-slate-300">Add a new app</h4>

                  {/* Emoji picker */}
                  <div>
                    <span className="text-xs text-slate-500 block mb-1.5">Icon</span>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {['🔗','🌐','📰','📺','🎵','🎮','📷','🏠','🛒','📊','🗒️','💬','🔍','📚','🍴','🍕','🎬','🏋️','💊','🌡️','🚗','✈️','💰','🗺️','📡','🖥️','📱','⚙️'].map(e => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setNewApp(a => ({ ...a, icon: e }))}
                          className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors touch-manipulation ${newApp.icon === e ? 'bg-sky-700 ring-2 ring-sky-400' : 'bg-slate-800 hover:bg-slate-700'}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    value={newApp.name}
                    onChange={e => setNewApp(a => ({ ...a, name: e.target.value }))}
                    placeholder="Name (e.g. Recipes)"
                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none w-full"
                  />

                  <div>
                    <div className="flex gap-2">
                      <input
                        value={newApp.url}
                        onChange={e => setNewApp(a => ({ ...a, url: e.target.value }))}
                        placeholder="URL (e.g. http://192.168.1.10:3000/)"
                        type="url"
                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:border-sky-500 outline-none flex-1"
                      />
                      <button
                        onClick={() => {
                          const trimmed = { name: newApp.name.trim(), url: newApp.url.trim(), icon: newApp.icon || '🔗' }
                          if (!trimmed.name || !trimmed.url) return
                          update({ ...s, webApps: [...s.webApps, trimmed] })
                          setNewApp({ name: '', url: '', icon: '🔗' })
                        }}
                        disabled={!newApp.name.trim() || !newApp.url.trim()}
                        className="px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 disabled:opacity-40 transition-colors touch-manipulation text-sm font-medium flex-shrink-0"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">⚠ Only local network apps work — public sites like Google block embedding in iframes.</p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {quitPromptOpen && (
        <AdminPinPrompt
          message="Enter the PIN to exit kiosk mode and return to the desktop."
          onSuccess={() => {
            setQuitPromptOpen(false)
            fetch('/api/quit-kiosk', { method: 'POST', headers: adminHeaders() })
          }}
          onCancel={() => setQuitPromptOpen(false)}
        />
      )}
    </div>
  )
}
