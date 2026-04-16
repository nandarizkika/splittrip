# Split Bill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an itemized bill-splitting screen where one person scans a receipt (via Gemini Vision OCR) or types items manually, assigns each item to the people who ordered it, and saves the result as a single expense that integrates seamlessly with the existing totals and settlement.

**Architecture:** A new `SplitBill` page saves expenses with a `perPersonAmounts` map to Firebase. The settlement algorithm and balance calculation check for this field and use it directly instead of equal splitting. Gemini Vision API handles OCR — image is captured in-browser, base64-encoded, and sent to `gemini-1.5-flash`.

**Tech Stack:** React, Firebase Realtime Database, Gemini Vision API (`gemini-1.5-flash`), Vitest

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/utils/settlement.js` | Modify | Handle `perPersonAmounts` in balance calc |
| `src/utils/gemini.js` | Create | Gemini API call — image → `[{name, price}]` |
| `src/components/ExpenseRow.jsx` | Modify | Show "itemized" label when `perPersonAmounts` present |
| `src/pages/ExpenseList.jsx` | Modify | Add Split Bill button; update balance calc |
| `src/pages/SplitBill.jsx` | Create | Full split bill screen — item entry + OCR + save |
| `src/App.jsx` | Modify | Add route `/trip/:tripId/splitbill` |
| `.env.example` | Modify | Add `VITE_GEMINI_API_KEY=` |
| `tests/utils/settlement.test.js` | Modify | Add `perPersonAmounts` test cases |
| `tests/utils/gemini.test.js` | Create | Unit tests for receipt parsing |

---

### Task 1: Update settlement algorithm for perPersonAmounts

**Files:**
- Modify: `src/utils/settlement.js`
- Modify: `tests/utils/settlement.test.js`

- [ ] **Step 1: Add two failing tests for perPersonAmounts**

Open `tests/utils/settlement.test.js` and add after the existing test:

```js
it('uses perPersonAmounts when present instead of equal split', () => {
  const expenses = [{
    amount: 160000,
    paidBy: 'Andri',
    payerIncluded: false,
    splitAmong: ['Nanda', 'Mega'],
    perPersonAmounts: { Nanda: 70000, Mega: 90000 },
  }]
  const result = computeSettlements(expenses)
  expect(result).toHaveLength(2)
  const nanda = result.find(s => s.from === 'Nanda')
  const mega = result.find(s => s.from === 'Mega')
  expect(nanda.amount).toBe(70000)
  expect(mega.amount).toBe(90000)
  expect(result.every(s => s.to === 'Andri')).toBe(true)
})

it('handles payer included in perPersonAmounts', () => {
  const expenses = [{
    amount: 160000,
    paidBy: 'Andri',
    payerIncluded: false,
    splitAmong: ['Nanda', 'Mega', 'Andri'],
    perPersonAmounts: { Nanda: 60000, Mega: 60000, Andri: 40000 },
  }]
  const result = computeSettlements(expenses)
  // Andri paid 160000, owes 40000 of own food → net +120000 credit
  // Nanda and Mega each owe 60000
  const totalOwed = result.reduce((s, r) => s + r.amount, 0)
  expect(totalOwed).toBe(120000)
  expect(result.every(s => s.to === 'Andri')).toBe(true)
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/utils/settlement.test.js
```

Expected: 2 FAIL (the new tests), 1 PASS (existing test)

- [ ] **Step 3: Update computeSettlements to handle perPersonAmounts**

Replace the full content of `src/utils/settlement.js`:

```js
export function computeSettlements(expenses) {
  const balance = {}

  for (const expense of expenses) {
    const { amount, paidBy, payerIncluded, splitAmong, perPersonAmounts } = expense

    balance[paidBy] = (balance[paidBy] || 0) + amount

    if (perPersonAmounts && Object.keys(perPersonAmounts).length > 0) {
      for (const [person, personAmount] of Object.entries(perPersonAmounts)) {
        balance[person] = (balance[person] || 0) - personAmount
      }
    } else {
      const people = payerIncluded
        ? [...new Set([paidBy, ...splitAmong])]
        : [...splitAmong]
      const baseShare = Math.floor(amount / people.length)
      const remainder = amount - baseShare * people.length
      for (let k = 0; k < people.length; k++) {
        const personShare = k === 0 ? baseShare + remainder : baseShare
        balance[people[k]] = (balance[people[k]] || 0) - personShare
      }
    }
  }

  const creditors = Object.entries(balance)
    .filter(([, b]) => b > 0)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  const debtors = Object.entries(balance)
    .filter(([, b]) => b < 0)
    .map(([name, amount]) => ({ name, amount: -amount }))
    .sort((a, b) => b.amount - a.amount)

  const settlements = []
  let i = 0
  let j = 0

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i]
    const debtor = debtors[j]
    const amount = Math.min(creditor.amount, debtor.amount)
    settlements.push({ from: debtor.name, to: creditor.name, amount })
    creditor.amount -= amount
    debtor.amount -= amount
    if (creditor.amount === 0) i++
    if (debtor.amount === 0) j++
  }

  return settlements
}
```

- [ ] **Step 4: Run tests — all 3 should pass**

```bash
npx vitest run tests/utils/settlement.test.js
```

Expected: 3 PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/settlement.js tests/utils/settlement.test.js
git commit -m "feat: handle perPersonAmounts in settlement algorithm"
```

