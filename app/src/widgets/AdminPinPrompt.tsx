import { useEffect, useRef, useState } from 'react'
import { setStoredAdminPin, verifyAdminAccess } from '../lib/admin'

export default function AdminPinPrompt({ onSuccess, onCancel, message }: {
  onSuccess: () => void
  onCancel: () => void
  message?: string
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!pin || busy) return
    setBusy(true)
    setError(null)
    const result = await verifyAdminAccess(pin)
    setBusy(false)
    if (result.ok) {
      setStoredAdminPin(pin)
      onSuccess()
    } else {
      setError('Incorrect PIN')
      setPin('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-theme-card rounded-xl shadow-2xl p-6 flex flex-col gap-4"
      >
        <div>
          <h2 className="text-theme-text text-lg font-semibold">Admin PIN</h2>
          <p className="text-theme-muted text-sm mt-1">{message ?? 'Enter the PIN to open Settings on this device.'}</p>
        </div>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={e => setPin(e.target.value)}
          disabled={busy}
          className="bg-theme-elevated text-theme-text rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-theme-accent"
          placeholder="PIN"
        />

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-theme-elevated text-theme-text hover:opacity-80"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !pin}
            className="px-4 py-2 rounded-lg bg-theme-accent text-black font-medium disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </div>
      </form>
    </div>
  )
}
