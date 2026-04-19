import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import * as https from 'node:https'
import * as http from 'node:http'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Plugin } from 'vite'

// ── helpers ───────────────────────────────────────────────────────────────────

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => { data += chunk.toString() })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function httpsPost(url: string, body: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const req = https.request(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } },
      (res) => {
        let data = ''
        res.on('data', (c: Buffer) => { data += c.toString() })
        res.on('end', () => resolve({ status: res.statusCode ?? 500, body: data }))
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8')) as Record<string, unknown>
  } catch { return {} }
}

function qs(params: Record<string, string>): string {
  return Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
}

// ── SSE broadcast (shared by settings + todos plugins) ────────────────────────
// Browsers connect to /api/sse once; any plugin can call broadcast() to push
// a reload event to all open tabs except the one that triggered the change.

const sseClients = new Set<http.ServerResponse>()

function broadcast(event: string) {
  for (const client of sseClients) {
    try { client.write(`data: ${event}\n\n`) } catch { sseClients.delete(client) }
  }
}

// ── Settings plugin ───────────────────────────────────────────────────────────

const SETTINGS_FILE = path.resolve('data/settings.json')

function settingsPlugin(): Plugin {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true })

  type Middleware = (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void
  const middleware: Middleware = (req, res, next) => {
    // SSE endpoint — browsers connect here to receive push events
    if (req.url === '/api/sse' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      })
      res.write(':\n\n') // establish the stream
      sseClients.add(res)
      const ping = setInterval(() => { try { res.write(':\n\n') } catch { /* ignore */ } }, 25_000)
      req.on('close', () => { clearInterval(ping); sseClients.delete(res) })
      return
    }

    if (!req.url?.startsWith('/api/settings')) { next(); return }

    if (req.method === 'GET') {
      try {
        const data = fs.existsSync(SETTINGS_FILE) ? fs.readFileSync(SETTINGS_FILE, 'utf-8') : 'null'
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(data)
      } catch {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('null')
      }
      return
    }

    if (req.method === 'POST') {
      const senderTabId = (req.headers['x-tab-id'] as string) ?? ''
      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', () => {
        try {
          JSON.parse(body)
          fs.writeFileSync(SETTINGS_FILE, body, 'utf-8')
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end('{"ok":true}')
          // Tell all other tabs to reload with the new settings
          broadcast(`reload:${senderTabId}`)
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end('{"error":"invalid json"}')
        }
      })
      return
    }
    next()
  }
  const attach = (s: { middlewares: { use: (h: Middleware) => void } }) => { s.middlewares.use(middleware) }
  return { name: 'settings', configureServer: attach, configurePreviewServer: attach }
}

// ── Todos plugin ──────────────────────────────────────────────────────────────

const TODOS_FILE = path.resolve('data/todos.json')

function todosPlugin(): Plugin {
  fs.mkdirSync(path.dirname(TODOS_FILE), { recursive: true })
  if (!fs.existsSync(TODOS_FILE)) fs.writeFileSync(TODOS_FILE, '{"lists":[]}', 'utf-8')

  type Middleware = (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void
  const middleware: Middleware = (req, res, next) => {
    if (!req.url?.startsWith('/api/todos')) { next(); return }
    if (req.method === 'GET') {
      try {
        const data = fs.readFileSync(TODOS_FILE, 'utf-8')
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(data)
      } catch {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('{"lists":[]}')
      }
      return
    }
    if (req.method === 'POST') {
      const senderTabId = (req.headers['x-tab-id'] as string) ?? ''
      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', () => {
        try {
          JSON.parse(body) // validate before writing
          fs.writeFileSync(TODOS_FILE, body, 'utf-8')
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end('{"ok":true}')
          broadcast(`reload:${senderTabId}`)
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end('{"error":"invalid json"}')
        }
      })
      return
    }
    next()
  }
  const attach = (s: { middlewares: { use: (h: Middleware) => void } }) => { s.middlewares.use(middleware) }
  return { name: 'todos', configureServer: attach, configurePreviewServer: attach }
}

// ── Photos plugin ─────────────────────────────────────────────────────────────

const UPLOADS_DIR = path.resolve('public/uploads')
const IMAGE_RE = /\.(jpe?g|png|gif|webp|avif)$/i

function photosPlugin(): Plugin {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })

  const listHandler: http.RequestListener = (_req, res) => {
    const files = fs.readdirSync(UPLOADS_DIR)
      .filter(f => IMAGE_RE.test(f))
      .map(f => ({ name: f, url: `/uploads/${encodeURIComponent(f)}` }))
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(files))
  }

  const uploadHandler: http.RequestListener = (req, res) => {
    const qs = new URL(req.url ?? '/', 'http://x').searchParams
    const raw = qs.get('name') ?? `photo-${Date.now()}.jpg`
    const safe = path.basename(raw).replace(/[^a-zA-Z0-9._-]/g, '_')
    const ext = path.extname(safe)
    const base = path.basename(safe, ext)
    let final = safe
    let n = 1
    while (fs.existsSync(path.join(UPLOADS_DIR, final))) final = `${base}-${n++}${ext}`

    const dest = fs.createWriteStream(path.join(UPLOADS_DIR, final))
    req.pipe(dest)
    dest.on('finish', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ name: final, url: `/uploads/${encodeURIComponent(final)}` }))
    })
    dest.on('error', () => { res.writeHead(500); res.end('Write failed') })
  }

  const deleteHandler: http.RequestListener = (req, res) => {
    const qs = new URL(req.url ?? '/', 'http://x').searchParams
    const name = qs.get('name')
    if (!name) { res.writeHead(400); res.end('Missing name'); return }
    const safe = path.basename(name)
    const filepath = path.join(UPLOADS_DIR, safe)
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
    res.writeHead(200); res.end('OK')
  }

  const attach = (s: { middlewares: { use: (p: string, h: http.RequestListener) => void } }) => {
    s.middlewares.use('/api/photos/list', listHandler)
    s.middlewares.use('/api/photos/upload', uploadHandler)
    s.middlewares.use('/api/photos/delete', deleteHandler)
  }

  return { name: 'photos', configureServer: attach, configurePreviewServer: attach }
}

