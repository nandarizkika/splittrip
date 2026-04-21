import { describe, it, expect } from 'vitest'
import { computeSettlements } from '../../src/utils/settlement'

describe('computeSettlements', () => {
  it('handles amounts that do not divide evenly', () => {
    const expenses = [{
      amount: 1000000,
      paidBy: 'Andri',
      payerIncluded: false,
      splitAmong: ['Nanda', 'Mega', 'Arul'],
    }]
    const result = computeSettlements(expenses)
    // Total owed must equal total paid — no Rp 1 residual
    const totalOwed = result.reduce((sum, s) => sum + s.amount, 0)
    expect(totalOwed).toBe(1000000)
    expect(result).toHaveLength(3)
    expect(result.every(s => s.to === 'Andri')).toBe(true)
  })

  it('uses perPersonAmounts when present instead of equal split', () => {
    const expenses = [{
      amount: 160000,
      paidBy: 'Andri',
      payerIncluded: false,
      splitAmong: ['Nanda', 'Mega'],
      perPersonAmounts: { Nanda: 70000, Mega: 90000 },
    }]
    const result = computeSettlements(expenses)
    expect(result).toHaveLength(2)
    const nanda = result.find(s => s.from === 'Nanda')
    const mega = result.find(s => s.from === 'Mega')
    expect(nanda.amount).toBe(70000)
    expect(mega.amount).toBe(90000)
    expect(result.every(s => s.to === 'Andri')).toBe(true)
  })

  it('handles payer included in perPersonAmounts', () => {
    const expenses = [{
      amount: 160000,
      paidBy: 'Andri',
      payerIncluded: false,
      splitAmong: ['Nanda', 'Mega', 'Andri'],
      perPersonAmounts: { Nanda: 60000, Mega: 60000, Andri: 40000 },
    }]
    const result = computeSettlements(expenses)
    // Andri paid 160000, owes 40000 of own food → net +120000 credit
    // Nanda and Mega each owe 60000
    const totalOwed = result.reduce((s, r) => s + r.amount, 0)
    expect(totalOwed).toBe(120000)
    expect(result.every(s => s.to === 'Andri')).toBe(true)
  })
})
