import { ref, onValue, update } from 'firebase/database'
import { useState, useEffect } from 'react'
import { db } from '../firebase'

export function useSettlements(tripId) {
  const [settlements, setSettlements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tripId) { setLoading(false); return }
    const settRef = ref(db, `settlements/${tripId}`)
    return onValue(settRef, (snap) => {
      const data = snap.val() || {}
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }))
      setSettlements(list)
      setLoading(false)
    })
  }, [tripId])

  async function markPaid(settlementId) {
    await update(ref(db, `settlements/${tripId}/${settlementId}`), { paid: true })
  }

  return { settlements, loading, markPaid }
}
