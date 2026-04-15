import { ref, onValue, push, update, set } from 'firebase/database'
import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { computeSettlements } from '../utils/settlement'

export function useExpenses(tripId) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tripId) { setLoading(false); return }
    const expRef = ref(db, `expenses/${tripId}`)
    return onValue(expRef, (snap) => {
      const data = snap.val() || {}
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }))
      list.sort((a, b) => b.createdAt - a.createdAt)
      setExpenses(list)
      setLoading(false)
    })
  }, [tripId])

  async function saveSettlements(expenseList) {
    const computed = computeSettlements(expenseList)
    const settRef = ref(db, `settlements/${tripId}`)
    const existingSnap = await new Promise((resolve) =>
      onValue(settRef, resolve, { onlyOnce: true })
    )
    const existingData = existingSnap.val() || {}

    const newData = {}
    computed.forEach((s, i) => {
      const match = Object.values(existingData).find(
        (e) => e.from === s.from && e.to === s.to
      )
      newData[`s${i}`] = { ...s, paid: match?.paid || false }
    })
    await set(settRef, Object.keys(newData).length > 0 ? newData : null)
  }

  async function addExpense(expense) {
    await push(ref(db, `expenses/${tripId}`), { ...expense, createdAt: Date.now() })
    const snap = await new Promise((resolve) =>
      onValue(ref(db, `expenses/${tripId}`), resolve, { onlyOnce: true })
    )
    const data = snap.val() || {}
    const list = Object.entries(data).map(([id, val]) => ({ id, ...val }))
    await saveSettlements(list)
  }

  async function updateExpense(expenseId, expense) {
    await update(ref(db, `expenses/${tripId}/${expenseId}`), expense)
    const snap = await new Promise((resolve) =>
      onValue(ref(db, `expenses/${tripId}`), resolve, { onlyOnce: true })
    )
    const data = snap.val() || {}
    const list = Object.entries(data).map(([id, val]) => ({ id, ...val }))
    await saveSettlements(list)
  }

  return { expenses, loading, addExpense, updateExpense }
}
