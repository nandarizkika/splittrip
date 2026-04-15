# TripSplit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first React web app for splitting trip expenses in real-time across multiple devices using Firebase.

**Architecture:** Single-page React app with client-side routing. Firebase Realtime Database provides live sync across all devices. No backend server — all logic runs in the browser. Identity is stored in localStorage per trip, no auth required.

**Tech Stack:** React 18, Vite 5, Firebase 10 (Realtime Database + Hosting), React Router 6, Tailwind CSS 3, Vitest + @testing-library/react

---

## File Structure

```
src/
  main.jsx                        # App entry, renders <App /> inside BrowserRouter
  App.jsx                         # React Router route definitions
  firebase.js                     # Firebase app init + db export
  test-setup.js                   # Vitest setup — imports @testing-library/jest-dom

  utils/
    currency.js                   # formatRupiah(amount), parseRupiahInput(str)
    settlement.js                 # computeSettlements(expenses[]) → settlements[]
    tripId.js                     # generateTripId() → 6-char uppercase string

  hooks/
    useTrip.js                    # Real-time trip subscription + createTrip, addMember
    useExpenses.js                # Real-time expenses subscription + addExpense, updateExpense
    useSettlements.js             # Real-time settlements subscription + markPaid
    useIdentity.js                # localStorage identity per tripId

  components/
    NameChip.jsx                  # Selectable name pill — selected/idle state
    CategoryPicker.jsx            # Searchable dropdown, 5 categories; exports CATEGORIES
    AmountInput.jsx               # Rp-formatted numeric input
    ExpenseRow.jsx                # Expense list row with ✏️ edit button
    SettlementRow.jsx             # Settlement row with Mark Paid + 📋 copy buttons

  pages/
    Home.jsx                      # Create / Join tab toggle
    IdentitySelection.jsx         # "Who are you?" — pick name once per device per trip
    ExpenseList.jsx               # Main trip screen — list + summary bar + navigation
    TripSettings.jsx              # Manage members, show trip code
    AddEditExpense.jsx            # Add / Edit expense form (all fields)
    Settlement.jsx                # Settlement summary — outstanding + settled sections

tests/
  utils/
    currency.test.js
    settlement.test.js
  components/
    NameChip.test.jsx
    AmountInput.test.jsx

index.html
vite.config.js
tailwind.config.js
.env.example
.gitignore
firebase.json                     # created in Task 11
.firebaserc                       # created in Task 11
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`, `vite.config.js`, `tailwind.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/index.css`, `src/test-setup.js`, `.env.example`, `.gitignore`

- [ ] **Step 1: Scaffold Vite + React**

```bash
cd /Users/nandarizkika/Documents/Project/trip_spending
npm create vite@latest . -- --template react
```
Expected: `package.json`, `src/`, `index.html` created.

- [ ] **Step 2: Install dependencies**

```bash
npm install firebase react-router-dom
npm install -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Replace `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#1a1a2e',
        card: '#16213e',
        deep: '#0f3460',
        accent: '#e94560',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Configure Vitest**

Replace `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
  },
})
```

- [ ] **Step 5: Create test setup file**

Create `src/test-setup.js`:

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Replace global CSS**

Replace `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #1a1a2e;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100dvh;
}

#root {
  max-width: 430px;
  margin: 0 auto;
  min-height: 100dvh;
}
```

- [ ] **Step 7: Create .env.example**

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

Copy to `.env.local` and fill in your Firebase project credentials (create project at console.firebase.google.com, enable Realtime Database in test mode).

- [ ] **Step 8: Create .gitignore**

```
node_modules/
dist/
.env.local
.env
.firebase/
```

- [ ] **Step 9: Verify dev server starts**

```bash
npm run dev
```
Expected: `http://localhost:5173` opens without errors.

- [ ] **Step 10: Commit**

```bash
git init
git add package.json vite.config.js tailwind.config.js index.html src/ .env.example .gitignore
git commit -m "feat: initial project setup — Vite + React + Firebase + Tailwind + Vitest"
```

---

## Task 2: Utility functions + Firebase config

