import React from 'react'
import { addItem, addList, clearCompleted, loadState, removeItem, removeList, renameList, saveState, setActive, toggleItem, type TodoState } from '../lib/todo'

export default function TodoWidget() {
  const [state, setState] = React.useState<TodoState>(() => loadState())
  const [text, setText] = React.useState('')
  const [newListName, setNewListName] = React.useState('')

  React.useEffect(() => { saveState(state) }, [state])

  const active = state.lists.find(l => l.id === state.activeListId)!

  function onAdd(e: React.FormEvent) {
    e.preventDefault()
    setState(s => addItem(s, s.activeListId, text))
    setText('')
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* List Tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {state.lists.map(l => (
          <button key={l.id} onClick={() => setState(s => setActive(s, l.id))} className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${l.id===state.activeListId? 'bg-sky-600 text-white':'bg-slate-700 text-slate-100'}`}>{l.name}</button>
        ))}
        <div className="flex items-center gap-2">
          <input value={newListName} onChange={e=>setNewListName(e.target.value)} placeholder="New list" className="bg-slate-800 text-slate-100 px-2 py-1 rounded border border-slate-700"/>
          <button onClick={()=> { if(newListName.trim()){ setState(s=>addList(s, newListName.trim())); setNewListName('') } }} className="px-2 py-1 bg-emerald-600 rounded text-white">Add</button>
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={onAdd} className="flex gap-2 mb-3">
        <input autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="Add a task" className="flex-1 bg-slate-800 text-slate-100 px-3 py-2 rounded border border-slate-700"/>
        <button className="px-3 py-2 bg-sky-600 rounded text-white">Add</button>
      </form>

      {/* Items */}
      <div className="flex-1 overflow-auto rounded bg-slate-800 p-2">
        {active.items.length === 0 ? (
          <div className="text-slate-400 text-center py-10">No items yet</div>
        ) : (
          <ul className="space-y-2">
            {active.items.map(it => (
              <li key={it.id} className="flex items-center gap-3 bg-slate-900/60 rounded px-3 py-2">
                <input type="checkbox" checked={it.done} onChange={()=> setState(s=>toggleItem(s, active.id, it.id))} className="w-6 h-6"/>
                <span className={`flex-1 ${it.done? 'line-through text-slate-400':'text-slate-100'}`}>{it.text}</span>
                <button onClick={()=> setState(s=>removeItem(s, active.id, it.id))} className="px-2 py-1 text-sm bg-rose-600 rounded text-white">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex justify-between mt-3">
        <button onClick={()=> setState(s=>clearCompleted(s, active.id))} className="px-3 py-2 bg-amber-600 rounded text-white">Clear Completed</button>
        {state.lists.length>1 && (
          <button onClick={()=> setState(s=>removeList(s, active.id))} className="px-3 py-2 bg-rose-700 rounded text-white">Delete List</button>
        )}
      </div>
    </div>
  )
}
