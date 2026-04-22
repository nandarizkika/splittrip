import { describe, it, expect } from 'vitest'
import { formatPhone, buildPaymentLine, buildReminderMessage, buildWhatsAppUrl } from '../../src/utils/whatsapp'

describe('formatPhone', () => {
  it('strips leading 0 and prepends 62', () => {
    expect(formatPhone('081234567890')).toBe('6281234567890')
  })

  it('leaves 62-prefixed numbers unchanged', () => {
    expect(formatPhone('6281234567890')).toBe('6281234567890')
  })

  it('returns empty string for empty input', () => {
    expect(formatPhone('')).toBe('')
  })

  it('strips non-digit characters', () => {
    expect(formatPhone('0812-3456-7890')).toBe('6281234567890')
  })
})

describe('buildPaymentLine', () => {
  it('includes ewallets and bank when both present', () => {
    const result = buildPaymentLine({
      phone: '081234567890',
      ewallets: ['gopay', 'ovo'],
      bankName: 'BCA',
      bankAccount: '1234567890',
      creditor: 'Nanda',
    })
    expect(result).toBe('GoPay / OVO: 081234567890 / BCA: 1234567890 a/n Nanda')
  })

  it('includes only ewallets when no bank', () => {
    const result = buildPaymentLine({
      phone: '081234567890',
      ewallets: ['gopay'],
      bankName: '',
      bankAccount: '',
      creditor: 'Nanda',
    })
    expect(result).toBe('GoPay: 081234567890')
  })

  it('includes only bank when no ewallets', () => {
    const result = buildPaymentLine({
      phone: '',
      ewallets: [],
      bankName: 'Mandiri',
      bankAccount: '9876543210',
      creditor: 'Mega',
    })
    expect(result).toBe('Mandiri: 9876543210 a/n Mega')
  })

  it('returns empty string when no payment info', () => {
    const result = buildPaymentLine({
      phone: '',
      ewallets: [],
      bankName: '',
      bankAccount: '',
      creditor: 'Nanda',
    })
    expect(result).toBe('')
  })

  it('supports dana and shopeepay labels', () => {
    const result = buildPaymentLine({
      phone: '081234567890',
      ewallets: ['dana', 'shopeepay'],
      bankName: '',
      bankAccount: '',
      creditor: 'Nanda',
    })
    expect(result).toBe('Dana / ShopeePay: 081234567890')
  })
})

describe('buildReminderMessage', () => {
  it('includes all parts when payment info is present', () => {
    const msg = buildReminderMessage({
      debtor: 'Mega',
      tripName: 'Bali Trip',
      amountFormatted: 'Rp 50.000',
      creditor: 'Nanda',
      phone: '081234567890',
      ewallets: ['gopay'],
      bankName: 'BCA',
      bankAccount: '1234567890',
    })
    expect(msg).toBe(
      'Hey Mega, reminder for trip Bali Trip — you owe Rp 50.000 to Nanda. GoPay: 081234567890 / BCA: 1234567890 a/n Nanda. Thanks! 🙏'
    )
  })

  it('omits payment line when no info set', () => {
    const msg = buildReminderMessage({
      debtor: 'Mega',
      tripName: 'Bali Trip',
      amountFormatted: 'Rp 50.000',
      creditor: 'Nanda',
      phone: '',
      ewallets: [],
      bankName: '',
      bankAccount: '',
    })
    expect(msg).toBe(
      'Hey Mega, reminder for trip Bali Trip — you owe Rp 50.000 to Nanda. Thanks! 🙏'
    )
  })
})

describe('buildWhatsAppUrl', () => {
  it('formats URL with formatted phone and encoded message', () => {
    const url = buildWhatsAppUrl({ phone: '081234567890', message: 'Hello Mega' })
    expect(url).toBe('https://wa.me/6281234567890?text=Hello%20Mega')
  })
})
