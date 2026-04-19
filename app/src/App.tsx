import './index.css'
import Calendar from './widgets/Calendar'
import Weather, { WeatherFull } from './widgets/Weather'
import PhotoSlideshow from './widgets/PhotoSlideshow'
import SettingsPanel from './widgets/SettingsPanel'
import Clock from './widgets/Clock'
import TodoPanel from './widgets/TodoPanel'
import { useEffect, useState } from 'react'
import { getTabId, loadSettings, setSettings, subscribeSettings, syncSettingsFromServer } from './lib/settings'
import { handleOAuthCallback } from './lib/oauth'
import { syncCalendars } from './lib/gapi'
import { syncFromServer } from './lib/todo'

function App() {
  const [openSettings, setOpenSettings] = useState(false)
  const [theme, setTheme] = useState(() => loadSettings().theme)

  useEffect(() => {
    const unsub = subscribeSettings(() => setTheme(loadSettings().theme))
    return () => { unsub() }
  }, [])

  // Restore settings and todos from server on startup (survives browser localStorage wipes)
  useEffect(() => { syncSettingsFromServer() }, [])
  useEffect(() => { syncFromServer() }, [])

  // SSE: reload this tab when another tab saves settings
  useEffect(() => {
    const es = new EventSource('/api/sse')
    es.onmessage = (e: MessageEvent<string>) => {
      if (typeof e.data === 'string' && e.data.startsWith('reload:')) {
        const senderTabId = e.data.slice(7)
        if (senderTabId !== getTabId()) window.location.reload()
      }
    }
    return () => es.close()
  }, [])

  // Handle Google OAuth redirect-back
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const error = params.get('error')

    if (!code && !error) return

    // Clean the URL immediately so a refresh doesn't re-trigger
    window.history.replaceState({}, '', window.location.pathname)

    if (error) {
      console.warn('Google OAuth error:', error)
      setOpenSettings(true)
      return
    }

    if (code && state) {
      handleOAuthCallback(code, state)
        .then(account => syncCalendars(account.email))
        .then(() => setOpenSettings(true))
        .catch(err => {
          console.error('OAuth callback failed:', err)
          setOpenSettings(true)
        })
    }
  }, [])

  return (
    <div className="dash-root" data-theme={theme}>
      <aside className="dash-left">
        <Calendar />
      </aside>

      <main className="dash-right">
        <section className="dash-photo">
          <PhotoSlideshow />
        </section>

        <div className="dash-middle">
          <section className="dash-clock">
            <Clock />
          </section>
          <section className="dash-weather">
            <Weather />
          </section>
          <section className="dash-weather-full">
            <WeatherFull />
          </section>
        </div>

        <section className="dash-todos">
          <TodoPanel />
        </section>
      </main>

      <div className="dash-fabs">
        <button
          onClick={() => {
            const next = theme === 'dark' ? 'light' : 'dark'
            setTheme(next)
            setSettings({ ...loadSettings(), theme: next })
          }}
          className="settings-fab"
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button
          onClick={() => setOpenSettings(true)}
          className="settings-fab"
          aria-label="Open settings"
        >
          ⚙
        </button>
      </div>

      <SettingsPanel open={openSettings} onClose={() => setOpenSettings(false)} />
    </div>
  )
}

export default App
