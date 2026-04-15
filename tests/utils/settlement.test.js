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
})
