import { describe, it, expect } from 'vitest'
import { formatRupiah, parseRupiahInput } from '../../src/utils/currency'

describe('formatRupiah', () => {
  it('formats zero', () => {
    expect(formatRupiah(0)).toBe('Rp 0')
  })
  it('formats millions', () => {
    expect(formatRupiah(1500000)).toBe('Rp 1.500.000')
  })
  it('formats hundreds of thousands', () => {
    expect(formatRupiah(300000)).toBe('Rp 300.000')
  })
  it('formats sub-thousand', () => {
    expect(formatRupiah(500)).toBe('Rp 500')
  })
})

describe('parseRupiahInput', () => {
  it('parses dot-formatted string', () => {
    expect(parseRupiahInput('1.500.000')).toBe(1500000)
  })
  it('parses raw digit string', () => {
    expect(parseRupiahInput('300000')).toBe(300000)
  })
  it('returns 0 for empty string', () => {
    expect(parseRupiahInput('')).toBe(0)
  })
})
