import { useEffect, useRef, useState } from 'react'
import {
  AUTO_REMOVE_MS, autoRemoveExpired, loadState, reorderLists,
  saveState, subscribeTodo, toggleItem, type TodoState,
} from '../lib/todo'

function timeLeft(checkedAt: number): string {
  const ms = AUTO_REMOVE_MS - (Date.now() - checkedAt)
  if (ms <= 0) return ''
  return `${Math.ceil(ms / 60_000)}m`
}

export default function TodoPanel() {
  const [state, setState] = useState<TodoState>(loadState)
  const [, setTick] = useState(0)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const dragIdx = useRef<number | null>(null)
  const canDrag = useRef(false)

  useEffect(() => { return subscribeTodo(() => setState(loadState())) }, [])

  useEffect(() => {
    const up = () => { canDrag.current = false }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  // Tick every 30 s: refresh countdowns + purge expired items
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1)
      const { state: cleaned, changed } = autoRemoveExpired(loadState())
      if (changed) { saveState(cleaned); setState(cleaned) }
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  function commit(next: TodoState) { setState(next); saveState(next) }

  function toggle(listId: string, itemId: string) {
    commit(toggleItem(state, listId, itemId))
  }

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

  return (
    <div className="todo-panel-grid">
      {state.lists.map((list, idx) => (
        <div
          key={list.id}
          className={`todo-panel-col ${dragOverIdx === idx ? 'drag-over' : ''}`}
          draggable
          onDragStart={e => onDragStart(e, idx)}
          onDragOver={e => onDragOver(e, idx)}
          onDragLeave={() => setDragOverIdx(null)}
          onDrop={e => onDrop(e, idx)}
          onDragEnd={onDragEnd}
        >
          <div className="todo-panel-header">
            <span
              className="todo-drag-handle"
              onMouseDown={() => { canDrag.current = true }}
              title="Drag to reorder"
            >⠿</span>
            {list.name}
          </div>
          <ul className="todo-panel-items">
            {list.items.length === 0 ? (
              <li className="todo-panel-empty">Nothing here yet</li>
            ) : (
              list.items.map(item => (
                <li key={item.id} className={`todo-panel-item ${item.done ? 'is-done' : ''}`}>
                  <label className="todo-panel-check-label">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggle(list.id, item.id)}
                    />
                    <span className="todo-panel-check-box" />
                  </label>
                  <span className="todo-panel-text">{item.text}</span>
                  {item.done && item.checkedAt && (
                    <span className="todo-panel-countdown">{timeLeft(item.checkedAt)}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      ))}
    </div>
  )
}
