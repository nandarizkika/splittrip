export function formatRupiah(amount) {
  if (amount === 0) return 'Rp 0'
  return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function parseRupiahInput(str) {
  return parseInt(str.replace(/\./g, ''), 10) || 0
}
