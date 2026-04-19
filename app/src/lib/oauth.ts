// ── Types ────────────────────────────────────────────────────────────────────

export type GoogleAccount = {
  email: string
  name: string
  picture?: string
  accessToken: string
  refreshToken: string
  expiresAt: number // ms timestamp
}

export type CalendarEntry = {
  accountEmail: string
  calendarId: string
  name: string
  backgroundColor: string
  enabled: boolean
}

// ── Storage ───────────────────────────────────────────────────────────────────

const ACCOUNTS_KEY = 'fam-bam-accounts'
const CALENDARS_KEY = 'fam-bam-gcalendars'

export function loadAccounts(): GoogleAccount[] {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]') } catch { return [] }
}

function saveAccounts(accounts: GoogleAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export function upsertAccount(account: GoogleAccount) {
  const accounts = loadAccounts().filter(a => a.email !== account.email)
  saveAccounts([...accounts, account])
}

export function removeAccount(email: string) {
  saveAccounts(loadAccounts().filter(a => a.email !== email))
  saveCalendars(loadCalendars().filter(c => c.accountEmail !== email))
}

export function loadCalendars(): CalendarEntry[] {
  try { return JSON.parse(localStorage.getItem(CALENDARS_KEY) || '[]') } catch { return [] }
}

export function saveCalendars(calendars: CalendarEntry[]) {
  localStorage.setItem(CALENDARS_KEY, JSON.stringify(calendars))
}

export function setCalendarEnabled(accountEmail: string, calendarId: string, enabled: boolean) {
  saveCalendars(
    loadCalendars().map(c =>
      c.accountEmail === accountEmail && c.calendarId === calendarId ? { ...c, enabled } : c
    )
  )
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function randomBase64url(bytes = 32): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes))
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function sha256Base64url(plain: string): Promise<string> {
  const enc = new TextEncoder().encode(plain)
  const digest = await crypto.subtle.digest('SHA-256', enc)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ── OAuth flow ────────────────────────────────────────────────────────────────

export async function startOAuthFlow() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not set')

  const codeVerifier = randomBase64url(32)
  const codeChallenge = await sha256Base64url(codeVerifier)
  const state = randomBase64url(16)

  sessionStorage.setItem('oauth_verifier', codeVerifier)
  sessionStorage.setItem('oauth_state', state)

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', window.location.origin)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', [
    'openid', 'email', 'profile',
    'https://www.googleapis.com/auth/calendar.readonly',
  ].join(' '))
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent') // always get refresh token
  url.searchParams.set('state', state)

  window.location.href = url.toString()
}

export async function handleOAuthCallback(code: string, state: string): Promise<GoogleAccount> {
  const storedState = sessionStorage.getItem('oauth_state')
  const codeVerifier = sessionStorage.getItem('oauth_verifier')
  sessionStorage.removeItem('oauth_state')
  sessionStorage.removeItem('oauth_verifier')

  if (state !== storedState) throw new Error('OAuth state mismatch — possible CSRF')
  if (!codeVerifier) throw new Error('No PKCE verifier in session')

  const res = await fetch('/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, codeVerifier, redirectUri: window.location.origin }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`)

  const account = await res.json() as GoogleAccount
  upsertAccount(account)
  return account
}

export async function refreshAccessToken(account: GoogleAccount): Promise<GoogleAccount> {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: account.refreshToken }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  const data = await res.json() as { accessToken: string; expiresAt: number }
  const updated: GoogleAccount = { ...account, ...data }
  upsertAccount(updated)
  return updated
}

export async function getValidToken(email: string): Promise<string | null> {
  const account = loadAccounts().find(a => a.email === email)
  if (!account) return null
  if (Date.now() < account.expiresAt - 60_000) return account.accessToken
  try {
    const refreshed = await refreshAccessToken(account)
    return refreshed.accessToken
  } catch {
    return null
  }
}
