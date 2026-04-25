import { getTabId } from './settings'

export type TodoItem = {
  id: string
  text: string
  done: boolean
  updatedAt: number
  checkedAt?: number  // set when checked; item auto-removes 10 min after this
}
export type TodoList = { id: string; name: string; items: TodoItem[] }
export type TodoState = { lists: TodoList[]; activeListId: string }

export const DEFAULT_AUTO_REMOVE_MS = 10 * 60 * 1000

const STORAGE_KEY = 'fam-bam-todo'

// ── pub/sub so all components stay in sync ────────────────────────────────────
const listeners = new Set<() => void>()
export function subscribeTodo(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
function broadcast() {
  listeners.forEach(fn => { try { fn() } catch {} })
}

// ── storage ───────────────────────────────────────────────────────────────────
export function now() { return Date.now() }

export function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 8) + '-' + Date.now().toString(36)
}

export function defaultState(): TodoState {
  const list1: TodoList = { id: uid('list-'), name: 'Family', items: [] }
  return { lists: [list1], activeListId: list1.id }
}

function parseState(raw: string): TodoState | null {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.lists)) return null
    return parsed as TodoState
  } catch {
    return null
  }
}

// Synchronous read from localStorage — used for the initial render so the UI
// never shows a blank state while waiting for the server response.
export function loadState(): TodoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    return parseState(raw) ?? defaultState()
  } catch {
    return defaultState()
  }
}

// Persist to localStorage (instant) AND to the server file (durable).
export function saveState(state: TodoState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
  fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tab-Id': getTabId() },
    body: JSON.stringify(state),
  }).catch(() => {}) // fire-and-forget; localStorage copy is always written first
  broadcast()
}

// Called once on app startup: pulls the server file and applies it to localStorage.
// Server is the authoritative source — always wins over any cached local state.
export async function syncFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/todos')
    if (!res.ok) return
    const raw = await res.text()
    const serverState = parseState(raw)
    if (!serverState) return
    const localRaw = localStorage.getItem(STORAGE_KEY)
    if (localRaw !== raw) {
      localStorage.setItem(STORAGE_KEY, raw)
      broadcast()
    }
  } catch {}
}

// ── auto-remove logic ─────────────────────────────────────────────────────────

// Removes items checked longer ago than autoRemoveMs.
// Returns { state, changed } so callers can decide whether to persist.
export function autoRemoveExpired(state: TodoState, autoRemoveMs = DEFAULT_AUTO_REMOVE_MS): { state: TodoState; changed: boolean } {
  let changed = false
  const next: TodoState = {
    ...state,
    lists: state.lists.map(list => {
      const items = list.items.filter(item => {
        if (item.done && item.checkedAt && Date.now() - item.checkedAt >= autoRemoveMs) {
          changed = true
          return false
        }
        return true
      })
      return items.length === list.items.length ? list : { ...list, items }
    }),
  }
  return { state: next, changed }
}

// ── mutators ──────────────────────────────────────────────────────────────────

export function addList(state: TodoState, name: string): TodoState {
  const list: TodoList = { id: uid('list-'), name, items: [] }
  return { ...state, lists: [...state.lists, list], activeListId: list.id }
}

export function renameList(state: TodoState, listId: string, name: string): TodoState {
  return { ...state, lists: state.lists.map(l => l.id === listId ? { ...l, name } : l) }
}

export function removeList(state: TodoState, listId: string): TodoState {
  if (state.lists.length <= 1) return state
  const lists = state.lists.filter(l => l.id !== listId)
  const activeListId = state.activeListId === listId ? lists[0].id : state.activeListId
  return { ...state, lists, activeListId }
}

export function setActive(state: TodoState, listId: string): TodoState {
  if (!state.lists.some(l => l.id === listId)) return state
  return { ...state, activeListId: listId }
}

export function addItem(state: TodoState, listId: string, text: string): TodoState {
  const item: TodoItem = { id: uid('item-'), text: text.trim(), done: false, updatedAt: now() }
  if (!item.text) return state
  return { ...state, lists: state.lists.map(l => l.id === listId ? { ...l, items: [item, ...l.items] } : l) }
}

export function toggleItem(state: TodoState, listId: string, itemId: string): TodoState {
  return {
    ...state,
    lists: state.lists.map(l => l.id === listId ? {
      ...l,
      items: l.items.map(it => {
        if (it.id !== itemId) return it
        const becomingDone = !it.done
        return {
          ...it,
          done: becomingDone,
          checkedAt: becomingDone ? now() : undefined,
          updatedAt: now(),
        }
      }),
    } : l),
  }
}

export function removeItem(state: TodoState, listId: string, itemId: string): TodoState {
  return { ...state, lists: state.lists.map(l => l.id === listId ? { ...l, items: l.items.filter(it => it.id !== itemId) } : l) }
}

export function reorderLists(state: TodoState, fromIdx: number, toIdx: number): TodoState {
  if (fromIdx === toIdx) return state
  const lists = [...state.lists]
  const [moved] = lists.splice(fromIdx, 1)
  lists.splice(toIdx, 0, moved)
  return { ...state, lists }
}

export function clearCompleted(state: TodoState, listId: string): TodoState {
  return { ...state, lists: state.lists.map(l => l.id === listId ? { ...l, items: l.items.filter(it => !it.done) } : l) }
}
