export function formatRupiah(amount) {
  if (amount === 0) return 'Rp 0'
  const abs = Math.abs(amount)
  const formatted = 'Rp ' + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return amount < 0 ? '-' + formatted : formatted
}

export function parseRupiahInput(str) {
  return parseInt(str.replace(/\./g, ''), 10) || 0
}