---

### Task 2: Gemini OCR utility

**Files:**
- Create: `src/utils/gemini.js`
- Create: `tests/utils/gemini.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/utils/gemini.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseReceiptWithGemini } from '../../src/utils/gemini'

describe('parseReceiptWithGemini', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses clean JSON response into items array', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: '[{"name":"Nasi Goreng","price":45000},{"name":"Es Teh","price":15000}]' }]
          }
        }]
      })
    })

    const result = await parseReceiptWithGemini('base64data', 'image/jpeg', 'test-key')
    expect(result).toEqual([
      { name: 'Nasi Goreng', price: 45000 },
      { name: 'Es Teh', price: 15000 },
    ])
  })

  it('strips markdown code fences from response', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: '```json\n[{"name":"Ayam Bakar","price":55000}]\n```' }]
          }
        }]
      })
    })

    const result = await parseReceiptWithGemini('base64data', 'image/png', 'test-key')
    expect(result).toEqual([{ name: 'Ayam Bakar', price: 55000 }])
  })

  it('throws on non-ok HTTP response', async () => {
    fetch.mockResolvedValue({ ok: false, status: 400 })
    await expect(parseReceiptWithGemini('data', 'image/jpeg', 'test-key'))
      .rejects.toThrow('Gemini API error: 400')
  })

  it('throws when no API key provided', async () => {
    await expect(parseReceiptWithGemini('data', 'image/jpeg', ''))
      .rejects.toThrow('VITE_GEMINI_API_KEY is not set')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/utils/gemini.test.js
```

Expected: 4 FAIL (module not found)

- [ ] **Step 3: Create gemini.js**

Create `src/utils/gemini.js`:

```js
const PROMPT =
  'You are a receipt parser. Extract all line items from this receipt. ' +
  'Return ONLY a JSON array with no markdown, no explanation. ' +
  'Format: [{"name": "Item Name", "price": 45000}, ...]. ' +
  'Prices as integers in the original currency, no symbols.'

export async function parseReceiptWithGemini(
  imageBase64,
  mimeType,
  apiKey = import.meta.env.VITE_GEMINI_API_KEY
) {
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
        { text: PROMPT },
      ]
    }]
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}
```

- [ ] **Step 4: Run tests — all 4 should pass**

```bash
npx vitest run tests/utils/gemini.test.js
```

Expected: 4 PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/gemini.js tests/utils/gemini.test.js
git commit -m "feat: Gemini Vision receipt OCR utility"
```

---

### Task 3: Update ExpenseRow and ExpenseList for itemized expenses

**Files:**
- Modify: `src/components/ExpenseRow.jsx`
- Modify: `src/pages/ExpenseList.jsx`

- [ ] **Step 1: Update ExpenseRow to show "itemized" label**

Replace the full content of `src/components/ExpenseRow.jsx`:

```jsx
import { formatRupiah } from '../utils/currency'
import { CATEGORIES } from './CategoryPicker'

