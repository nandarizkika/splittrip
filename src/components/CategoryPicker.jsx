import { useState } from 'react'

export const CATEGORIES = [
  { id: 'food', label: 'Food & Drinks', emoji: '🍜' },
  { id: 'transport', label: 'Transport', emoji: '🚗' },
  { id: 'accommodation', label: 'Accommodation', emoji: '🏨' },
  { id: 'shopping', label: 'Shopping', emoji: '🛒' },
  { id: 'other', label: 'Other', emoji: '📦' },
]

export default function CategoryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = CATEGORIES.find((c) => c.id === value) || CATEGORIES[0]
  const filtered = CATEGORIES.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase())
  )

  function select(cat) {
    onChange(cat.id)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 bg-card border border-deep rounded-lg px-3 py-2.5 text-left"
      >
        <span>{selected.emoji}</span>
        <span className="flex-1 text-white text-sm">{selected.label}</span>
        <span className="text-gray-500 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute z-10 w-full bg-deep border border-card rounded-lg mt-1 overflow-hidden">
          <div className="p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search..."
              className="w-full bg-card text-white text-sm px-3 py-2 rounded-lg outline-none"
              autoFocus
            />
          </div>
          {filtered.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => select(cat)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-card transition-colors ${
                cat.id === value ? 'bg-accent text-white' : 'text-gray-300'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
