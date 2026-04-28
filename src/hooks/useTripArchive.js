import { ref, onValue, update } from 'firebase/database'
import { useState, useEffect } from 'react'
import { db } from '../firebase'

export function useTripArchive(tripId) {
  const [archived, setArchivedState] = useState(false)

  useEffect(() => {
    if (!tripId) return
    const archivedRef = ref(db, `trips/${tripId}/archived`)
    return onValue(archivedRef, (snap) => {
      setArchivedState(snap.val() === true)
    })
  }, [tripId])

  async function setArchived(bool) {
    await update(ref(db, `trips/${tripId}`), { archived: bool ? true : null })
  }

  return { archived, setArchived }
}
