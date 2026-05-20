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
  reorderItems,
  saveState,
  setActive,
  toggleItem,
  togglePin,
} from '../lib/todo'

describe('defaultState', () => {
  it('creates one list', () => {
    const s = defaultState()
    expect(s.lists).toHaveLength(1)
    expect(s.lists[0].name).toBe('Family')
  })

  it('sets first list as active', () => {
    const s = defaultState()
    expect(s.activeListId).toBe(s.lists[0].id)
  })
})

describe('addList', () => {
  it('appends a new list and makes it active', () => {
    const s = addList(defaultState(), 'Shopping')
    expect(s.lists).toHaveLength(2)
    expect(s.lists[1].name).toBe('Shopping')
    expect(s.activeListId).toBe(s.lists[1].id)
  })
})

describe('renameList', () => {
  it('renames the target list', () => {
    const s = defaultState()
    const renamed = renameList(s, s.lists[0].id, 'Household')
    expect(renamed.lists[0].name).toBe('Household')
  })

  it('does not affect other lists', () => {
    const s = addList(defaultState(), 'Groceries')
    const renamed = renameList(s, s.lists[0].id, 'X')
    expect(renamed.lists[1].name).toBe('Groceries')
  })
})

describe('removeList', () => {
  it('removes the specified list', () => {
    const s = addList(defaultState(), 'Groceries')
    const updated = removeList(s, s.lists[1].id)
    expect(updated.lists).toHaveLength(1)
    expect(updated.lists[0].name).toBe('Family')
  })

  it('does not remove the last list', () => {
    const s = defaultState()
    const still = removeList(s, s.lists[0].id)
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
    const s = addList(defaultState(), 'Groceries')
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
    const state = defaultState()
    const s = addItem(state, state.lists[0].id, 'task')
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

describe('togglePin', () => {
  it('pins an item and moves it to the top', () => {
    const s0 = defaultState()
    const listId = s0.lists[0].id
    let s = addItem(s0, listId, 'first')
    s = addItem(s, listId, 'second') // 'second' now at index 0, 'first' at index 1
    const firstId = s.lists[0].items[1].id
    const pinned = togglePin(s, listId, firstId)
    expect(pinned.lists[0].items[0].id).toBe(firstId)
    expect(pinned.lists[0].items[0].pinned).toBe(true)
  })

  it('unpinning drops the item below the remaining pinned block', () => {
    const s0 = defaultState()
    const listId = s0.lists[0].id
    let s = addItem(s0, listId, 'a')
    s = addItem(s, listId, 'b')
    s = addItem(s, listId, 'c') // order: c, b, a
    const aId = s.lists[0].items[2].id
    const bId = s.lists[0].items[1].id
    s = togglePin(s, listId, aId) // a pinned, top
    s = togglePin(s, listId, bId) // b pinned, top → order: b, a, c
    expect(s.lists[0].items.map(i => i.text)).toEqual(['b', 'a', 'c'])
    s = togglePin(s, listId, bId) // unpin b → drops below pinned 'a'
    expect(s.lists[0].items[0].text).toBe('a')
    expect(s.lists[0].items[1].text).toBe('b')
    expect(s.lists[0].items[1].pinned).toBeUndefined()
  })

  it('addItem inserts a new item below pinned items', () => {
    const s0 = defaultState()
    const listId = s0.lists[0].id
    let s = addItem(s0, listId, 'pinme')
    s = togglePin(s, listId, s.lists[0].items[0].id)
    s = addItem(s, listId, 'fresh')
    expect(s.lists[0].items[0].text).toBe('pinme')
    expect(s.lists[0].items[1].text).toBe('fresh')
  })
})

describe('reorderItems', () => {
  it('moves an item within its list', () => {
    const s0 = defaultState()
    const listId = s0.lists[0].id
    let s = addItem(s0, listId, 'a')
    s = addItem(s, listId, 'b')
    s = addItem(s, listId, 'c') // order: c, b, a
    const moved = reorderItems(s, listId, 0, 2)
    expect(moved.lists[0].items.map(i => i.text)).toEqual(['b', 'a', 'c'])
  })

  it('ignores out-of-bounds indices', () => {
    const s0 = defaultState()
    const listId = s0.lists[0].id
    const s = addItem(s0, listId, 'only')
    expect(reorderItems(s, listId, 0, 5)).toEqual(s)
  })

  it('ignores an unknown list id', () => {
    const s0 = defaultState()
    const s = addItem(s0, s0.lists[0].id, 'x')
    expect(reorderItems(s, 'ghost-list', 0, 0)).toEqual(s)
  })
})

describe('saveState / loadState', () => {
  it('round-trips state', () => {
    const state = defaultState()
    const s = addItem(state, state.lists[0].id, 'remembered')
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
