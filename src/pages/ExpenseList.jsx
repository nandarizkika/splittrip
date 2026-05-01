import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'
import { useExpenses } from '../hooks/useExpenses'
import { useIdentity } from '../hooks/useIdentity'
import { useLocalTrips } from '../hooks/useLocalTrips'
import { formatRupiah } from '../utils/currency'
import ExpenseRow from '../components/ExpenseRow'

export default function ExpenseList() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip, loading: tripLoading } = useTrip(tripId)
  const { expenses, loading: expLoading } = useExpenses(tripId)
  const { identity } = useIdentity(tripId)
  const { upsertTrip } = useLocalTrips()

  useEffect(() => {
    if (!identity && !tripLoading) navigate(`/trip/${tripId}/identity`, { replace: true })
  }, [identity, tripLoading, tripId, navigate])

  useEffect(() => {
    if (trip?.name) upsertTrip(tripId, trip.name)
  }, [tripId, trip?.name, upsertTrip])

  if (tripLoading || expLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  }
  if (!trip) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Trip not found.</div>
  }

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)

  let myBalance = 0
  for (const e of expenses) {
    if (e.paidBy === identity) myBalance += e.amount

    if (e.perPersonAmounts && e.perPersonAmounts[identity] !== undefined) {
      myBalance -= e.perPersonAmounts[identity]
    } else {
      const people = e.payerIncluded
        ? [...new Set([e.paidBy, ...e.splitAmong])]
        : e.splitAmong
      if (people.includes(identity)) {
        const baseShare = Math.floor(e.amount / people.length)
        const remainder = e.amount - baseShare * people.length
        const myIndex = people.indexOf(identity)
        const myShare = myIndex === 0 ? baseShare + remainder : baseShare
        myBalance -= myShare
      }
    }
  }

  function handleEditExpense(e) {
    if (e.perPersonAmounts) {
      navigate(`/trip/${tripId}/splitbill?edit=${e.id}`)
    } else {
      navigate(`/trip/${tripId}/edit/${e.id}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="text-gray-400 text-lg leading-none">‹</button>
          <h1 className="text-white font-extrabold text-base">{trip.name}</h1>
        </div>
        <button onClick={() => navigate(`/trip/${tripId}/settings`)} className="text-xl">⚙️</button>
      </div>
      <p className="text-gray-400 text-xs mb-4">
        {(trip.participants || []).length} members · Code:{' '}
        <span className="text-accent font-semibold">{tripId}</span>
      </p>

      <div className="bg-card rounded-xl p-3 mb-4 flex justify-between items-center">
        <div>
          <div className="text-gray-400 text-xs uppercase tracking-wide">Total Spent</div>
          <div className="text-white font-extrabold text-base">{formatRupiah(totalSpent)}</div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-xs uppercase tracking-wide">
            {myBalance >= 0 ? "You're owed" : 'You owe'}
          </div>
          <div className={`font-bold text-sm ${myBalance >= 0 ? 'text-green-400' : 'text-accent'}`}>
            {formatRupiah(Math.abs(myBalance))}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2 mb-4">
        {expenses.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No expenses yet. Add the first one!</p>
        )}
        {expenses.map((e) => (
          <ExpenseRow
            key={e.id}
            expense={e}
            onEdit={() => handleEditExpense(e)}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate(`/trip/${tripId}/add`)}
          className="flex-1 bg-accent text-white py-3 rounded-xl font-bold text-sm"
        >
          + Add Expense
        </button>
        <button
          onClick={() => navigate(`/trip/${tripId}/splitbill`)}
          className="flex-1 bg-card border border-deep text-white py-3 rounded-xl text-sm"
        >
          🧾 Split Bill
        </button>
        <button
          onClick={() => navigate(`/trip/${tripId}/settlement`)}
          className="flex-1 bg-card border border-deep text-white py-3 rounded-xl text-sm"
        >
          Settlement →
        </button>
      </div>
    </div>
  )
}
