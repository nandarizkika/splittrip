import { describe, it, expect } from 'vitest'
import { computeSettlements } from '../../src/utils/settlement'

describe('computeSettlements', () => {
  it('returns empty array for no expenses', () => {
    expect(computeSettlements([])).toEqual([])
  })

  it('payer not included: others owe payer their share', () => {
    const expenses = [{
      amount: 1500000,
      paidBy: 'Andri',
      payerIncluded: false,
      splitAmong: ['Nanda', 'Mega', 'Arul', 'Ama'],
    }]
    const result = computeSettlements(expenses)
    // 4 people each owe Andri 375000
    expect(result).toHaveLength(4)
    result.forEach((s) => {
      expect(s.to).toBe('Andri')
      expect(s.amount).toBe(375000)
    })
  })

  it('payer included: all 5 split evenly, 4 owe payer', () => {
    const expenses = [{
      amount: 1500000,
      paidBy: 'Andri',
      payerIncluded: true,
      splitAmong: ['Nanda', 'Mega', 'Arul', 'Ama'],
    }]
    const result = computeSettlements(expenses)
    // 5 people split 1500000 = 300000 each; 4 owe Andri
    expect(result).toHaveLength(4)
    result.forEach((s) => {
      expect(s.to).toBe('Andri')
      expect(s.amount).toBe(300000)
    })
  })

  it('two expenses are optimized into fewer transactions', () => {
    // Andri paid 600000, split among [Nanda, Mega] (payer not included)
    //   → Nanda owes Andri 300000, Mega owes Andri 300000
    // Nanda paid 300000, split among [Mega] (payer not included)
    //   → Mega owes Nanda 300000
    // Net: Andri +600k, Nanda 0, Mega -600k
    // Optimized: Mega pays Andri 600000 (1 transaction instead of 3)
    const expenses = [
      { amount: 600000, paidBy: 'Andri', payerIncluded: false, splitAmong: ['Nanda', 'Mega'] },
      { amount: 300000, paidBy: 'Nanda', payerIncluded: false, splitAmong: ['Mega'] },
    ]
    const result = computeSettlements(expenses)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ from: 'Mega', to: 'Andri', amount: 600000 })
  })
})
