import { ref, onValue, set } from 'firebase/database'
import { useState, useEffect } from 'react'
import { db } from '../firebase'

export function usePaymentInfo(tripId) {
  const [paymentInfo, setPaymentInfo] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tripId) { setLoading(false); return }
    const piRef = ref(db, `trips/${tripId}/paymentInfo`)
    return onValue(piRef, (snap) => {
      setPaymentInfo(snap.val() || {})
      setLoading(false)
    })
  }, [tripId])

  async function updatePaymentInfo(name, data) {
    const hasData =
      data.phone ||
      data.bankName ||
      data.bankAccount ||
      (data.ewallets && data.ewallets.length > 0)
    await set(
      ref(db, `trips/${tripId}/paymentInfo/${name}`),
      hasData ? data : null
    )
  }

  return { paymentInfo, loading, updatePaymentInfo }
}
