import { useEffect, useState } from 'react'
import { addItem, addList, clearCompleted, loadState, removeItem, removeList, saveState, setActive, toggleItem, type TodoState } from '../lib/todo'

export default function TodoWidget() {
  const [state, setState] = useState<TodoState>(() => loadState())
  const [text, setText] = useState('')
  const [newListName, setNewListName] = useState('')

  useEffect(() => { saveState(state) }, [state])

  const active = state.lists.find(l => l.id === state.activeListId)!

  function onAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setState(s => addItem(s, s.activeListId, text))
    setText('')
  }

  return (
    <div className="h-full w-full flex flex-col">
      <h2 className="text-xl font-semibold mb-3">✅ To-Do</h2>
      
      {/* List Tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
        {state.lists.map(l => (
          <button 
            key={l.id} 
            onClick={() => setState(s => setActive(s, l.id))} 
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap touch-manipulation transition-colors ${
              l.id === state.activeListId 
                ? 'bg-sky-600 text-white' 
                : 'bg-slate-700 text-slate-100 hover:bg-slate-600'
            }`}
          >
            {l.name}
          </button>
        ))}
        <div className="flex items-center gap-2">
          <input 
            value={newListName} 
            onChange={e => setNewListName(e.target.value)} 
            placeholder="New list" 
            className="bg-slate-700 text-slate-100 px-3 py-2 rounded-lg border border-slate-600 focus:border-sky-500 outline-none min-w-[120px]"
          />
          <button 
            onClick={() => { 
              if (newListName.trim()) { 
                setState(s => addList(s, newListName.trim()))
                setNewListName('') 
              } 
            }} 
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white touch-manipulation transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={onAdd} className="flex gap-2 mb-3">
        <input 
          value={text} 
          onChange={e => setText(e.target.value)} 
          placeholder="Add a task" 
          className="flex-1 bg-slate-700 text-slate-100 px-4 py-3 rounded-lg border border-slate-600 focus:border-sky-500 outline-none"
        />
        <button 
          type="submit"
          className="px-6 py-3 bg-sky-600 hover:bg-sky-500 rounded-lg text-white touch-manipulation transition-colors"
        >
          Add
        </button>
      </form>

      {/* Items */}
      <div className="flex-1 overflow-auto rounded-lg bg-slate-700 p-3">
        {active.items.length === 0 ? (
          <div className="text-slate-400 text-center py-10">No items yet</div>
        ) : (
          <ul className="space-y-2">
            {active.items.map(it => (
              <li key={it.id} className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-3 touch-manipulation">
                <input 
                  type="checkbox" 
                  checked={it.done} 
                  onChange={() => setState(s => toggleItem(s, active.id, it.id))} 
                  className="w-5 h-5 cursor-pointer"
                />
                <span className={`flex-1 ${it.done ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                  {it.text}
                </span>
                <button 
                  onClick={() => setState(s => removeItem(s, active.id, it.id))} 
                  className="px-3 py-1 text-sm bg-rose-600 hover:bg-rose-500 rounded-lg text-white touch-manipulation transition-colors"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex justify-between mt-3 gap-2">
        <button 
          onClick={() => setState(s => clearCompleted(s, active.id))} 
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white touch-manipulation transition-colors"
        >
          Clear Completed
        </button>
        {state.lists.length > 1 && (
          <button 
            onClick={() => setState(s => removeList(s, active.id))} 
            className="px-4 py-2 bg-rose-700 hover:bg-rose-600 rounded-lg text-white touch-manipulation transition-colors"
          >
            Delete List
          </button>
        )}
      </div>
    </div>
  )
}
