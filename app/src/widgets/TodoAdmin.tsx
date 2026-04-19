import { useEffect, useRef, useState } from 'react'
import {
  addItem, addList, loadState, removeItem, removeList,
  renameList, reorderLists, saveState, subscribeTodo, type TodoState,
} from '../lib/todo'

export default function TodoAdmin() {
  const [state, setState] = useState<TodoState>(loadState)
  const [newListName, setNewListName] = useState('')
  const [newItemText, setNewItemText] = useState<Record<string, string>>({})
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const dragIdx = useRef<number | null>(null)
  const canDrag = useRef(false)

  useEffect(() => { return subscribeTodo(() => setState(loadState())) }, [])

  useEffect(() => {
    const up = () => { canDrag.current = false }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  function commit(next: TodoState) { setState(next); saveState(next) }

  // ── drag handlers ──────────────────────────────────────────────────────────
  function onDragStart(e: React.DragEvent, idx: number) {
    if (!canDrag.current) { e.preventDefault(); return }
    dragIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDragOverIdx(idx)
  }
  function onDrop(e: React.DragEvent, toIdx: number) {
    e.preventDefault()
    setDragOverIdx(null)
    if (dragIdx.current !== null && dragIdx.current !== toIdx) {
      commit(reorderLists(state, dragIdx.current, toIdx))
    }
    dragIdx.current = null
  }
  function onDragEnd() { setDragOverIdx(null); dragIdx.current = null }

  // ── form handlers ──────────────────────────────────────────────────────────
  function handleAddList(e: React.FormEvent) {
    e.preventDefault()
    if (!newListName.trim()) return
    commit(addList(state, newListName.trim()))
    setNewListName('')
  }

  function handleAddItem(e: React.FormEvent, listId: string) {
    e.preventDefault()
    const text = (newItemText[listId] ?? '').trim()
    if (!text) return
    commit(addItem(state, listId, text))
    setNewItemText(p => ({ ...p, [listId]: '' }))
  }

  function startRename(listId: string, current: string) {
    setRenamingId(listId)
    setRenameText(current)
  }

  function commitRename(listId: string) {
    if (renameText.trim()) commit(renameList(state, listId, renameText.trim()))
    setRenamingId(null)
  }

  return (
    <div className="todo-admin">
      {/* Add new list */}
      <form onSubmit={handleAddList} className="todo-admin-new-list">
        <input
          value={newListName}
          onChange={e => setNewListName(e.target.value)}
          placeholder="New list name (e.g. Anthony, Kids…)"
          className="todo-admin-input"
        />
        <button type="submit" className="todo-admin-btn primary">+ Add List</button>
      </form>

      {state.lists.length === 0 && (
        <div className="todo-admin-hint">No lists yet — add one above.</div>
      )}

      {state.lists.map((list, idx) => (
        <div
          key={list.id}
          className={`todo-admin-list ${dragOverIdx === idx ? 'drag-over' : ''}`}
          draggable
          onDragStart={e => onDragStart(e, idx)}
          onDragOver={e => onDragOver(e, idx)}
          onDragLeave={() => setDragOverIdx(null)}
          onDrop={e => onDrop(e, idx)}
          onDragEnd={onDragEnd}
        >
          {/* List header */}
          <div className="todo-admin-list-header">
            {/* Drag handle */}
            <span
              className="todo-drag-handle"
              onMouseDown={() => { canDrag.current = true }}
              title="Drag to reorder"
            >⠿</span>

            {renamingId === list.id ? (
              <div className="todo-admin-rename-row">
                <input
                  value={renameText}
                  onChange={e => setRenameText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename(list.id)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  autoFocus
                  className="todo-admin-input"
                />
                <button onClick={() => commitRename(list.id)} className="todo-admin-btn small">Save</button>
                <button onClick={() => setRenamingId(null)} className="todo-admin-btn small muted">Cancel</button>
              </div>
            ) : (
              <>
                <button className="todo-admin-list-name" onClick={() => startRename(list.id, list.name)}>
                  {list.name} <span className="todo-admin-edit-icon">✎</span>
                </button>
                <span className="todo-admin-item-count">{list.items.length} item{list.items.length !== 1 ? 's' : ''}</span>
                {state.lists.length > 1 && (
                  <button
                    className="todo-admin-btn small danger"
                    onClick={() => { if (confirm(`Delete "${list.name}" and all its items?`)) commit(removeList(state, list.id)) }}
                  >
                    Delete list
                  </button>
                )}
              </>
            )}
          </div>

          {/* Add item */}
          <form onSubmit={e => handleAddItem(e, list.id)} className="todo-admin-add-item">
            <input
              value={newItemText[list.id] ?? ''}
              onChange={e => setNewItemText(p => ({ ...p, [list.id]: e.target.value }))}
              placeholder="Add a task…"
              className="todo-admin-input"
            />
            <button type="submit" className="todo-admin-btn small">Add</button>
          </form>

          {/* Items */}
          {list.items.length === 0 ? (
            <div className="todo-admin-empty">No tasks yet.</div>
          ) : (
            <ul className="todo-admin-items">
              {list.items.map(item => (
                <li key={item.id} className={`todo-admin-item ${item.done ? 'is-done' : ''}`}>
                  <span className="todo-admin-item-text">{item.text}</span>
                  {item.done && <span className="todo-admin-done-badge">checked</span>}
                  <button
                    className="todo-admin-item-delete"
                    onClick={() => commit(removeItem(state, list.id, item.id))}
                    title="Remove item"
                  >×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
