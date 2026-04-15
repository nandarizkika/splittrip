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
    computed.forEach((s) => {
      const key = `${s.from}__${s.to}`
      newData[key] = { ...s, paid: existingData[key]?.paid || false }
    })
    await set(settRef, Object.keys(newData).length > 0 ? newData : null)
  }

  async function addExpense(expense) {
    const newExpense = { ...expense, createdAt: Date.now() }
    const pushed = await push(ref(db, `expenses/${tripId}`), newExpense)
    const merged = [...expenses, { id: pushed.key, ...newExpense }]
    await saveSettlements(merged)
  }

  async function updateExpense(expenseId, expenseData) {
    await update(ref(db, `expenses/${tripId}/${expenseId}`), expenseData)
    const merged = expenses.map((e) =>
      e.id === expenseId ? { ...e, ...expenseData } : e
    )
    await saveSettlements(merged)
  }

  return { expenses, loading, addExpense, updateExpense }
}
