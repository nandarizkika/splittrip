import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalTrips } from '../../src/hooks/useLocalTrips'

const KEY = 'splittrip_trips'

beforeEach(() => {
  localStorage.clear()
})

describe('useLocalTrips', () => {
  it('returns empty array when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalTrips())
    expect(result.current.trips).toEqual([])
  })

  it('upsertTrip adds a new entry with tripId, name, lastVisited', () => {
    const { result } = renderHook(() => useLocalTrips())
    act(() => result.current.upsertTrip('ABC123', 'Bali Trip'))
    expect(result.current.trips).toHaveLength(1)
    expect(result.current.trips[0].tripId).toBe('ABC123')
    expect(result.current.trips[0].name).toBe('Bali Trip')
    expect(typeof result.current.trips[0].lastVisited).toBe('number')
  })

  it('upsertTrip updates existing entry and moves it to front', () => {
    const { result } = renderHook(() => useLocalTrips())
    act(() => result.current.upsertTrip('ABC123', 'Bali Trip'))
    act(() => result.current.upsertTrip('XYZ456', 'Lombok'))
    act(() => result.current.upsertTrip('ABC123', 'Bali Trip Updated'))
    expect(result.current.trips[0].tripId).toBe('ABC123')
    expect(result.current.trips[0].name).toBe('Bali Trip Updated')
    expect(result.current.trips).toHaveLength(2)
  })

  it('removeTrip removes the entry', () => {
    const { result } = renderHook(() => useLocalTrips())
    act(() => result.current.upsertTrip('ABC123', 'Bali Trip'))
    act(() => result.current.upsertTrip('XYZ456', 'Lombok'))
    act(() => result.current.removeTrip('ABC123'))
    expect(result.current.trips).toHaveLength(1)
    expect(result.current.trips[0].tripId).toBe('XYZ456')
  })

  it('reads existing data from localStorage on mount', () => {
    localStorage.setItem(KEY, JSON.stringify([
      { tripId: 'ABC123', name: 'Bali', lastVisited: 1000 },
    ]))
    const { result } = renderHook(() => useLocalTrips())
    expect(result.current.trips).toHaveLength(1)
    expect(result.current.trips[0].tripId).toBe('ABC123')
  })
})