// ── iCal proxy plugin ─────────────────────────────────────────────────────────

function icalProxyPlugin(): Plugin {
  const handler: http.RequestListener = async (_req, res) => {
    const url = process.env.GCAL_ICAL_URL
    if (!url) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('GCAL_ICAL_URL not configured'); return }
    try {
      const upstream = await fetch(url)
      const text = await upstream.text()
      res.writeHead(upstream.status, { 'Content-Type': 'text/calendar; charset=utf-8' })
      res.end(text)
    } catch {
      res.writeHead(502, { 'Content-Type': 'text/plain' })
      res.end('Failed to fetch calendar feed')
    }
  }
  return {
    name: 'ical-proxy',
    configureServer(s) { s.middlewares.use('/api/ical', handler) },
    configurePreviewServer(s) { s.middlewares.use('/api/ical', handler) },
  }
}

// ── Google Calendar API proxy ─────────────────────────────────────────────────
// Proxies /api/gcal/* → https://www.googleapis.com/calendar/v3/* server-side,
// forwarding the Authorization header. Eliminates browser CORS issues entirely.

function gcalProxyPlugin(): Plugin {
  type Next = () => void
  type Middleware = (req: http.IncomingMessage, res: http.ServerResponse, next: Next) => void

  const middleware: Middleware = (req, res, next) => {
    const url = req.url ?? ''
    if (!url.startsWith('/api/gcal/')) { next(); return }
    const suffix = url.slice('/api/gcal'.length)
    const upstream_url = `https://www.googleapis.com/calendar/v3${suffix}`
    const auth = (req.headers['authorization'] as string) ?? ''
    fetch(upstream_url, { headers: { Authorization: auth, Accept: 'application/json' } })
      .then(async upstream => {
        const body = await upstream.text()
        res.writeHead(upstream.status, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(body)
      })
      .catch(err => {
        res.writeHead(502, { 'Content-Type': 'text/plain' })
        res.end(`Upstream Google Calendar error: ${err}`)
      })
  }

  const attach = (s: { middlewares: { use: (h: Middleware) => void } }) => {
    s.middlewares.use(middleware)
  }
  return { name: 'gcal-proxy', configureServer: attach, configurePreviewServer: attach }
}

// ── OAuth plugin ──────────────────────────────────────────────────────────────

function oauthPlugin(): Plugin {
  const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

  const tokenHandler: http.RequestListener = async (req, res) => {
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('VITE_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured')
      return
    }
    try {
      const { code, codeVerifier, redirectUri } = JSON.parse(await readBody(req)) as Record<string, string>
      const upstream = await httpsPost(GOOGLE_TOKEN_URL, qs({
        code, client_id: clientId, client_secret: clientSecret,
        code_verifier: codeVerifier, redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }))
      if (upstream.status !== 200) {
        res.writeHead(upstream.status, { 'Content-Type': 'text/plain' })
        res.end(upstream.body)
        return
      }
      const data = JSON.parse(upstream.body) as {
        access_token: string; refresh_token?: string; expires_in: number; id_token?: string
      }
      const profile = data.id_token ? decodeJwtPayload(data.id_token) : {}
      const account = {
        email: (profile.email as string) ?? '',
        name: (profile.name as string) ?? (profile.email as string) ?? '',
        picture: (profile.picture as string) ?? undefined,
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? '',
        expiresAt: Date.now() + (data.expires_in * 1000),
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(account))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(String(err))
    }
  }

  const refreshHandler: http.RequestListener = async (req, res) => {
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      res.writeHead(500); res.end('OAuth not configured'); return
    }
    try {
      const { refreshToken } = JSON.parse(await readBody(req)) as { refreshToken: string }
      const upstream = await httpsPost(GOOGLE_TOKEN_URL, qs({
        refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret,
        grant_type: 'refresh_token',
      }))
      if (upstream.status !== 200) { res.writeHead(upstream.status); res.end(upstream.body); return }
      const data = JSON.parse(upstream.body) as { access_token: string; expires_in: number }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }))
    } catch (err) {
      res.writeHead(500); res.end(String(err))
    }
  }

  return {
    name: 'oauth',
    configureServer(s) {
      s.middlewares.use('/api/auth/token', tokenHandler)
      s.middlewares.use('/api/auth/refresh', refreshHandler)
    },
    configurePreviewServer(s) {
      s.middlewares.use('/api/auth/token', tokenHandler)
      s.middlewares.use('/api/auth/refresh', refreshHandler)
    },
  }
}

// ── Vite config ───────────────────────────────────────────────────────────────

export default defineConfig(({ mode }) => {
  // Load ALL .env.local vars (empty prefix = no filter) and inject into process.env
  // so server-side plugins can access non-VITE_ variables like GCAL_ICAL_URL and GOOGLE_CLIENT_SECRET
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [react(), settingsPlugin(), todosPlugin(), photosPlugin(), icalProxyPlugin(), gcalProxyPlugin(), oauthPlugin()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
    },
    server: {
      host: true,
      port: 12000,
      strictPort: true,
      cors: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
  }
})
