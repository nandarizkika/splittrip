export default function NameChip({ name, selected, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
        selected
          ? 'bg-accent text-white'
          : 'bg-card text-gray-400 border border-deep'
      }`}
    >
      {selected && <span>✓</span>}
      {name}
    </button>
  )
}
