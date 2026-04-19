import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withRetry } from '../lib/retry'

describe('withRetry', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns result immediately on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries and succeeds on second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    const promise = withRetry(fn, { baseDelayMs: 100 })
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws after exhausting all attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 })
    await vi.runAllTimersAsync()
    await expect(promise).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('respects custom maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))

    const promise = withRetry(fn, { maxAttempts: 1, baseDelayMs: 100 })
    await vi.runAllTimersAsync()
    await expect(promise).rejects.toThrow()
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
