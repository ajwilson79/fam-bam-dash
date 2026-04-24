import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { fetchUpcomingEvents, formatEventTime, type GCalEvent } from '../lib/gcal'

beforeAll(() => {
  Object.assign(import.meta.env, {
    VITE_GCAL_API_KEY: 'test-api-key',
    VITE_GCAL_CALENDAR_ID: 'test@test.com',
  })
})

afterEach(() => vi.restoreAllMocks())

function makeEvent(overrides: Partial<GCalEvent> = {}): GCalEvent {
  return {
    id: 'evt-1',
    summary: 'Team meeting',
    start: { dateTime: '2024-06-15T10:00:00' },
    end: { dateTime: '2024-06-15T11:00:00' },
    ...overrides,
  }
}

describe('formatEventTime', () => {
  it('formats all-day event', () => {
    const ev = makeEvent({ start: { date: '2024-06-15' }, end: { date: '2024-06-16' } })
    expect(formatEventTime(ev)).toContain('All day')
  })

  it('formats timed event on same day with range', () => {
    const result = formatEventTime(makeEvent())
    expect(result).toContain('–')
  })

  it('returns TBA when start is missing', () => {
    const ev = makeEvent({ start: {}, end: {} })
    expect(formatEventTime(ev)).toBe('TBA')
  })

  it('formats multi-day timed event without end time', () => {
    const ev = makeEvent({
      start: { dateTime: '2024-06-15T10:00:00' },
      end: { dateTime: '2024-06-16T10:00:00' },
    })
    const result = formatEventTime(ev)
    expect(result).not.toContain('–')
  })
})

describe('fetchUpcomingEvents', () => {
  it('returns parsed events array', async () => {
    const mockItems = [
      makeEvent({ id: '1', summary: 'Birthday' }),
      makeEvent({ id: '2', summary: 'Dentist' }),
    ]
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false })  // iCal probe fails → fall through to JSON API
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockItems }), text: async () => '' }),
    )

    const events = await fetchUpcomingEvents({ calendarId: 'test@test.com' })
    expect(events).toHaveLength(2)
    expect(events[0].summary).toBe('Birthday')
  })

  it('returns empty array when items is absent', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false })  // iCal probe fails → fall through to JSON API
      .mockResolvedValueOnce({ ok: true, json: async () => ({}), text: async () => '' }),
    )
    const events = await fetchUpcomingEvents({ calendarId: 'test@test.com' })
    expect(events).toEqual([])
  })

  it('throws on HTTP error with status in message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    }))
    await expect(fetchUpcomingEvents({ calendarId: 'test@test.com' })).rejects.toThrow('403')
  })
})
