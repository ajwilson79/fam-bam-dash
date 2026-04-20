import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchGooglePhotosAlbum, getGooglePhotosToken, loadLocalPhotos, loadUploadedPhotos, shuffle, type PhotoItem } from '../lib/photos'
import { loadSettings, subscribeSettings } from '../lib/settings'

function useLocalAndGooglePhotos() {
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const [local, uploaded] = await Promise.all([loadLocalPhotos(), loadUploadedPhotos()])
        let merged = [...local, ...uploaded]
        const s = loadSettings()
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
        const albumId = import.meta.env.VITE_GOOGLE_PHOTOS_ALBUM_ID as string | undefined
        if (s.slideshow.useGooglePhotos && clientId && albumId) {
          try {
            const token = await getGooglePhotosToken(clientId)
            const remote = await fetchGooglePhotosAlbum(token, albumId, 200)
            merged = [...merged, ...remote]
          } catch (e) {
            console.warn('Google Photos load failed', e)
          }
        }
        if (mounted) { setPhotos(merged); setLoading(false) }
      } catch (e) {
        if (mounted) { setError(e instanceof Error ? e.message : 'Photo load failed'); setLoading(false) }
      }
    }
    load()
    const unsub = subscribeSettings(() => load())
    window.addEventListener('photos-changed', load)
    return () => {
      mounted = false
      unsub()
      window.removeEventListener('photos-changed', load)
    }
  }, [])

  return { photos, error, loading }
}

const KB_VARIANTS = ['kb-1', 'kb-2', 'kb-3', 'kb-4']

export default function PhotoSlideshow({ intervalMs, shuffleOn }: {
  intervalMs?: number
  shuffleOn?: boolean
}) {
  const { photos, error, loading } = useLocalAndGooglePhotos()
  const [idx, setIdx] = useState(0)
  const listRef = useRef<PhotoItem[]>([])

  const s = loadSettings()
  const resolvedInterval = intervalMs ?? s.slideshow.intervalMs
  const resolvedShuffle = shuffleOn ?? s.slideshow.shuffle

  const list = useMemo(
    () => (resolvedShuffle ? shuffle(photos) : photos),
    [photos, resolvedShuffle]
  )
  listRef.current = list

  useEffect(() => {
    if (list.length === 0) return
    const id = setInterval(() => {
      setIdx(prev => {
        const len = listRef.current.length
        return len === 0 ? 0 : (prev + 1) % len
      })
    }, resolvedInterval)
    return () => clearInterval(id)
  }, [list, resolvedInterval])

  if (error) return (
    <div className="w-full h-full bg-slate-800 rounded-xl flex items-center justify-center">
      <div className="text-red-400">{error}</div>
    </div>
  )

  if (loading) return (
    <div className="w-full h-full bg-slate-800 rounded-xl animate-pulse" />
  )

  if (list.length === 0) return (
    <div className="w-full h-full bg-slate-800 rounded-xl flex items-center justify-center">
      <div className="text-slate-400 text-center p-6">
        <div className="text-4xl mb-2">🖼️</div>
        <div>Add images in Settings → Photos</div>
      </div>
    </div>
  )

  const safeIdx = idx % list.length
  const photo = list[safeIdx]
  const kbVariant = KB_VARIANTS[safeIdx % KB_VARIANTS.length]

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Blurred backdrop fills letterbox areas */}
      <img
        src={photo.src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scale(1.15)', filter: 'blur(18px) brightness(0.45)' }}
      />
      {/* Foreground — full image with Ken Burns zoom/pan. Key restarts animation on change. */}
      <img
        key={safeIdx}
        src={photo.src}
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ animation: `${kbVariant} ${resolvedInterval}ms linear forwards` }}
      />
    </div>
  )
}
