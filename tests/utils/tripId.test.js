import { describe, it, expect } from 'vitest'
import { generateTripId } from '../../src/utils/tripId'

describe('generateTripId', () => {
  it('returns a 6-character uppercase alphanumeric string', () => {
    const id = generateTripId()
    expect(id).toMatch(/^[A-Z0-9]{6}$/)
  })

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, generateTripId))
    expect(ids.size).toBe(100)
  })
})