**Files:**
- Create: `src/firebase.js`, `src/utils/currency.js`, `src/utils/settlement.js`, `src/utils/tripId.js`
- Test: `tests/utils/currency.test.js`, `tests/utils/settlement.test.js`

- [ ] **Step 1: Write currency tests**

Create `tests/utils/currency.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { formatRupiah, parseRupiahInput } from '../../src/utils/currency'

describe('formatRupiah', () => {
  it('formats zero', () => {
    expect(formatRupiah(0)).toBe('Rp 0')
  })
  it('formats millions', () => {
    expect(formatRupiah(1500000)).toBe('Rp 1.500.000')
  })
  it('formats hundreds of thousands', () => {
    expect(formatRupiah(300000)).toBe('Rp 300.000')
  })
  it('formats sub-thousand', () => {
    expect(formatRupiah(500)).toBe('Rp 500')
  })
})

describe('parseRupiahInput', () => {
  it('parses dot-formatted string', () => {
    expect(parseRupiahInput('1.500.000')).toBe(1500000)
  })
  it('parses raw digit string', () => {
    expect(parseRupiahInput('300000')).toBe(300000)
  })
  it('returns 0 for empty string', () => {
    expect(parseRupiahInput('')).toBe(0)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/utils/currency.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement currency utils**

Create `src/utils/currency.js`:

```js
export function formatRupiah(amount) {
  if (amount === 0) return 'Rp 0'
  return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function parseRupiahInput(str) {
  return parseInt(str.replace(/\./g, ''), 10) || 0
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run tests/utils/currency.test.js
```
Expected: PASS (7 tests).

- [ ] **Step 5: Write settlement tests**

Create `tests/utils/settlement.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { computeSettlements } from '../../src/utils/settlement'

describe('computeSettlements', () => {
  it('returns empty array for no expenses', () => {
    expect(computeSettlements([])).toEqual([])
  })

  it('payer not included: others owe payer their share', () => {
    const expenses = [{
      amount: 1500000,
      paidBy: 'Andri',
      payerIncluded: false,
      splitAmong: ['Nanda', 'Mega', 'Arul', 'Ama'],
    }]
    const result = computeSettlements(expenses)
    // 4 people each owe Andri 375000
    expect(result).toHaveLength(4)
    result.forEach((s) => {
      expect(s.to).toBe('Andri')
      expect(s.amount).toBe(375000)
    })
  })

  it('payer included: all 5 split evenly, 4 owe payer', () => {
    const expenses = [{
      amount: 1500000,
      paidBy: 'Andri',
      payerIncluded: true,
      splitAmong: ['Nanda', 'Mega', 'Arul', 'Ama'],
    }]
    const result = computeSettlements(expenses)
    // 5 people split 1500000 = 300000 each; 4 owe Andri
    expect(result).toHaveLength(4)
    result.forEach((s) => {
      expect(s.to).toBe('Andri')
      expect(s.amount).toBe(300000)
    })
  })

  it('two expenses are optimized into fewer transactions', () => {
    // Andri paid 600000, split among [Nanda, Mega] (payer not included)
    //   → Nanda owes Andri 300000, Mega owes Andri 300000
    // Nanda paid 300000, split among [Mega] (payer not included)
    //   → Mega owes Nanda 300000
    // Net: Andri +600k, Nanda 0, Mega -600k
    // Optimized: Mega pays Andri 600000 (1 transaction instead of 3)
    const expenses = [
      { amount: 600000, paidBy: 'Andri', payerIncluded: false, splitAmong: ['Nanda', 'Mega'] },
      { amount: 300000, paidBy: 'Nanda', payerIncluded: false, splitAmong: ['Mega'] },
    ]
    const result = computeSettlements(expenses)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ from: 'Mega', to: 'Andri', amount: 600000 })
  })
})
```

- [ ] **Step 6: Run — expect FAIL**

```bash
npx vitest run tests/utils/settlement.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 7: Implement settlement algorithm**

Create `src/utils/settlement.js`:

```js
export function computeSettlements(expenses) {
  const balance = {}

  for (const expense of expenses) {
    const { amount, paidBy, payerIncluded, splitAmong } = expense
    const people = payerIncluded
      ? [...new Set([paidBy, ...splitAmong])]
      : [...splitAmong]
    const share = Math.round(amount / people.length)

    balance[paidBy] = (balance[paidBy] || 0) + amount
    for (const person of people) {
      balance[person] = (balance[person] || 0) - share
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

- [ ] **Step 8: Run — expect PASS**

```bash
npx vitest run tests/utils/settlement.test.js
```
Expected: PASS (4 tests).

- [ ] **Step 9: Create trip ID utility**

Create `src/utils/tripId.js`:

```js
export function generateTripId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
```

- [ ] **Step 10: Create Firebase config**

Create `src/firebase.js`:

```js
import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
```

- [ ] **Step 11: Commit**

```bash
git add src/firebase.js src/utils/ tests/
git commit -m "feat: firebase config + currency/settlement/tripId utilities with tests"
```

---

## Task 3: Firebase hooks

**Files:**
- Create: `src/hooks/useTrip.js`, `src/hooks/useExpenses.js`, `src/hooks/useSettlements.js`, `src/hooks/useIdentity.js`

- [ ] **Step 1: Create useTrip hook**

Create `src/hooks/useTrip.js`:

```js
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

  async function createTrip(tripId, name, participants) {
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
    const current = snap.val()
    const participants = [...(current.participants || []), name]
    await update(ref(db, `trips/${tripId}`), { participants })
  }

  return { trip, loading, createTrip, addMember }
}
```

- [ ] **Step 2: Create useExpenses hook**

Create `src/hooks/useExpenses.js`:

```js
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
```

- [ ] **Step 3: Create useSettlements hook**

Create `src/hooks/useSettlements.js`:

```js
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
```

- [ ] **Step 4: Create useIdentity hook**

Create `src/hooks/useIdentity.js`:

```js
export function useIdentity(tripId) {
  const key = `tripsplit_identity_${tripId}`

  function getIdentity() {
    return localStorage.getItem(key) || null
  }

  function setIdentity(name) {
    localStorage.setItem(key, name)
  }

  return { identity: getIdentity(), setIdentity }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/
git commit -m "feat: firebase hooks — useTrip, useExpenses, useSettlements, useIdentity"
```

---

## Task 4: Shared components

**Files:**
- Create: `src/components/NameChip.jsx`, `src/components/CategoryPicker.jsx`, `src/components/AmountInput.jsx`
- Test: `tests/components/NameChip.test.jsx`, `tests/components/AmountInput.test.jsx`

- [ ] **Step 1: Write NameChip tests**

Create `tests/components/NameChip.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NameChip from '../../src/components/NameChip'

describe('NameChip', () => {
  it('renders the name', () => {
    render(<NameChip name="Nanda" selected={false} onToggle={() => {}} />)
    expect(screen.getByText('Nanda')).toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(<NameChip name="Nanda" selected={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByText('Nanda'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('shows checkmark when selected', () => {
    render(<NameChip name="Nanda" selected={true} onToggle={() => {}} />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/components/NameChip.test.jsx
```

- [ ] **Step 3: Implement NameChip**

Create `src/components/NameChip.jsx`:

```jsx
export default function NameChip({ name, selected, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
        selected
          ? 'bg-accent text-white'
          : 'bg-card text-gray-400 border border-deep'
      }`}
    >
      {selected && <span>✓</span>}
      {name}
    </button>
  )
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run tests/components/NameChip.test.jsx
```
Expected: PASS (3 tests).

- [ ] **Step 5: Write AmountInput tests**

Create `tests/components/AmountInput.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AmountInput from '../../src/components/AmountInput'

describe('AmountInput', () => {
  it('displays dot-formatted value', () => {
    render(<AmountInput value={1500000} onChange={() => {}} />)
    expect(screen.getByDisplayValue('1.500.000')).toBeInTheDocument()
  })

  it('calls onChange with parsed numeric value', () => {
    const onChange = vi.fn()
    render(<AmountInput value={0} onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '300000' } })
    expect(onChange).toHaveBeenCalledWith(300000)
  })
})
```

- [ ] **Step 6: Run — expect FAIL**

```bash
npx vitest run tests/components/AmountInput.test.jsx
```

- [ ] **Step 7: Implement AmountInput**

Create `src/components/AmountInput.jsx`:

```jsx
export default function AmountInput({ value, onChange }) {
  const displayValue = value === 0 ? '' : value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  function handleChange(e) {
    const raw = e.target.value.replace(/\./g, '').replace(/\D/g, '')
    onChange(parseInt(raw, 10) || 0)
  }

  return (
    <div className="flex items-center gap-2 bg-card border border-deep rounded-lg px-3 py-2.5 focus-within:border-accent">
      <span className="text-accent font-bold text-sm">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder="0"
        className="flex-1 bg-transparent text-white text-base font-bold outline-none"
      />
    </div>
  )
}
```

- [ ] **Step 8: Run — expect PASS**

```bash
npx vitest run tests/components/AmountInput.test.jsx
```
Expected: PASS (2 tests).

- [ ] **Step 9: Implement CategoryPicker**

Create `src/components/CategoryPicker.jsx`:

```jsx
import { useState } from 'react'

export const CATEGORIES = [
  { id: 'food', label: 'Food & Drinks', emoji: '🍜' },
  { id: 'transport', label: 'Transport', emoji: '🚗' },
  { id: 'accommodation', label: 'Accommodation', emoji: '🏨' },
  { id: 'shopping', label: 'Shopping', emoji: '🛒' },
  { id: 'other', label: 'Other', emoji: '📦' },
]

export default function CategoryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = CATEGORIES.find((c) => c.id === value) || CATEGORIES[0]
  const filtered = CATEGORIES.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase())
  )

  function select(cat) {
    onChange(cat.id)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 bg-card border border-deep rounded-lg px-3 py-2.5 text-left"
      >
        <span>{selected.emoji}</span>
        <span className="flex-1 text-white text-sm">{selected.label}</span>
        <span className="text-gray-500 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute z-10 w-full bg-deep border border-card rounded-lg mt-1 overflow-hidden">
          <div className="p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search..."
              className="w-full bg-card text-white text-sm px-3 py-2 rounded-lg outline-none"
              autoFocus
            />
          </div>
          {filtered.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => select(cat)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-card transition-colors ${
                cat.id === value ? 'bg-accent text-white' : 'text-gray-300'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 10: Commit**

```bash
git add src/components/ tests/components/
git commit -m "feat: shared components — NameChip, AmountInput, CategoryPicker"
```

---

## Task 5: App router + Home screen

**Files:**
- Modify: `src/main.jsx`, `src/App.jsx`
- Create: `src/pages/Home.jsx` and placeholder files for all other pages

- [ ] **Step 1: Set up router in main.jsx**

Replace `src/main.jsx`:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
```

- [ ] **Step 2: Set up routes in App.jsx**

Replace `src/App.jsx`:

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import IdentitySelection from './pages/IdentitySelection'
import ExpenseList from './pages/ExpenseList'
import TripSettings from './pages/TripSettings'
import AddEditExpense from './pages/AddEditExpense'
import Settlement from './pages/Settlement'

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
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
```

- [ ] **Step 3: Create placeholder pages**

Create each with minimal content to prevent import errors:

`src/pages/IdentitySelection.jsx`:
```jsx
export default function IdentitySelection() { return <div className="p-4 text-white">Identity</div> }
```

`src/pages/ExpenseList.jsx`:
```jsx
export default function ExpenseList() { return <div className="p-4 text-white">Expenses</div> }
```

`src/pages/TripSettings.jsx`:
```jsx
export default function TripSettings() { return <div className="p-4 text-white">Settings</div> }
```

`src/pages/AddEditExpense.jsx`:
```jsx
export default function AddEditExpense() { return <div className="p-4 text-white">Add/Edit</div> }
```

`src/pages/Settlement.jsx`:
```jsx
export default function Settlement() { return <div className="p-4 text-white">Settlement</div> }
```

- [ ] **Step 4: Implement Home screen**

Create `src/pages/Home.jsx`:

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'
import { generateTripId } from '../utils/tripId'

export default function Home() {
  const [tab, setTab] = useState('create')
  const [tripName, setTripName] = useState('')
  const [participantInput, setParticipantInput] = useState('')
  const [participants, setParticipants] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { createTrip } = useTrip(null)

  function addParticipant() {
    const name = participantInput.trim()
    if (!name || participants.includes(name)) return
    setParticipants([...participants, name])
    setParticipantInput('')
  }

  function removeParticipant(name) {
    setParticipants(participants.filter((p) => p !== name))
  }

  async function handleCreate() {
    if (!tripName.trim() || participants.length < 2) return
    setLoading(true)
    const tripId = generateTripId()
    await createTrip(tripId, tripName.trim(), participants)
    navigate(`/trip/${tripId}/identity`)
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    navigate(`/trip/${code}/identity`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-4xl mb-2">✈️</div>
      <h1 className="text-accent font-extrabold text-2xl mb-1">TripSplit</h1>
      <p className="text-gray-400 text-sm mb-8">Split trip expenses easily</p>

      <div className="w-full max-w-sm">
        <div className="flex bg-card rounded-xl p-1 mb-5">
          {['create', 'join'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === t ? 'bg-accent text-white' : 'text-gray-400'
              }`}
            >
              {t === 'create' ? 'Create Trip' : 'Join Trip'}
            </button>
          ))}
        </div>

        {tab === 'create' && (
          <div className="bg-card rounded-xl p-4 space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Trip Name</label>
              <input
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="e.g. Bali Trip 2026"
                className="w-full bg-deep text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 ring-accent"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Add Participants</label>
              <div className="flex gap-2">
                <input
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                  placeholder="Type a name, press Enter..."
                  className="flex-1 bg-deep text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 ring-accent"
                />
                <button
                  onClick={addParticipant}
                  className="bg-accent text-white px-4 py-2.5 rounded-lg text-sm font-semibold"
                >
                  Add
                </button>
              </div>
              {participants.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {participants.map((p) => (
                    <span key={p} className="bg-deep text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                      {p}
                      <button onClick={() => removeParticipant(p)} className="text-gray-400 ml-1">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleCreate}
              disabled={!tripName.trim() || participants.length < 2 || loading}
              className="w-full bg-accent text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40"
            >
              {loading ? 'Creating...' : 'Create Trip →'}
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="bg-card rounded-xl p-4 space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Trip Code</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC123"
                className="w-full bg-deep text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 ring-accent tracking-widest"
                maxLength={6}
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim()}
              className="w-full bg-accent text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40"
            >
              Join Trip →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```
Open `http://localhost:5173`. Check:
- Tab toggle switches between Create and Join
- Create tab: type trip name, add participant names, names appear as chips with × to remove
- Create button is disabled until name + at least 2 participants are entered
- Join tab: type code, Join button disabled when empty

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/main.jsx src/pages/
git commit -m "feat: app router + home screen"
```

---

## Task 6: Identity Selection screen

**Files:**
- Modify: `src/pages/IdentitySelection.jsx`

- [ ] **Step 1: Implement IdentitySelection**

Replace `src/pages/IdentitySelection.jsx`:

```jsx
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'
import { useIdentity } from '../hooks/useIdentity'

export default function IdentitySelection() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip, loading } = useTrip(tripId)
  const { identity, setIdentity } = useIdentity(tripId)

  useEffect(() => {
    if (identity) navigate(`/trip/${tripId}`, { replace: true })
  }, [identity, tripId, navigate])

  function pick(name) {
    setIdentity(name)
    navigate(`/trip/${tripId}`, { replace: true })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  if (!trip) return <div className="min-h-screen flex items-center justify-center text-gray-400">Trip not found. Check the code and try again.</div>

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-4xl mb-2">👋</div>
      <h2 className="text-white font-bold text-xl mb-1">Who are you?</h2>
      <p className="text-gray-400 text-sm mb-1">Joining: <span className="text-accent font-semibold">{trip.name}</span></p>
      <p className="text-gray-500 text-xs mb-8">Pick your name — we'll remember it on this device</p>

      <div className="flex flex-wrap gap-3 justify-center max-w-sm">
        {(trip.participants || []).map((name) => (
          <button
            key={name}
            onClick={() => pick(name)}
            className="bg-card border border-deep text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-accent hover:border-accent transition-colors"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Create a trip → lands on Identity Selection. Check:
- Shows trip name
- All participant names appear as buttons
- Tapping a name redirects to `/trip/{id}` (placeholder page for now)
- Refreshing the page skips this screen (localStorage persists)

- [ ] **Step 3: Commit**

```bash
git add src/pages/IdentitySelection.jsx
git commit -m "feat: identity selection screen"
```

---

## Task 7: Expense List screen + ExpenseRow component

**Files:**
- Create: `src/components/ExpenseRow.jsx`
- Modify: `src/pages/ExpenseList.jsx`

- [ ] **Step 1: Implement ExpenseRow**

Create `src/components/ExpenseRow.jsx`:

```jsx
import { useNavigate, useParams } from 'react-router-dom'
import { formatRupiah } from '../utils/currency'
import { CATEGORIES } from './CategoryPicker'

export default function ExpenseRow({ expense }) {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const cat = CATEGORIES.find((c) => c.id === expense.category) || CATEGORIES[4]
  const date = new Date(expense.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
  const peopleCount = expense.splitAmong.length + (expense.payerIncluded ? 1 : 0)

  return (
    <div className="bg-card rounded-xl px-3 py-2.5 flex items-center gap-3">
      <span className="text-xl">{cat.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-white text-xs font-semibold">{cat.label}</div>
        <div className="text-gray-400 text-xs truncate">
          {expense.paidBy} · {peopleCount} people · {date}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-accent font-bold text-xs">{formatRupiah(expense.amount)}</span>
        <button
          onClick={() => navigate(`/trip/${tripId}/edit/${expense.id}`)}
          className="bg-deep text-gray-400 text-xs px-2 py-1 rounded"
        >
          ✏️
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement ExpenseList screen**

Replace `src/pages/ExpenseList.jsx`:

```jsx
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'
import { useExpenses } from '../hooks/useExpenses'
import { useSettlements } from '../hooks/useSettlements'
import { useIdentity } from '../hooks/useIdentity'
import { formatRupiah } from '../utils/currency'
import ExpenseRow from '../components/ExpenseRow'

export default function ExpenseList() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip, loading: tripLoading } = useTrip(tripId)
  const { expenses, loading: expLoading } = useExpenses(tripId)
  const { settlements } = useSettlements(tripId)
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
    const people = e.payerIncluded
      ? [...new Set([e.paidBy, ...e.splitAmong])]
      : e.splitAmong
    if (people.includes(identity)) {
      myBalance -= Math.round(e.amount / people.length)
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
        {expenses.map((e) => <ExpenseRow key={e.id} expense={e} />)}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate(`/trip/${tripId}/add`)}
          className="flex-1 bg-accent text-white py-3 rounded-xl font-bold text-sm"
        >
          + Add Expense
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

- [ ] **Step 3: Verify in browser**

Create trip → pick identity → Expense List:
- Shows trip name, member count, trip code
- Summary bar: Rp 0 / Rp 0
- "No expenses yet" message
- Two bottom buttons navigate correctly

- [ ] **Step 4: Commit**

```bash
git add src/components/ExpenseRow.jsx src/pages/ExpenseList.jsx
git commit -m "feat: expense list screen + ExpenseRow component"
```

---

## Task 8: Add / Edit Expense screen

**Files:**
- Modify: `src/pages/AddEditExpense.jsx`

- [ ] **Step 1: Implement AddEditExpense**

Replace `src/pages/AddEditExpense.jsx`:

```jsx
import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (!isEdit && identity) setPaidBy(identity)
  }, [identity, isEdit])

  useEffect(() => {
    if (isEdit && expenses.length > 0) {
      const e = expenses.find((x) => x.id === expenseId)
      if (e) {
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
    if (!amount || !paidBy || splitAmong.length === 0) return
    setSaving(true)
    const data = { category, amount, paidBy, payerIncluded, splitAmong }
    if (isEdit) {
      await updateExpense(expenseId, data)
    } else {
      await addExpense(data)
    }
    navigate(`/trip/${tripId}`)
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
        disabled={!amount || !paidBy || splitAmong.length === 0 || saving}
        className="mt-6 w-full bg-accent text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-40"
      >
        {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Expense'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Tap "+ Add Expense". Check:
- Category dropdown opens, search filters the list
- Amount field auto-formats with dots as you type
- Paid by chips — one selectable at a time
- Toggle switch animates on/off
- Split among chips toggle; "Select all" selects all except payer
- Per-person amount updates live
- "+ New" chip opens inline input; new member appears globally in trip
- Save button disabled until amount + paidBy + at least 1 split person

After saving → returns to Expense List, expense appears in the list.

Edit: tap ✏️ on an existing expense → form pre-fills, "Save Changes" button shown.

- [ ] **Step 3: Commit**

```bash
git add src/pages/AddEditExpense.jsx
git commit -m "feat: add/edit expense screen"
```

---

## Task 9: Trip Settings screen

**Files:**
- Modify: `src/pages/TripSettings.jsx`

- [ ] **Step 1: Implement TripSettings**

Replace `src/pages/TripSettings.jsx`:

```jsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'

export default function TripSettings() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip, addMember } = useTrip(tripId)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    const name = newName.trim()
    if (!name || (trip?.participants || []).includes(name)) return
    setAdding(true)
    await addMember(name)
    setNewName('')
    setAdding(false)
  }

  if (!trip) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl">←</button>
        <h1 className="text-white font-bold text-base">Trip Settings</h1>
      </div>

      <div className="bg-card rounded-xl p-4 mb-4">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">
          Members ({(trip.participants || []).length})
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {(trip.participants || []).map((name) => (
            <span key={name} className="bg-deep text-white text-xs px-3 py-1.5 rounded-full">{name}</span>
          ))}
        </div>
        <div className="border-t border-deep pt-4">
          <div className="text-xs text-gray-400 mb-2">Add new member</div>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Type name..."
              className="flex-1 bg-deep text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 ring-accent"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="bg-accent text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-4">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Trip Code</div>
        <div className="text-accent font-mono font-bold text-2xl tracking-widest">{tripId}</div>
        <div className="text-gray-500 text-xs mt-1">Share this code so friends can join</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Tap ⚙️. Check:
- All members listed as pills
- Add new member → appears instantly (real-time sync)
- Trip code shown prominently

- [ ] **Step 3: Commit**

```bash
git add src/pages/TripSettings.jsx
git commit -m "feat: trip settings screen"
```

---

## Task 10: Settlement screen + SettlementRow component

**Files:**
- Create: `src/components/SettlementRow.jsx`
- Modify: `src/pages/Settlement.jsx`

- [ ] **Step 1: Implement SettlementRow**

Create `src/components/SettlementRow.jsx`:

```jsx
import { formatRupiah } from '../utils/currency'

export default function SettlementRow({ settlement, onMarkPaid }) {
  function copyAmount() {
    navigator.clipboard.writeText(formatRupiah(settlement.amount))
  }

  return (
    <div className={`bg-card rounded-xl px-3 py-3 ${settlement.paid ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-sm font-semibold ${settlement.paid ? 'line-through text-gray-400' : 'text-white'}`}>
            {settlement.from} <span className="text-gray-500 font-normal">→</span> {settlement.to}
          </div>
          <div className={`text-base font-bold mt-0.5 ${settlement.paid ? 'line-through text-gray-500' : 'text-accent'}`}>
            {formatRupiah(settlement.amount)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!settlement.paid && (
            <button
              onClick={copyAmount}
              className="bg-deep text-gray-300 text-xs px-2.5 py-1.5 rounded-lg"
              title="Copy amount to clipboard"
            >
              📋
            </button>
          )}
          {settlement.paid ? (
            <span className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg">✓ Paid</span>
          ) : (
            <button
              onClick={() => onMarkPaid(settlement.id)}
              className="bg-deep border border-gray-600 text-gray-300 text-xs px-3 py-1.5 rounded-lg"
            >
              Mark Paid
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement Settlement screen**

Replace `src/pages/Settlement.jsx`:

```jsx
import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'
import { useExpenses } from '../hooks/useExpenses'
import { useSettlements } from '../hooks/useSettlements'
import { formatRupiah } from '../utils/currency'
import SettlementRow from '../components/SettlementRow'

export default function Settlement() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip } = useTrip(tripId)
  const { expenses } = useExpenses(tripId)
  const { settlements, markPaid } = useSettlements(tripId)

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
  const unpaid = settlements.filter((s) => !s.paid)
  const paid = settlements.filter((s) => s.paid)

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl">←</button>
        <h1 className="text-white font-bold text-base">Settlement</h1>
        <span className="ml-auto bg-card text-gray-400 text-xs px-3 py-1 rounded-lg">{trip?.name}</span>
      </div>

      <div className="bg-card rounded-xl p-3 mb-5 flex justify-between">
        <div>
          <div className="text-gray-400 text-xs uppercase tracking-wide">Total Spent</div>
          <div className="text-white font-extrabold text-base">{formatRupiah(totalSpent)}</div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-xs uppercase tracking-wide">Transactions needed</div>
          <div className="text-green-400 font-bold text-base">
            {unpaid.length} payment{unpaid.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {unpaid.length > 0 && (
        <div className="mb-5">
          <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Outstanding</div>
          <div className="space-y-2">
            {unpaid.map((s) => (
              <SettlementRow key={s.id} settlement={s} onMarkPaid={markPaid} />
            ))}
          </div>
        </div>
      )}

      {paid.length > 0 && (
        <div>
          <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Settled ✓</div>
          <div className="space-y-2">
            {paid.map((s) => (
              <SettlementRow key={s.id} settlement={s} onMarkPaid={markPaid} />
            ))}
          </div>
        </div>
      )}

      {settlements.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-12">No expenses yet — everyone's even!</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Add several expenses with different payers → go to Settlement. Check:
- Outstanding section shows minimized debt list
- "Mark Paid" moves a row to Settled section instantly (visible to all devices)
- 📋 copies amount to clipboard
- Adding a new expense → settlement recalculates automatically

- [ ] **Step 4: Commit**

```bash
git add src/components/SettlementRow.jsx src/pages/Settlement.jsx
git commit -m "feat: settlement screen + SettlementRow with mark paid + copy amount"
```

---

## Task 11: Firebase Hosting deployment

**Files:**
- Create: `firebase.json`, `.firebaserc`

- [ ] **Step 1: Install Firebase CLI**

```bash
npm install -g firebase-tools
firebase login
```

- [ ] **Step 2: Initialize Firebase Hosting**

```bash
firebase init hosting
```
When prompted:
- Select your existing Firebase project
- Public directory: `dist`
- Configure as single-page app: **Yes**
- Overwrite `dist/index.html`: **No**

This generates `firebase.json` and `.firebaserc`.

- [ ] **Step 3: Build and deploy**

```bash
npm run build
firebase deploy --only hosting
```
Expected: URL printed, e.g. `https://your-project.web.app`

- [ ] **Step 4: Test on mobile**

Open the URL on your phone. Verify:
- App loads correctly
- Create a trip, share the trip code with another device
- Both devices see the same expenses in real-time

- [ ] **Step 5: Commit**

```bash
git add firebase.json .firebaserc
git commit -m "feat: firebase hosting deployment config"
```

---

## Summary

| Task | Deliverable |
|---|---|
| 1 | Vite + React + Firebase + Tailwind + Vitest scaffold |
| 2 | Currency formatting + settlement algorithm (TDD) + Firebase config |
| 3 | Firebase hooks — useTrip, useExpenses, useSettlements, useIdentity |
| 4 | NameChip, AmountInput, CategoryPicker components (TDD for first two) |
| 5 | App router + Home screen (Create/Join tabs) |
| 6 | Identity Selection screen |
| 7 | Expense List screen + ExpenseRow component |
| 8 | Add/Edit Expense form |
| 9 | Trip Settings — manage members |
| 10 | Settlement screen + SettlementRow (mark paid + copy amount) |
| 11 | Firebase Hosting deployment |
