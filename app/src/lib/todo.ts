export type TodoItem = { id: string; text: string; done: boolean; updatedAt: number }
export type TodoList = { id: string; name: string; items: TodoItem[] }
export type TodoState = { lists: TodoList[]; activeListId: string }

const STORAGE_KEY = 'fam-bam-todo'

export function now() { return Date.now() }

export function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 8) + '-' + Date.now().toString(36)
}

export function defaultState(): TodoState {
  const list1: TodoList = { id: uid('list-'), name: 'Family', items: [] }
  const list2: TodoList = { id: uid('list-'), name: 'Groceries', items: [] }
  return { lists: [list1, list2], activeListId: list1.id }
}

export function loadState(): TodoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.lists)) return defaultState()
    return parsed as TodoState
  } catch {
    return defaultState()
  }
}

export function saveState(state: TodoState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

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
      items: l.items.map(it => it.id === itemId ? { ...it, done: !it.done, updatedAt: now() } : it)
    } : l)
  }
}

export function removeItem(state: TodoState, listId: string, itemId: string): TodoState {
  return { ...state, lists: state.lists.map(l => l.id === listId ? { ...l, items: l.items.filter(it => it.id !== itemId) } : l) }
}

export function clearCompleted(state: TodoState, listId: string): TodoState {
  return { ...state, lists: state.lists.map(l => l.id === listId ? { ...l, items: l.items.filter(it => !it.done) } : l) }
}
