import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import * as https from 'node:https'
import * as http from 'node:http'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { exec, execFile } from 'node:child_process'
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

// ── Admin PIN gate (shared by settings, photos, oauth plugins) ────────────────
// FAM_BAM_ADMIN_PIN gates admin-only mutations (settings writes, photo
// upload/delete, OAuth token exchange). If the env var is unset, checkPin()
// allows everything — backward compatible for local dev and existing installs.

function getAdminPin(): string {
  return (process.env.FAM_BAM_ADMIN_PIN ?? '').trim()
}

/**
 * Returns true if the request may proceed.
 * If a PIN is configured and the header doesn't match, writes a 401 to res and returns false.
 */
function checkPin(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const expected = getAdminPin()
  if (!expected) return true
  const provided = ((req.headers['x-admin-pin'] as string) ?? '').trim()
  if (provided === expected) return true
  res.writeHead(401, { 'Content-Type': 'application/json' })
  res.end('{"error":"admin pin required"}')
  return false
}

// ── Settings plugin ───────────────────────────────────────────────────────────

const SETTINGS_FILE = path.resolve('data/settings.json')
const CALENDAR_CACHE_FILE = path.resolve('data/calendar-cache.json')

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

    // /api/admin/verify — returns 200 if the admin PIN (if any) is satisfied,
    // 401 otherwise. Used by the client to gate the settings modal.
    // Response body includes whether a PIN is configured so the client can
    // distinguish "no PIN set" from "PIN accepted".
    if (req.url === '/api/admin/verify' && req.method === 'GET') {
      if (!checkPin(req, res)) return
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, pinConfigured: getAdminPin() !== '' }))
      return
    }

    // /api/quit-kiosk — kills the Chromium kiosk process (PIN gated)
    if (req.url === '/api/quit-kiosk' && req.method === 'POST') {
      if (!checkPin(req, res)) return
      exec('pkill -f chromium', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('{"ok":true}')
      })
      return
    }

    // /api/calendar-cache — read/write the server-side event cache
    if (req.url === '/api/calendar-cache') {
      if (req.method === 'GET') {
        try {
          const data = fs.existsSync(CALENDAR_CACHE_FILE) ? fs.readFileSync(CALENDAR_CACHE_FILE, 'utf-8') : '[]'
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(data)
        } catch {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end('[]')
        }
        return
      }
      if (req.method === 'POST') {
        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body)
            if (!Array.isArray(parsed)) throw new Error('expected array')
            fs.writeFileSync(CALENDAR_CACHE_FILE, body, 'utf-8')
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end('{"ok":true}')
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end('{"error":"invalid json"}')
          }
        })
        return
      }
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
      if (!checkPin(req, res)) return
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

// ── Countdowns plugin ─────────────────────────────────────────────────────────

const COUNTDOWNS_FILE = path.resolve('data/countdowns.json')

