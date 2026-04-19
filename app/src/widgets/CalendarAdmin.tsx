import { useEffect, useState } from 'react'
import { syncCalendars } from '../lib/gapi'
import {
  loadAccounts, loadCalendars, removeAccount, saveCalendars,
  setCalendarEnabled, startOAuthFlow,
  type CalendarEntry, type GoogleAccount,
} from '../lib/oauth'

type AccountState = {
  account: GoogleAccount
  calendars: CalendarEntry[]
  loading: boolean
  error: string | null
}

export default function CalendarAdmin() {
  const [accounts, setAccounts] = useState<AccountState[]>([])

  function reload() {
    const accs = loadAccounts()
    const cals = loadCalendars()
    setAccounts(accs.map(account => ({
      account,
      calendars: cals.filter(c => c.accountEmail === account.email),
      loading: false,
      error: null,
    })))
  }

  useEffect(() => { reload() }, [])

  async function handleSync(email: string) {
    setAccounts(prev =>
      prev.map(s => s.account.email === email ? { ...s, loading: true, error: null } : s)
    )
    try {
      await syncCalendars(email)
      reload()
    } catch (err) {
      setAccounts(prev =>
        prev.map(s => s.account.email === email
          ? { ...s, loading: false, error: String(err) }
          : s)
      )
    }
  }

  function handleRemove(email: string) {
    if (!confirm(`Remove ${email} and all its calendars?`)) return
    removeAccount(email)
    reload()
  }

  function handleToggle(accountEmail: string, calendarId: string, enabled: boolean) {
    setCalendarEnabled(accountEmail, calendarId, enabled)
    setAccounts(prev =>
      prev.map(s => s.account.email === accountEmail
        ? {
            ...s,
            calendars: s.calendars.map(c =>
              c.calendarId === calendarId ? { ...c, enabled } : c
            ),
          }
        : s)
    )
    // Persist the change so Calendar widget picks it up
    saveCalendars(loadCalendars())
  }

  const hasClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID

  return (
    <div className="cal-admin">
      {/* Connect button */}
      <div className="cal-admin-connect">
        {hasClientId ? (
          <button className="cal-admin-btn primary" onClick={() => startOAuthFlow().catch(console.error)}>
            + Connect Google Account
          </button>
        ) : (
          <div className="cal-admin-notice">
            Set <code>VITE_GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in <code>.env.local</code> to enable OAuth.
          </div>
        )}
      </div>

      {/* Connected accounts */}
      {accounts.length === 0 ? (
        <div className="cal-admin-empty">No accounts connected yet.</div>
      ) : (
        accounts.map(({ account, calendars, loading, error }) => (
          <div key={account.email} className="cal-admin-account">
            {/* Account header */}
            <div className="cal-admin-account-header">
              {account.picture && (
                <img src={account.picture} alt="" className="cal-admin-avatar" />
              )}
              <div className="cal-admin-account-info">
                <div className="cal-admin-account-name">{account.name}</div>
                <div className="cal-admin-account-email">{account.email}</div>
              </div>
              <div className="cal-admin-account-actions">
                <button
                  className="cal-admin-btn small"
                  onClick={() => handleSync(account.email)}
                  disabled={loading}
                >
                  {loading ? 'Syncing…' : 'Sync'}
                </button>
                <button
                  className="cal-admin-btn small danger"
                  onClick={() => handleRemove(account.email)}
                >
                  Remove
                </button>
              </div>
            </div>

            {error && <div className="cal-admin-error">{error}</div>}

            {/* Calendar list */}
            {calendars.length === 0 ? (
              <div className="cal-admin-sync-hint">
                Click <strong>Sync</strong> to load calendars.
              </div>
            ) : (
              <ul className="cal-admin-cal-list">
                {calendars.map(cal => (
                  <li key={cal.calendarId} className="cal-admin-cal-item">
                    <span
                      className="cal-admin-cal-dot"
                      style={{ background: cal.backgroundColor }}
                    />
                    <span className="cal-admin-cal-name">{cal.name}</span>
                    <label className="cal-admin-toggle">
                      <input
                        type="checkbox"
                        checked={cal.enabled}
                        onChange={e => handleToggle(account.email, cal.calendarId, e.target.checked)}
                      />
                      <span className="cal-admin-toggle-track" />
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}
    </div>
  )
}
