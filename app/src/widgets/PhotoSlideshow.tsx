import React from 'react'
import { fetchGooglePhotosAlbum, getGooglePhotosToken, loadLocalPhotos, shuffle, type PhotoItem } from '../lib/photos'

function useLocalAndGooglePhotos() {
  const [photos, setPhotos] = React.useState<PhotoItem[]>([])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const local = loadLocalPhotos()
        let merged = local
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
        const albumId = import.meta.env.VITE_GOOGLE_PHOTOS_ALBUM_ID as string | undefined
        if (clientId && albumId) {
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
    // No interval by default; photos are mostly static. Could add refresh later.
    return () => {
      mounted = false
    }
  }, [])

  return { photos, error }
}

export default function PhotoSlideshow({ intervalMs = 12000, fadeMs = 800, shuffleOn = true }: { intervalMs?: number; fadeMs?: number; shuffleOn?: boolean }) {
  const { photos, error } = useLocalAndGooglePhotos()
  const [index, setIndex] = React.useState(0)
  const [ready, setReady] = React.useState(false)

  const list = React.useMemo(() => (shuffleOn ? shuffle(photos) : photos), [photos, shuffleOn])

  React.useEffect(() => {
    if (list.length === 0) return
    setReady(true)
    const id = setInterval(() => setIndex((i) => (i + 1) % list.length), intervalMs)
    return () => clearInterval(id)
  }, [list, intervalMs])

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
