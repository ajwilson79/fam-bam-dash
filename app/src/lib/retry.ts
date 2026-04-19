export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts = 3, baseDelayMs = 1000 }: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      if (attempt < maxAttempts - 1) {
        await new Promise<void>(r => setTimeout(r, baseDelayMs * 2 ** attempt))
      }
    }
  }
  throw lastError
}
