import './index.css'
import Calendar from './widgets/Calendar'
import Weather, { WeatherFull } from './widgets/Weather'
import PhotoSlideshow from './widgets/PhotoSlideshow'
import SettingsPanel from './widgets/SettingsPanel'
import AdminPinPrompt from './widgets/AdminPinPrompt'
import VirtualKeyboard from './widgets/VirtualKeyboard'
import Clock from './widgets/Clock'
import TodoPanel from './widgets/TodoPanel'
import { useEffect, useRef, useState } from 'react'
import { getTabId, loadSettings, setSettings, subscribeSettings, syncSettingsFromServer } from './lib/settings'
import { handleOAuthCallback } from './lib/oauth'
import { syncCalendars } from './lib/gapi'
import { syncFromServer } from './lib/todo'
import { verifyAdminAccess } from './lib/admin'
import { notifyPhotosChanged } from './lib/photos'

function App() {
  const [openSettings, setOpenSettings] = useState(false)
  const [pinPromptOpen, setPinPromptOpen] = useState(false)
  const [theme, setTheme] = useState(() => loadSettings().theme)
  const [isIdle, setIsIdle] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetIdleTimerRef = useRef<(() => void) | null>(null)
  const dashLeftRef = useRef<HTMLElement>(null)

  // Pointer-drag scroll — handles touch screens on Pi/Wayland that report
  // touch as pointer events instead of Web Touch Events (touch-action: pan-y
  // has no effect in that case). 8px threshold distinguishes tap from scroll.
  useEffect(() => {
    const el: HTMLElement | null = dashLeftRef.current
    if (!el) return
    const target: HTMLElement = el  // narrowed const — safe to use in closures
    let startY = 0, startScrollTop = 0, activeId = -1, dragging = false
    function down(e: PointerEvent) {
      startY = e.clientY; startScrollTop = target.scrollTop
      activeId = e.pointerId; dragging = false
    }
    function move(e: PointerEvent) {
      if (e.pointerId !== activeId) return
      const dy = e.clientY - startY
      if (!dragging && Math.abs(dy) > 8) { dragging = true; target.setPointerCapture(activeId) }
      if (dragging) target.scrollTop = startScrollTop - dy
    }
    function up(e: PointerEvent) { if (e.pointerId === activeId) { dragging = false; activeId = -1 } }
    target.addEventListener('pointerdown', down)
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
    return () => {
      target.removeEventListener('pointerdown', down)
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
    }
  }, [])

  // Checks the server's admin-PIN gate, then either opens Settings or prompts for a PIN.
  async function requestOpenSettings() {
    const result = await verifyAdminAccess()
    if (result.ok) setOpenSettings(true)
    else setPinPromptOpen(true)
  }

  useEffect(() => {
    const unsub = subscribeSettings(() => setTheme(loadSettings().theme))
    return () => { unsub() }
  }, [])

  // Idle screensaver: reset timer on any activity; enter idle when timer fires
  useEffect(() => {
    function resetTimer() {
      const s = loadSettings()
      setIsIdle(false)  // always reset — avoids stale closure check on isIdle
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (s.idle.enabled) {
        idleTimer.current = setTimeout(() => setIsIdle(true), s.idle.timeoutMinutes * 60_000)
      }
    }
    resetIdleTimerRef.current = resetTimer
    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown'] as const
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    const unsub = subscribeSettings(resetTimer)
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (idleTimer.current) clearTimeout(idleTimer.current)
      unsub()
    }
  }, [])

  // Restore settings and todos from server on startup (survives browser localStorage wipes)
  useEffect(() => { syncSettingsFromServer() }, [])
  useEffect(() => { syncFromServer() }, [])

  // SSE: reload on settings change; switch display mode when motion sensor signals
  useEffect(() => {
    const es = new EventSource('/api/sse')
    es.onmessage = (e: MessageEvent<string>) => {
      if (typeof e.data !== 'string') return
      if (e.data.startsWith('reload:')) {
        const senderTabId = e.data.slice(7)
        if (senderTabId !== getTabId()) window.location.reload()
      } else if (e.data === 'photos-changed') {
        notifyPhotosChanged()
      } else if (e.data === 'countdowns-changed') {
        window.dispatchEvent(new CustomEvent('countdowns-changed'))
      } else if (e.data === 'display-mode:dashboard') {
        resetIdleTimerRef.current?.()
      } else if (e.data === 'display-mode:screensaver') {
        setIsIdle(true)
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
      requestOpenSettings()
      return
    }

    if (code && state) {
      handleOAuthCallback(code, state)
        .then(account => syncCalendars(account.email))
        .then(() => requestOpenSettings())
        .catch(err => {
          console.error('OAuth callback failed:', err)
          requestOpenSettings()
        })
    }
  }, [])

  return (
    <div className="dash-root" data-theme={theme}>
      <aside className="dash-left" ref={dashLeftRef}>
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

      {!isIdle && (
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
            onClick={requestOpenSettings}
            className="settings-fab"
            aria-label="Open settings"
          >
            ⚙
          </button>
        </div>
      )}

      {pinPromptOpen && (
        <AdminPinPrompt
          onSuccess={() => { setPinPromptOpen(false); setOpenSettings(true) }}
          onCancel={() => setPinPromptOpen(false)}
        />
      )}

      {/* Idle screensaver — fullscreen photo frame, dismissed by any interaction */}
      {isIdle && (
        <div className="fixed inset-0 z-40 bg-black" style={{ width: '100vw', height: '100vh' }}>
          <PhotoSlideshow />
          <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
            <span className="text-white/30 text-sm select-none">tap to return</span>
          </div>
        </div>
      )}

      <SettingsPanel open={openSettings} onClose={() => setOpenSettings(false)} />
      <VirtualKeyboard />
    </div>
  )
}

export default App