function countdownsPlugin(): Plugin {
  fs.mkdirSync(path.dirname(COUNTDOWNS_FILE), { recursive: true })
  if (!fs.existsSync(COUNTDOWNS_FILE)) fs.writeFileSync(COUNTDOWNS_FILE, '[]', 'utf-8')

  type Middleware = (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void
  const middleware: Middleware = (req, res, next) => {
    if (!req.url?.startsWith('/api/countdowns')) { next(); return }
    if (req.method === 'GET') {
      try {
        const data = fs.readFileSync(COUNTDOWNS_FILE, 'utf-8')
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(data)
      } catch {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('[]')
      }
      return
    }
    if (req.method === 'POST') {
      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', () => {
        try {
          JSON.parse(body)
          fs.writeFileSync(COUNTDOWNS_FILE, body, 'utf-8')
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end('{"ok":true}')
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
  return { name: 'countdowns', configureServer: attach, configurePreviewServer: attach }
}

// ── Photos plugin ─────────────────────────────────────────────────────────────

const UPLOADS_DIR = path.resolve('public/uploads')
const THUMBS_DIR = path.resolve('public/uploads/.thumbs')
const IMAGE_RE = /\.(jpe?g|png|gif|webp|avif)$/i       // storable / serveable types
const UPLOADABLE_RE = /\.(jpe?g|png|gif|webp|avif|heic|heif)$/i  // also accepts HEIC for conversion
const HEIC_RE = /\.(heic|heif)$/i
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // 25 MB — caps per-file upload to prevent disk-fill DoS

function photosPlugin(): Plugin {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  fs.mkdirSync(THUMBS_DIR, { recursive: true })

  const listHandler: http.RequestListener = (_req, res) => {
    const files = fs.readdirSync(UPLOADS_DIR)
      .filter(f => IMAGE_RE.test(f))
      .map(f => ({ name: f, url: `/uploads/${encodeURIComponent(f)}` }))
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(files))
  }

  const uploadHandler: http.RequestListener = (req, res) => {
    if (!checkPin(req, res)) return
    const qs = new URL(req.url ?? '/', 'http://x').searchParams
    const raw = qs.get('name') ?? `photo-${Date.now()}.jpg`
    const safe = path.basename(raw).replace(/[^a-zA-Z0-9._-]/g, '_')

    // Reject non-image extensions. Uploads are served as static files under /uploads/,
    // so allowing .html/.svg/etc would be a same-origin stored-XSS vector.
    if (!UPLOADABLE_RE.test(safe)) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end('{"error":"unsupported file type"}')
      return
    }

    // Fast-fail if the client advertises an oversized body
    const advertised = Number(req.headers['content-length'] ?? 0)
    if (advertised > MAX_UPLOAD_BYTES) {
      res.writeHead(413, { 'Content-Type': 'application/json' })
      res.end('{"error":"file too large"}')
      return
    }

    const isHeic = HEIC_RE.test(safe)
    const origExt = path.extname(safe)
    const base = path.basename(safe, origExt)
    // HEIC files are converted to JPEG — find a non-colliding .jpg name
    const storeExt = isHeic ? '.jpg' : origExt
    let final = base + storeExt
    let n = 1
    while (fs.existsSync(path.join(UPLOADS_DIR, final))) final = `${base}-${n++}${storeExt}`

    // Stream the upload to a temp path so conversion can write the real destination cleanly
    const tmpPath = isHeic
      ? path.join(UPLOADS_DIR, `__tmp_${Date.now()}${origExt}`)
      : path.join(UPLOADS_DIR, final)
    const dest = fs.createWriteStream(tmpPath)

    let received = 0
    let rejected = false

    // Attach the size watchdog BEFORE pipe so the first chunk is counted
    req.on('data', (chunk: Buffer) => {
      received += chunk.length
      if (received > MAX_UPLOAD_BYTES && !rejected) {
        rejected = true
        req.unpipe(dest)
        dest.destroy()
        fs.unlink(tmpPath, () => { /* ignore */ })
        req.destroy()
        res.writeHead(413, { 'Content-Type': 'application/json' })
        res.end('{"error":"file too large"}')
      }
    })

    req.pipe(dest)

    dest.on('finish', () => {
      if (rejected) return
      if (isHeic) {
        const finalPath = path.join(UPLOADS_DIR, final)

        // iOS Safari converts HEIC to JPEG before upload but keeps the .HEIC
        // filename. Detect this by checking magic bytes so we don't feed a JPEG
        // to heif-convert (which only accepts real HEIC/HEIF containers).
        let alreadyJpeg = false
        try {
          const buf = Buffer.alloc(3)
          const fd = fs.openSync(tmpPath, 'r')
          fs.readSync(fd, buf, 0, 3, 0)
          fs.closeSync(fd)
          alreadyJpeg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF
        } catch { /* if we can't read, let heif-convert try and fail naturally */ }

        if (alreadyJpeg) {
          // Already JPEG — just move it into place
          fs.rename(tmpPath, finalPath, (renameErr) => {
            if (renameErr) {
              fs.unlink(tmpPath, () => {})
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end('{"error":"failed to save file"}')
              return
            }
            broadcast('photos-changed')
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ name: final, url: `/uploads/${encodeURIComponent(final)}` }))
          })
          return
        }

        // Real HEIC — convert with heif-convert (handles HEVC + rotation metadata)
        execFile('heif-convert', ['-q', '90', tmpPath, finalPath],
          (err, _stdout, stderr) => {
            fs.unlink(tmpPath, () => {})
            if (err) {
              const detail = (stderr || err.message || '').trim()
              process.stderr.write(`[heif-convert] ${detail}\n`)
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: `HEIC conversion failed: ${detail}` }))
              return
            }
            broadcast('photos-changed')
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ name: final, url: `/uploads/${encodeURIComponent(final)}` }))
          }
        )
        return
      }
      broadcast('photos-changed')
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ name: final, url: `/uploads/${encodeURIComponent(final)}` }))
    })
    dest.on('error', () => {
      if (rejected) return
      res.writeHead(500); res.end('Write failed')
    })
  }

  const deleteHandler: http.RequestListener = (req, res) => {
    if (!checkPin(req, res)) return
    const qs = new URL(req.url ?? '/', 'http://x').searchParams
    const name = qs.get('name')
    if (!name) { res.writeHead(400); res.end('Missing name'); return }
    const safe = path.basename(name)
    const filepath = path.join(UPLOADS_DIR, safe)
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
    const thumbPath = path.join(THUMBS_DIR, safe + '.thumb.jpg')
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath)
    broadcast('photos-changed')
    res.writeHead(200); res.end('OK')
  }

  const thumbHandler: http.RequestListener = async (req, res) => {
    const name = new URL(req.url ?? '/', 'http://x').searchParams.get('name')
    if (!name || !IMAGE_RE.test(name)) { res.writeHead(400); res.end('Bad name'); return }
    const safe = path.basename(name)
    const originalPath = path.join(UPLOADS_DIR, safe)
    if (!fs.existsSync(originalPath)) { res.writeHead(404); res.end('Not found'); return }
    const thumbPath = path.join(THUMBS_DIR, safe + '.thumb.jpg')
    try {
      if (!fs.existsSync(thumbPath)) {
        const sharp = (await import('sharp')).default
        await sharp(originalPath)
          .resize(400, 300, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 75 })
          .toFile(thumbPath)
      }
      const stat = fs.statSync(thumbPath)
      const etag = `"${stat.mtime.getTime()}-${stat.size}"`
      if (req.headers['if-none-match'] === etag) { res.writeHead(304); res.end(); return }
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400', 'ETag': etag })
      fs.createReadStream(thumbPath).pipe(res)
    } catch {
      // Fallback: serve original if sharp fails
      res.writeHead(200, { 'Content-Type': 'image/jpeg' })
      fs.createReadStream(originalPath).pipe(res)
    }
  }

  // In preview mode Vite serves dist/ (a build snapshot), so newly uploaded files in
  // public/uploads/ are invisible. This middleware serves them directly from disk.
  type Middleware = (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void
  const uploadsMiddleware: Middleware = (req, res, next) => {
    const url = req.url ?? ''
    if (!url.startsWith('/uploads/')) { next(); return }
    const filename = path.basename(decodeURIComponent(url.slice('/uploads/'.length).split('?')[0]))
    if (!IMAGE_RE.test(filename)) { next(); return }
    const filepath = path.join(UPLOADS_DIR, filename)
    if (!fs.existsSync(filepath)) { next(); return }
    const ext = path.extname(filename).toLowerCase()
    const mime: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif' }
    const stat = fs.statSync(filepath)
    const etag = `"${stat.mtime.getTime()}-${stat.size}"`
    if (req.headers['if-none-match'] === etag) { res.writeHead(304); res.end(); return }
    res.writeHead(200, { 'Content-Type': mime[ext] ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=3600', 'ETag': etag })
    fs.createReadStream(filepath).pipe(res)
  }

  type UseMethod = {
    (fn: Middleware): void
    (path: string, fn: http.RequestListener): void
  }
  type AttachServer = { middlewares: { use: UseMethod } }
  const attachApi = (s: AttachServer) => {
    s.middlewares.use('/api/photos/list', listHandler)
    s.middlewares.use('/api/photos/upload', uploadHandler)
    s.middlewares.use('/api/photos/delete', deleteHandler)
    s.middlewares.use('/api/photos/thumb', thumbHandler)
  }

  return {
    name: 'photos',
    configureServer(s: AttachServer) { attachApi(s) },
    configurePreviewServer(s: AttachServer) {
      s.middlewares.use(uploadsMiddleware)
      attachApi(s)
    },
  }
}

// ── Display mode plugin ───────────────────────────────────────────────────────
// Accepts POST /api/display-mode from the motion sensor script and broadcasts
// the mode change to all connected browser tabs via SSE.
// Valid modes: "dashboard" | "screensaver"
// Screen power (on/off) is handled directly by the Python script via xset.

function displayModePlugin(): Plugin {
  type Middleware = (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => void
  const middleware: Middleware = (req, res, next) => {
    if (req.url !== '/api/display-mode' || req.method !== 'POST') { next(); return }
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      try {
        const { mode } = JSON.parse(body) as { mode: string }
        if (mode !== 'dashboard' && mode !== 'screensaver') {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end('{"error":"mode must be dashboard or screensaver"}')
          return
        }
        broadcast(`display-mode:${mode}`)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('{"ok":true}')
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end('{"error":"invalid json"}')
      }
    })
  }
  const attach = (s: { middlewares: { use: (h: Middleware) => void } }) => { s.middlewares.use(middleware) }
  return { name: 'display-mode', configureServer: attach, configurePreviewServer: attach }
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
    if (!checkPin(req, res)) return
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
    if (!checkPin(req, res)) return
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
    plugins: [react(), settingsPlugin(), todosPlugin(), countdownsPlugin(), photosPlugin(), displayModePlugin(), icalProxyPlugin(), gcalProxyPlugin(), oauthPlugin()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
    },
    server: {
      host: true,
      port: 12000,
      strictPort: true,
      cors: true,
      allowedHosts: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
    preview: {
      host: true,
      port: 12000,
      strictPort: true,
      cors: true,
      allowedHosts: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
  }
})
