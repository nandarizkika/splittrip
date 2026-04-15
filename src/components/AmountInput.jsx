export default function AmountInput({ value, onChange }) {
  const displayValue = value === 0 ? '' : value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  function handleChange(e) {
    const raw = e.target.value.replace(/\./g, '').replace(/\D/g, '')
    onChange(parseInt(raw, 10) || 0)
  }

  return (
    <div className="flex items-center gap-2 bg-card border border-deep rounded-lg px-3 py-2.5 focus-within:border-accent">
      <span className="text-accent font-bold text-sm">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder="0"
        className="flex-1 bg-transparent text-white text-base font-bold outline-none"
      />
    </div>
  )
}
