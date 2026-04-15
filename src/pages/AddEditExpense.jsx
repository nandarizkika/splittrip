import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'
import { useExpenses } from '../hooks/useExpenses'
import { useIdentity } from '../hooks/useIdentity'
import CategoryPicker from '../components/CategoryPicker'
import AmountInput from '../components/AmountInput'
import NameChip from '../components/NameChip'
import { formatRupiah } from '../utils/currency'

export default function AddEditExpense() {
  const { tripId, expenseId } = useParams()
  const navigate = useNavigate()
  const isEdit = !!expenseId

  const { trip, addMember } = useTrip(tripId)
  const { expenses, addExpense, updateExpense } = useExpenses(tripId)
  const { identity } = useIdentity(tripId)

  const [category, setCategory] = useState('food')
  const [amount, setAmount] = useState(0)
  const [paidBy, setPaidBy] = useState('')
  const [payerIncluded, setPayerIncluded] = useState(false)
  const [splitAmong, setSplitAmong] = useState([])
  const [saving, setSaving] = useState(false)
  const [newMember, setNewMember] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (!isEdit && identity) setPaidBy(identity)
  }, [identity, isEdit])

  useEffect(() => {
    if (isEdit && !initialized.current && expenses.length > 0) {
      const e = expenses.find((x) => x.id === expenseId)
      if (e) {
        initialized.current = true
        setCategory(e.category)
        setAmount(e.amount)
        setPaidBy(e.paidBy)
        setPayerIncluded(e.payerIncluded)
        setSplitAmong(e.splitAmong)
      }
    }
  }, [isEdit, expenseId, expenses])

  const participants = trip?.participants || []

  function toggleSplit(name) {
    setSplitAmong((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  function selectAll() {
    setSplitAmong(participants.filter((p) => p !== paidBy))
  }

  async function handleAddMember() {
    const name = newMember.trim()
    if (!name || participants.includes(name)) return
    await addMember(name)
    setNewMember('')
    setShowAddMember(false)
  }

  const splitPeople = payerIncluded
    ? [...new Set([paidBy, ...splitAmong])]
    : splitAmong
  const perPerson = splitPeople.length > 0 ? Math.round(amount / splitPeople.length) : 0

  async function handleSave() {
    if (!amount || !paidBy || splitPeople.length === 0) return
    setSaving(true)
    try {
      const data = { category, amount, paidBy, payerIncluded, splitAmong }
      if (isEdit) {
        await updateExpense(expenseId, data)
      } else {
        await addExpense(data)
      }
      navigate(`/trip/${tripId}`)
    } finally {
      setSaving(false)
    }
  }

  if (!trip) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl">←</button>
        <h1 className="text-white font-bold text-base">{isEdit ? 'Edit Expense' : 'Add Expense'}</h1>
      </div>

      <div className="space-y-5 flex-1">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Category</label>
          <CategoryPicker value={category} onChange={setCategory} />
        </div>

        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Amount</label>
          <AmountInput value={amount} onChange={setAmount} />
        </div>

        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Paid by</label>
          <div className="flex flex-wrap gap-2">
            {participants.map((name) => (
              <NameChip
                key={name}
                name={name}
                selected={paidBy === name}
                onToggle={() => {
                  setPaidBy(name)
                  setSplitAmong((prev) => prev.filter((n) => n !== name))
                  setPayerIncluded(false)
                }}
              />
            ))}
          </div>
        </div>

        {paidBy && (
          <div className="bg-card rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-white text-sm">Include payer in split</div>
              <div className="text-gray-400 text-xs">{paidBy} also pays their own share</div>
            </div>
            <button
              onClick={() => setPayerIncluded(!payerIncluded)}
              className={`w-10 h-6 rounded-full transition-colors relative ${payerIncluded ? 'bg-accent' : 'bg-deep'}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  payerIncluded ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Split among</label>
            <button onClick={selectAll} className="text-accent text-xs">Select all</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {participants
              .filter((p) => p !== paidBy)
              .map((name) => (
                <NameChip
                  key={name}
                  name={name}
                  selected={splitAmong.includes(name)}
                  onToggle={() => toggleSplit(name)}
                />
              ))}
            {!showAddMember && (
              <button
                onClick={() => setShowAddMember(true)}
                className="px-3 py-1.5 rounded-full text-sm border border-dashed border-accent text-accent"
              >
                + New
              </button>
            )}
          </div>

          {showAddMember && (
            <div className="mt-3 bg-deep rounded-xl p-3 border border-accent">
              <div className="text-gray-400 text-xs mb-2">Add new member to trip</div>
              <div className="flex gap-2">
                <input
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                  placeholder="Type name..."
                  className="flex-1 bg-card text-white text-sm px-3 py-2 rounded-lg outline-none"
                  autoFocus
                />
                <button
                  onClick={handleAddMember}
                  className="bg-accent text-white px-3 py-2 rounded-lg text-sm font-semibold"
                >
                  Add
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-2">⚡ Added to the trip for everyone</p>
            </div>
          )}

          {splitPeople.length > 0 && amount > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Each pays: <span className="text-accent font-semibold">{formatRupiah(perPerson)}</span>
              {' '}({splitPeople.length} {splitPeople.length === 1 ? 'person' : 'people'})
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!amount || !paidBy || splitPeople.length === 0 || saving}
        className="mt-6 w-full bg-accent text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-40"
      >
        {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Expense'}
      </button>
    </div>
  )
}
