// Per-device admin PIN storage. The PIN gates admin mutations (settings,
// photo upload/delete, OAuth) on the server via the X-Admin-Pin header.
// If the server has FAM_BAM_ADMIN_PIN unset, /api/admin/verify returns
// pinConfigured: false and all requests pass regardless of this value.

const KEY = 'fam-bam-admin-pin'

export function getAdminPin(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}

export function setStoredAdminPin(pin: string): void {
  try { localStorage.setItem(KEY, pin) } catch { /* storage unavailable */ }
}

export function clearStoredAdminPin(): void {
  try { localStorage.removeItem(KEY) } catch { /* storage unavailable */ }
}

/** Headers to merge into any admin-scoped fetch. Empty object if no PIN stored. */
export function adminHeaders(): Record<string, string> {
  const pin = getAdminPin()
  return pin ? { 'X-Admin-Pin': pin } : {}
}

export type VerifyResult =
  | { ok: true; pinConfigured: boolean }
  | { ok: false; pinConfigured: true }        // pin needed but missing/wrong
  | { ok: false; pinConfigured: false }       // should not happen, fallback

/**
 * Calls /api/admin/verify with the given PIN (or the stored one, or no header).
 * On 200: { ok: true, pinConfigured }
 * On 401: { ok: false, pinConfigured: true }
 */
export async function verifyAdminAccess(pin?: string): Promise<VerifyResult> {
  const effectivePin = pin ?? getAdminPin() ?? ''
  const headers: Record<string, string> = effectivePin ? { 'X-Admin-Pin': effectivePin } : {}
  try {
    const res = await fetch('/api/admin/verify', { headers })
    if (res.ok) {
      const data = await res.json() as { pinConfigured: boolean }
      return { ok: true, pinConfigured: !!data.pinConfigured }
    }
    return { ok: false, pinConfigured: true }
  } catch {
    // Network error — treat as "pin configured but unverifiable" so the UI can prompt
    return { ok: false, pinConfigured: true }
  }
}