export default function ExpenseRow({ expense, onEdit }) {
  const cat = CATEGORIES.find((c) => c.id === expense.category) || CATEGORIES[4]
  const date = new Date(expense.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
  const isItemized = !!expense.perPersonAmounts
  const peopleCount = expense.splitAmong.length + (expense.payerIncluded ? 1 : 0)
  const sublabel = isItemized ? 'itemized' : `${peopleCount} people`

  return (
    <div className="bg-card rounded-xl px-3 py-2.5 flex items-center gap-3">
      <span className="text-xl">{cat.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-white text-xs font-semibold">{cat.label}</div>
        <div className="text-gray-400 text-xs truncate">
          {expense.paidBy} · {sublabel} · {date}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-accent font-bold text-xs">{formatRupiah(expense.amount)}</span>
        <button
          onClick={onEdit}
          className="bg-deep text-gray-400 text-xs px-2 py-1 rounded"
        >
          ✏️
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update ExpenseList — balance calc + Split Bill button**

Replace the full content of `src/pages/ExpenseList.jsx`:

```jsx
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'
import { useExpenses } from '../hooks/useExpenses'
import { useIdentity } from '../hooks/useIdentity'
import { formatRupiah } from '../utils/currency'
import ExpenseRow from '../components/ExpenseRow'

export default function ExpenseList() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip, loading: tripLoading } = useTrip(tripId)
  const { expenses, loading: expLoading } = useExpenses(tripId)
  const { identity } = useIdentity(tripId)

  useEffect(() => {
    if (!identity && !tripLoading) navigate(`/trip/${tripId}/identity`, { replace: true })
  }, [identity, tripLoading, tripId, navigate])

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
        <h1 className="text-white font-extrabold text-base">{trip.name}</h1>
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
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all existing tests pass (no regressions)

- [ ] **Step 4: Commit**

```bash
git add src/components/ExpenseRow.jsx src/pages/ExpenseList.jsx
git commit -m "feat: itemized label on ExpenseRow, Split Bill button on ExpenseList"
```

---

### Task 4: SplitBill screen

**Files:**
- Create: `src/pages/SplitBill.jsx`

- [ ] **Step 1: Create SplitBill.jsx**

Create `src/pages/SplitBill.jsx`:

```jsx
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

      <button
        onClick={handleSave}
        disabled={!hasValidItems || !paidBy || saving}
        className="mt-6 w-full bg-accent text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-40"
      >
        {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Split Bill'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite (no new tests for this task — UI component)**

```bash
npx vitest run
```

Expected: all existing tests pass

- [ ] **Step 3: Commit**

```bash
git add src/pages/SplitBill.jsx
git commit -m "feat: SplitBill screen — manual item entry, OCR, service/tax, per-person totals"
```

---

### Task 5: Wire route, env, build, deploy

**Files:**
- Modify: `src/App.jsx`
- Modify: `.env.example`

- [ ] **Step 1: Add route to App.jsx**

Replace the full content of `src/App.jsx`:

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import IdentitySelection from './pages/IdentitySelection'
import ExpenseList from './pages/ExpenseList'
import TripSettings from './pages/TripSettings'
import AddEditExpense from './pages/AddEditExpense'
import Settlement from './pages/Settlement'
import SplitBill from './pages/SplitBill'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/trip/:tripId/identity" element={<IdentitySelection />} />
      <Route path="/trip/:tripId" element={<ExpenseList />} />
      <Route path="/trip/:tripId/settings" element={<TripSettings />} />
      <Route path="/trip/:tripId/add" element={<AddEditExpense />} />
      <Route path="/trip/:tripId/edit/:expenseId" element={<AddEditExpense />} />
      <Route path="/trip/:tripId/settlement" element={<Settlement />} />
      <Route path="/trip/:tripId/splitbill" element={<SplitBill />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
```

- [ ] **Step 2: Add Gemini key to .env.example**

Add this line to `.env.example`:

```
VITE_GEMINI_API_KEY=
```

Get your Gemini API key from https://aistudio.google.com/app/apikey (free, no billing required). Add it to `.env.local`:

```
VITE_GEMINI_API_KEY=your_key_here
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: build succeeds with no errors

- [ ] **Step 5: Commit and deploy**

```bash
git add src/App.jsx .env.example
git commit -m "feat: add SplitBill route and Gemini API key to env"
git push
firebase deploy --only hosting
```
