const EWALLET_LABELS = {
  gopay: 'GoPay',
  ovo: 'OVO',
  dana: 'Dana',
  shopeepay: 'ShopeePay',
}

export function formatPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('62')) return digits
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  return '62' + digits
}

export function buildPaymentLine({ phone, ewallets, bankName, bankAccount, creditor }) {
  const parts = []
  if (ewallets && ewallets.length > 0 && phone) {
    const labels = ewallets.map((e) => EWALLET_LABELS[e] || e).join(' / ')
    parts.push(`${labels}: ${phone}`)
  }
  if (bankName && bankAccount) {
    parts.push(`${bankName}: ${bankAccount} a/n ${creditor}`)
  }
  return parts.join(' / ')
}

export function buildReminderMessage({ debtor, tripName, amountFormatted, creditor, phone, ewallets, bankName, bankAccount }) {
  const paymentLine = buildPaymentLine({ phone, ewallets, bankName, bankAccount, creditor })
  let msg = `Hey ${debtor}, reminder for trip ${tripName} — you owe ${amountFormatted} to ${creditor}.`
  if (paymentLine) msg += ` ${paymentLine}.`
  msg += ` Thanks! 🙏`
  return msg
}

export function buildWhatsAppUrl({ phone, message }) {
  const formatted = formatPhone(phone)
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`
}
