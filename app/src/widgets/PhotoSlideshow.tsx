import { useEffect, useMemo, useState } from 'react'
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

export default function PhotoSlideshow({ intervalMs, fadeMs = 800, shuffleOn }: { intervalMs?: number; fadeMs?: number; shuffleOn?: boolean }) {
  const { photos, error, loading } = useLocalAndGooglePhotos()
  const [index, setIndex] = useState(0)
  const [ready, setReady] = useState(false)

  const s = loadSettings()
  const effectiveInterval = intervalMs ?? s.slideshow.intervalMs
  const effectiveShuffle = shuffleOn ?? s.slideshow.shuffle

  const list = useMemo(() => (effectiveShuffle ? shuffle(photos) : photos), [photos, effectiveShuffle])

  useEffect(() => {
    if (list.length === 0) return
    setReady(true)
    const id = setInterval(() => setIndex((i) => (i + 1) % list.length), effectiveInterval)
    return () => clearInterval(id)
  }, [list, effectiveInterval])

  if (error) return (
    <div className="w-full h-full bg-slate-800 rounded-xl flex items-center justify-center">
      <div className="text-red-400">{error}</div>
    </div>
  )

  if (loading) return (
    <div className="w-full h-full bg-slate-800 rounded-xl animate-pulse" />
  )

  if (!ready || list.length === 0) return (
    <div className="w-full h-full bg-slate-800 rounded-xl flex items-center justify-center">
      <div className="text-slate-400 text-center p-6">
        <div className="text-4xl mb-2">🖼️</div>
        <div>Add images to src/assets/photos</div>
      </div>
    </div>
  )

  const current = list[index]
  const next = list[(index + 1) % list.length]

  return (
    <div className="relative w-full h-full overflow-hidden bg-black" style={{ borderRadius: 0 }}>
      {/* Blurred backdrop fills any letterbox gaps */}
      <img
        key={`bg-${current.id}`}
        src={current.src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover scale-110 transition-opacity"
        style={{ filter: 'blur(18px) brightness(0.45)', transitionDuration: `${fadeMs}ms` }}
      />
      {/* Full image, never cropped */}
      <img
        key={current.id}
        src={current.src}
        alt=""
        className="absolute inset-0 w-full h-full object-contain transition-opacity"
        style={{ transitionDuration: `${fadeMs}ms` }}
      />
      {/* Preload next */}
      {next && (
        <img
          key={`pre-${next.id}`}
          src={next.src}
          alt=""
          className="absolute -z-10 -left-[9999px] -top-[9999px]"
        />
      )}
    </div>
  )
}
