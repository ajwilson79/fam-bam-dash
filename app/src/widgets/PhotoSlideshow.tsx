import React from 'react'
import { fetchGooglePhotosAlbum, getGooglePhotosToken, loadLocalPhotos, shuffle, type PhotoItem } from '../lib/photos'
import { loadSettings, subscribeSettings } from '../lib/settings'

function useLocalAndGooglePhotos() {
  const [photos, setPhotos] = React.useState<PhotoItem[]>([])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const local = loadLocalPhotos()
        let merged = local
        const s = loadSettings()
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
        const albumId = import.meta.env.VITE_GOOGLE_PHOTOS_ALBUM_ID as string | undefined
        if (s.slideshow.useGooglePhotos && clientId && albumId) {
          try {
            const token = await getGooglePhotosToken(clientId)
            const remote = await fetchGooglePhotosAlbum(token, albumId, 200)
            merged = [...local, ...remote]
          } catch (e: any) {
            console.warn('Google Photos load failed', e)
          }
        }
        if (mounted) setPhotos(merged)
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Photo load failed')
      }
    }
    load()
    const unsub = subscribeSettings(() => load())
    return () => {
      mounted = false
      unsub()
    }
  }, [])

  return { photos, error }
}

export default function PhotoSlideshow({ intervalMs, fadeMs = 800, shuffleOn }: { intervalMs?: number; fadeMs?: number; shuffleOn?: boolean }) {
  const { photos, error } = useLocalAndGooglePhotos()
  const [index, setIndex] = React.useState(0)
  const [ready, setReady] = React.useState(false)

  const s = loadSettings()
  const effectiveInterval = intervalMs ?? s.slideshow.intervalMs
  const effectiveShuffle = shuffleOn ?? s.slideshow.shuffle

  const list = React.useMemo(() => (effectiveShuffle ? shuffle(photos) : photos), [photos, effectiveShuffle])

  React.useEffect(() => {
    if (list.length === 0) return
    setReady(true)
    const id = setInterval(() => setIndex((i) => (i + 1) % list.length), effectiveInterval)
    return () => clearInterval(id)
  }, [list, effectiveInterval])

  if (error) return <div className="text-red-400">{error}</div>
  if (!ready || list.length === 0) return <div className="text-slate-300">Add images under src/assets/photos</div>

  const current = list[index]
  const next = list[(index + 1) % list.length]

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl bg-slate-800">
      {/* Current image */}
      <img
        key={current.id}
        src={current.src}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-100 transition-opacity"
        style={{ transitionDuration: `${fadeMs}ms` }}
      />
      {/* Preload next image off-screen */}
      {next && (
        <img
          key={next.id}
          src={next.src}
          alt=""
          className="absolute -z-10 -left-[9999px] -top-[9999px]"
        />
      )}
    </div>
  )
}
