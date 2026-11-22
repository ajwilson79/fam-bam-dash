// Tiny pub/sub that lets the dashboard slideshow tell the page backdrop which
// photo is currently showing, so the glass cards can sit over a blurred copy of it.

let current: string | null = null
const listeners = new Set<(src: string | null) => void>()

export function setBackdropPhoto(src: string | null): void {
  if (src === current) return
  current = src
  listeners.forEach(fn => fn(src))
}

export function getBackdropPhoto(): string | null {
  return current
}

export function subscribeBackdropPhoto(fn: (src: string | null) => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
