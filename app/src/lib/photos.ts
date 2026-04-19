export type PhotoItem = {
  id: string
  src: string
  source: 'local' | 'uploaded' | 'google'
}

export function loadLocalPhotos(): PhotoItem[] {
  const modules = import.meta.glob('../assets/photos/**/*.{jpg,jpeg,png,gif,webp,avif}', {
    eager: true,
    query: '?url',
    import: 'default',
  }) as Record<string, string>
  return Object.entries(modules).map(([p, url], idx) => ({
    id: `local-${idx}-${p}`,
    src: url,
    source: 'local' as const,
  }))
}

export async function loadUploadedPhotos(): Promise<PhotoItem[]> {
  try {
    const res = await fetch('/api/photos/list')
    if (!res.ok) return []
    const files = await res.json() as Array<{ name: string; url: string }>
    return files.map((f, i) => ({
      id: `uploaded-${i}-${f.name}`,
      src: f.url,
      source: 'uploaded' as const,
    }))
  } catch {
    return []
  }
}

export function notifyPhotosChanged() {
  window.dispatchEvent(new CustomEvent('photos-changed'))
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'

export function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      resolve()
      return
    }
    const existing = document.getElementById('google-identity-services') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('GIS script failed to load')))
      return
    }
    const s = document.createElement('script')
    s.id = 'google-identity-services'
    s.src = GIS_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('GIS script failed to load'))
    document.head.appendChild(s)
  })
}

type TokenCache = { token: string; expiresAt: number }
let tokenCache: TokenCache | null = null
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000

export async function getGooglePhotosToken(
  clientId: string,
  scope = 'https://www.googleapis.com/auth/photoslibrary.readonly'
): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
    return tokenCache.token
  }

  await loadGisScript()
  return new Promise<string>((resolve, reject) => {
    try {
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope,
        callback: (resp: any) => {
          if (resp && resp.access_token) {
            const expiresIn = Number(resp.expires_in ?? 3600)
            tokenCache = { token: resp.access_token, expiresAt: Date.now() + expiresIn * 1000 }
            resolve(resp.access_token)
          } else {
            reject(new Error('Failed to acquire access token'))
          }
        },
        error_callback: (err: any) => reject(err),
      })
      // Silent refresh if user already consented; full consent prompt on first auth
      tokenClient.requestAccessToken({ prompt: tokenCache ? '' : 'consent' })
    } catch (e) {
      reject(e)
    }
  })
}

export type GoogleMediaItem = {
  id: string
  baseUrl: string
  mimeType: string
  filename?: string
}

export async function fetchGooglePhotosAlbum(token: string, albumId: string, maxItems = 200): Promise<PhotoItem[]> {
  const endpoint = 'https://photoslibrary.googleapis.com/v1/mediaItems:search'
  let pageToken: string | undefined
  const out: PhotoItem[] = []
  do {
    const body: any = { albumId, pageSize: Math.min(100, maxItems - out.length) }
    if (pageToken) body.pageToken = pageToken
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Google Photos error: ${res.status} ${text}`)
    }
    const json = await res.json()
    const got: GoogleMediaItem[] = (json.mediaItems || []).filter((it: any) => typeof it.baseUrl === 'string')
    for (const it of got) {
      if (!it.mimeType || !it.mimeType.startsWith('image/')) continue
      out.push({ id: `google-${it.id}`, src: `${it.baseUrl}=w1920-h1080`, source: 'google' })
      if (out.length >= maxItems) break
    }
    pageToken = json.nextPageToken
  } while (pageToken && out.length < maxItems)
  return out
}
