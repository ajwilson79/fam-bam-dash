import { describe, it, expect } from 'vitest'
import {
  addItem,
  addList,
  clearCompleted,
  defaultState,
  loadState,
  removeItem,
  removeList,
  renameList,
  saveState,
  setActive,
  toggleItem,
} from '../lib/todo'

describe('defaultState', () => {
  it('creates two lists', () => {
    const s = defaultState()
    expect(s.lists).toHaveLength(2)
    expect(s.lists[0].name).toBe('Family')
    expect(s.lists[1].name).toBe('Groceries')
  })

  it('sets first list as active', () => {
    const s = defaultState()
    expect(s.activeListId).toBe(s.lists[0].id)
  })
})

describe('addList', () => {
  it('appends a new list and makes it active', () => {
    const s = addList(defaultState(), 'Shopping')
    expect(s.lists).toHaveLength(3)
    expect(s.lists[2].name).toBe('Shopping')
    expect(s.activeListId).toBe(s.lists[2].id)
  })
})

describe('renameList', () => {
  it('renames the target list', () => {
    const s = defaultState()
    const renamed = renameList(s, s.lists[0].id, 'Household')
    expect(renamed.lists[0].name).toBe('Household')
  })

  it('does not affect other lists', () => {
    const s = defaultState()
    const renamed = renameList(s, s.lists[0].id, 'X')
    expect(renamed.lists[1].name).toBe('Groceries')
  })
})

describe('removeList', () => {
  it('removes the specified list', () => {
    const s = defaultState()
    const updated = removeList(s, s.lists[1].id)
    expect(updated.lists).toHaveLength(1)
    expect(updated.lists[0].name).toBe('Family')
  })

  it('does not remove the last list', () => {
    const s = defaultState()
    const one = removeList(s, s.lists[1].id)
    const still = removeList(one, one.lists[0].id)
    expect(still.lists).toHaveLength(1)
  })

  it('updates activeListId when active list is removed', () => {
    const s = defaultState()
    const updated = removeList(s, s.activeListId)
    expect(updated.lists.some(l => l.id === updated.activeListId)).toBe(true)
  })
})

describe('setActive', () => {
  it('changes activeListId', () => {
    const s = defaultState()
    const updated = setActive(s, s.lists[1].id)
    expect(updated.activeListId).toBe(s.lists[1].id)
  })

  it('ignores unknown list id', () => {
    const s = defaultState()
    const updated = setActive(s, 'ghost-id')
    expect(updated.activeListId).toBe(s.activeListId)
  })
})

describe('addItem', () => {
  it('prepends item to the list', () => {
    const s = defaultState()
    const listId = s.lists[0].id
    const updated = addItem(s, listId, 'Buy milk')
    expect(updated.lists[0].items).toHaveLength(1)
    expect(updated.lists[0].items[0].text).toBe('Buy milk')
    expect(updated.lists[0].items[0].done).toBe(false)
  })

  it('trims whitespace', () => {
    const s = defaultState()
    const updated = addItem(s, s.lists[0].id, '  hello  ')
    expect(updated.lists[0].items[0].text).toBe('hello')
  })

  it('ignores empty text', () => {
    const s = defaultState()
    const updated = addItem(s, s.lists[0].id, '   ')
    expect(updated.lists[0].items).toHaveLength(0)
  })
})

describe('toggleItem', () => {
  it('toggles done state', () => {
    const s = addItem(defaultState(), defaultState().lists[0].id, 'task')
    const listId = s.lists[0].id
    const itemId = s.lists[0].items[0].id
    const toggled = toggleItem(s, listId, itemId)
    expect(toggled.lists[0].items[0].done).toBe(true)
    const toggled2 = toggleItem(toggled, listId, itemId)
    expect(toggled2.lists[0].items[0].done).toBe(false)
  })
})

describe('removeItem', () => {
  it('removes the specified item', () => {
    const s0 = defaultState()
    const s1 = addItem(s0, s0.lists[0].id, 'task')
    const itemId = s1.lists[0].items[0].id
    const updated = removeItem(s1, s1.lists[0].id, itemId)
    expect(updated.lists[0].items).toHaveLength(0)
  })
})

describe('clearCompleted', () => {
  it('removes only done items', () => {
    const s0 = defaultState()
    const listId = s0.lists[0].id
    const s1 = addItem(s0, listId, 'a')
    const s2 = addItem(s1, listId, 'b')
    const itemId = s2.lists[0].items[0].id
    const toggled = toggleItem(s2, listId, itemId)
    const cleared = clearCompleted(toggled, listId)
    expect(cleared.lists[0].items).toHaveLength(1)
    expect(cleared.lists[0].items[0].done).toBe(false)
  })
})

describe('saveState / loadState', () => {
  it('round-trips state', () => {
    const s = addItem(defaultState(), defaultState().lists[0].id, 'remembered')
    saveState(s)
    const loaded = loadState()
    expect(loaded.lists[0].items[0].text).toBe('remembered')
  })

  it('returns defaultState on corrupt JSON', () => {
    localStorage.setItem('fam-bam-todo', '{{bad')
    const s = loadState()
    expect(s.lists.length).toBeGreaterThan(0)
  })
})
