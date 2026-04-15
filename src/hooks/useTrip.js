import { ref, onValue, set, update } from 'firebase/database'
import { useState, useEffect } from 'react'
import { db } from '../firebase'

export function useTrip(tripId) {
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tripId) { setLoading(false); return }
    const tripRef = ref(db, `trips/${tripId}`)
    return onValue(tripRef, (snap) => {
      setTrip(snap.val())
      setLoading(false)
    })
  }, [tripId])

  async function createTrip(name, participants) {
    await set(ref(db, `trips/${tripId}`), {
      name,
      participants,
      createdAt: Date.now(),
    })
  }

  async function addMember(name) {
    const snap = await new Promise((resolve) =>
      onValue(ref(db, `trips/${tripId}`), resolve, { onlyOnce: true })
    )
    const current = snap.val() || {}
    const participants = [...(current.participants || []), name]
    await update(ref(db, `trips/${tripId}`), { participants })
  }

  return { trip, loading, createTrip, addMember }
}
