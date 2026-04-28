import { useState } from 'react'

const KEY = 'splittrip_trips'

function readFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function useLocalTrips() {
  const [trips, setTrips] = useState(readFromStorage)

  function upsertTrip(tripId, name) {
    const existing = readFromStorage().filter((t) => t.tripId !== tripId)
    const updated = [{ tripId, name, lastVisited: Date.now() }, ...existing]
    localStorage.setItem(KEY, JSON.stringify(updated))
    setTrips(updated)
  }

  function removeTrip(tripId) {
    const updated = readFromStorage().filter((t) => t.tripId !== tripId)
    localStorage.setItem(KEY, JSON.stringify(updated))
    setTrips(updated)
  }

  return { trips, upsertTrip, removeTrip }
}
