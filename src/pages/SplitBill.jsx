import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'
import { useExpenses } from '../hooks/useExpenses'
import { useIdentity } from '../hooks/useIdentity'
import CategoryPicker from '../components/CategoryPicker'
import NameChip from '../components/NameChip'
import { formatRupiah } from '../utils/currency'
import { parseReceiptWithGemini } from '../utils/gemini'

export default function SplitBill() {
  const { tripId } = useParams()
  const [searchParams] = useSearchParams()
  const editExpenseId = searchParams.get('edit')
  const isEdit = !!editExpenseId
  const navigate = useNavigate()

  const { trip } = useTrip(tripId)
  const { expenses, addExpense, updateExpense } = useExpenses(tripId)
  const { identity } = useIdentity(tripId)

  const [category, setCategory] = useState('food')
  const [paidBy, setPaidBy] = useState('')
  const [items, setItems] = useState([{ id: 1, name: '', price: 0, assignedTo: [] }])
  const [serviceCharge, setServiceCharge] = useState(0)
  const [tax, setTax] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const fileInputRef = useRef(null)
  const nextId = useRef(2)
  const editInitialized = useRef(false)

  // Set default paidBy from identity
  useEffect(() => {
    if (!isEdit && identity && !paidBy) setPaidBy(identity)
  }, [identity, isEdit, paidBy])

  // Edit mode: pre-populate from stored perPersonAmounts as single item per person
  useEffect(() => {
    if (isEdit && !editInitialized.current && expenses.length > 0) {
      const expense = expenses.find((e) => e.id === editExpenseId)
      if (expense && expense.perPersonAmounts) {
        editInitialized.current = true
        setCategory(expense.category)
        setPaidBy(expense.paidBy)
        // Represent each person's amount as a separate item assigned only to them
        const restoredItems = Object.entries(expense.perPersonAmounts).map(([person, amount], i) => ({
          id: i + 1,
          name: person,
          price: amount,
          assignedTo: [person],
        }))
        nextId.current = restoredItems.length + 1
        setItems(restoredItems)
      }
    }
  }, [isEdit, editExpenseId, expenses])

  const participants = trip?.participants || []

  function addItem() {
    setItems((prev) => [...prev, { id: nextId.current++, name: '', price: 0, assignedTo: [] }])
  }

  function updateItem(id, field, value) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function toggleAssignment(itemId, personName) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        const assignedTo = item.assignedTo.includes(personName)
          ? item.assignedTo.filter((n) => n !== personName)
          : [...item.assignedTo, personName]
        return { ...item, assignedTo }
      })
    )
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleScan(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setOcrLoading(true)
    setOcrError('')
    try {
      const base64 = await fileToBase64(file)
      const parsed = await parseReceiptWithGemini(base64, file.type)
      if (parsed.length > 0) {
        setItems(parsed.map((item) => ({ id: nextId.current++, name: item.name, price: item.price, assignedTo: [] })))
      }
    } catch {
      setOcrError("Couldn't read receipt — please add items manually")
    } finally {
      setOcrLoading(false)
    }
  }

  function computePerPersonAmounts() {
    const totals = {}
    for (const item of items) {
      if (!item.price || item.assignedTo.length === 0) continue
      const share = Math.round(item.price / item.assignedTo.length)
      for (const person of item.assignedTo) {
        totals[person] = (totals[person] || 0) + share
      }
    }
    const multiplier = 1 + serviceCharge / 100 + tax / 100
    const result = {}
    for (const [person, subtotal] of Object.entries(totals)) {
      result[person] = Math.round(subtotal * multiplier)
    }
    return result
  }

  const perPersonAmounts = computePerPersonAmounts()
  const totalAmount = Object.values(perPersonAmounts).reduce((s, v) => s + v, 0)
  const hasValidItems = items.some((i) => i.price > 0 && i.assignedTo.length > 0)

  async function handleSave() {
    if (!hasValidItems || !paidBy) return
    setSaving(true)
    setSaveError('')
    try {
      const splitAmong = Object.keys(perPersonAmounts)
      const data = {
        category,
        amount: totalAmount,
        paidBy,
        payerIncluded: false,
        splitAmong,
        perPersonAmounts,
      }
      if (isEdit) {
        await updateExpense(editExpenseId, data)
      } else {
        await addExpense(data)
      }
      navigate(`/trip/${tripId}`)
    } catch {
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!trip) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl">←</button>
        <h1 className="text-white font-bold text-base">{isEdit ? 'Edit Split Bill' : 'Split Bill'}</h1>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={ocrLoading}
          className="ml-auto bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
        >
          {ocrLoading ? 'Scanning...' : '📷 Scan Receipt'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleScan}
        />
      </div>

      {ocrError && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 text-xs px-3 py-2 rounded-lg mb-4">
          {ocrError}
        </div>
      )}

      <div className="space-y-5 flex-1">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Category</label>
          <CategoryPicker value={category} onChange={setCategory} />
        </div>

        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Paid by</label>
          <div className="flex flex-wrap gap-2">
            {participants.map((name) => (
              <NameChip key={name} name={name} selected={paidBy === name} onToggle={() => setPaidBy(name)} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Items</label>
            <button onClick={addItem} className="text-accent text-xs">+ Add Item</button>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="bg-card rounded-xl p-3">
                <div className="flex gap-2 mb-2">
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    placeholder="Item name"
                    className="flex-1 bg-deep text-white text-xs px-3 py-2 rounded-lg outline-none"
                  />
                  <div className="relative flex items-center">
                    <span className="absolute left-2 text-gray-400 text-xs pointer-events-none">Rp</span>
                    <input
                      type="number"
                      value={item.price || ''}
                      onChange={(e) => updateItem(item.id, 'price', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="bg-deep text-white text-xs pl-8 pr-2 py-2 rounded-lg outline-none w-28"
                    />
                  </div>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(item.id)} className="text-gray-500 text-sm px-1">×</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {participants
                    .filter((p) => p !== paidBy)
                    .map((name) => (
                      <button
                        key={name}
                        onClick={() => toggleAssignment(item.id, name)}
                        className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                          item.assignedTo.includes(name) ? 'bg-accent text-white' : 'bg-deep text-gray-400'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Service & Tax</label>
          <div className="flex gap-3">
            <div className="flex-1 bg-card rounded-xl px-3 py-2.5">
              <div className="text-gray-400 text-xs mb-1">Service charge %</div>
              <input
                type="number"
                value={serviceCharge || ''}
                onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="bg-transparent text-white text-sm font-semibold outline-none w-full"
              />
            </div>
            <div className="flex-1 bg-card rounded-xl px-3 py-2.5">
              <div className="text-gray-400 text-xs mb-1">Tax (PPN) %</div>
              <input
                type="number"
                value={tax || ''}
                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="bg-transparent text-white text-sm font-semibold outline-none w-full"
              />
            </div>
          </div>
        </div>

        {Object.keys(perPersonAmounts).length > 0 && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Each person pays</label>
            <div className="bg-card rounded-xl divide-y divide-deep">
              {Object.entries(perPersonAmounts).map(([name, amount]) => (
                <div key={name} className="flex justify-between items-center px-3 py-2.5">
                  <span className="text-white text-sm">{name}</span>
                  <span className="text-accent font-bold text-sm">{formatRupiah(amount)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-3 py-2.5">
                <span className="text-gray-400 text-xs">Total</span>
                <span className="text-white font-bold text-sm">{formatRupiah(totalAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {saveError && (
        <div className="mt-4 bg-red-900/30 border border-red-700 text-red-300 text-xs px-3 py-2 rounded-lg">
          {saveError}
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={!hasValidItems || !paidBy || saving}
        className="mt-4 w-full bg-accent text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-40"
      >
        {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Split Bill'}
      </button>
    </div>
  )
}
