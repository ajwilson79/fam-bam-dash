export function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return () => {
    clearTimeout(timer)
    timer = setTimeout(fn, ms)
  }
}
