# Payment Info & WhatsApp Reminder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow trip participants to store payment details (e-wallet, bank account) in Trip Settings and show them inline on the Settlement screen with copy buttons and a one-tap WhatsApp reminder button.

**Architecture:** A new `usePaymentInfo` hook reads/writes `trips/{tripId}/paymentInfo/{name}` in Firebase. TripSettings gets a new accordion section to enter payment info per participant. SettlementRow gains expand/collapse behavior, inline payment display, and a WhatsApp remind button built from a pure utility `whatsapp.js`.

**Tech Stack:** React, Firebase Realtime Database, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/hooks/usePaymentInfo.js` | Create | Firebase reads/writes for paymentInfo node |
| `src/utils/whatsapp.js` | Create | Phone formatting, message building, WA URL construction |
| `tests/utils/whatsapp.test.js` | Create | Unit tests for whatsapp utilities |
| `src/components/SettlementRow.jsx` | Modify | Expand/collapse, inline payment info, copy + remind |
| `src/pages/Settlement.jsx` | Modify | Wire usePaymentInfo, pass paymentInfo + tripName to each row |
| `src/pages/TripSettings.jsx` | Modify | Payment Info accordion section below Members |

---

### Task 1: usePaymentInfo hook

**Files:**
- Create: `src/hooks/usePaymentInfo.js`

- [ ] **Step 1: Create the hook**

Create `src/hooks/usePaymentInfo.js`:

```js
import { ref, onValue, set } from 'firebase/database'
import { useState, useEffect } from 'react'
import { db } from '../firebase'

export function usePaymentInfo(tripId) {
  const [paymentInfo, setPaymentInfo] = useState({})

  useEffect(() => {
    if (!tripId) return
    const piRef = ref(db, `trips/${tripId}/paymentInfo`)
    return onValue(piRef, (snap) => {
      setPaymentInfo(snap.val() || {})
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

  return { paymentInfo, updatePaymentInfo }
}
```

- [ ] **Step 2: Run existing tests — none should break**

```bash
npx vitest run
```

Expected: all existing tests pass (no new tests for this Firebase hook — follows same pattern as useTrip, useExpenses)

- [ ] **Step 3: Commit**

```bash
rtk git add src/hooks/usePaymentInfo.js
rtk git commit -m "feat: usePaymentInfo hook for reading and writing payment info"
```

---

### Task 2: WhatsApp utility + tests

**Files:**
- Create: `src/utils/whatsapp.js`
- Create: `tests/utils/whatsapp.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/utils/whatsapp.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { formatPhone, buildPaymentLine, buildReminderMessage, buildWhatsAppUrl } from '../../src/utils/whatsapp'

describe('formatPhone', () => {
  it('strips leading 0 and prepends 62', () => {
    expect(formatPhone('081234567890')).toBe('6281234567890')
  })

  it('leaves 62-prefixed numbers unchanged', () => {
    expect(formatPhone('6281234567890')).toBe('6281234567890')
  })

  it('returns empty string for empty input', () => {
    expect(formatPhone('')).toBe('')
  })

  it('strips non-digit characters', () => {
    expect(formatPhone('0812-3456-7890')).toBe('6281234567890')
  })
})

describe('buildPaymentLine', () => {
  it('includes ewallets and bank when both present', () => {
    const result = buildPaymentLine({
      phone: '081234567890',
      ewallets: ['gopay', 'ovo'],
      bankName: 'BCA',
      bankAccount: '1234567890',
      creditor: 'Nanda',
    })
    expect(result).toBe('GoPay / OVO: 081234567890 / BCA: 1234567890 a/n Nanda')
  })

  it('includes only ewallets when no bank', () => {
    const result = buildPaymentLine({
      phone: '081234567890',
      ewallets: ['gopay'],
      bankName: '',
      bankAccount: '',
      creditor: 'Nanda',
    })
    expect(result).toBe('GoPay: 081234567890')
  })

  it('includes only bank when no ewallets', () => {
    const result = buildPaymentLine({
      phone: '',
      ewallets: [],
      bankName: 'Mandiri',
      bankAccount: '9876543210',
      creditor: 'Mega',
    })
    expect(result).toBe('Mandiri: 9876543210 a/n Mega')
  })

  it('returns empty string when no payment info', () => {
    const result = buildPaymentLine({
      phone: '',
      ewallets: [],
      bankName: '',
      bankAccount: '',
      creditor: 'Nanda',
    })
    expect(result).toBe('')
  })

  it('supports dana and shopeepay labels', () => {
    const result = buildPaymentLine({
      phone: '081234567890',
      ewallets: ['dana', 'shopeepay'],
      bankName: '',
      bankAccount: '',
      creditor: 'Nanda',
    })
    expect(result).toBe('Dana / ShopeePay: 081234567890')
  })
})

describe('buildReminderMessage', () => {
  it('includes all parts when payment info is present', () => {
    const msg = buildReminderMessage({
      debtor: 'Mega',
      tripName: 'Bali Trip',
      amountFormatted: 'Rp 50.000',
      creditor: 'Nanda',
      phone: '081234567890',
      ewallets: ['gopay'],
      bankName: 'BCA',
      bankAccount: '1234567890',
    })
    expect(msg).toBe(
      'Hey Mega, reminder for trip Bali Trip — you owe Rp 50.000 to Nanda. GoPay: 081234567890 / BCA: 1234567890 a/n Nanda. Thanks! 🙏'
    )
  })

  it('omits payment line when no info set', () => {
    const msg = buildReminderMessage({
      debtor: 'Mega',
      tripName: 'Bali Trip',
      amountFormatted: 'Rp 50.000',
      creditor: 'Nanda',
      phone: '',
      ewallets: [],
      bankName: '',
      bankAccount: '',
    })
    expect(msg).toBe(
      'Hey Mega, reminder for trip Bali Trip — you owe Rp 50.000 to Nanda. Thanks! 🙏'
    )
  })
})

describe('buildWhatsAppUrl', () => {
  it('formats URL with formatted phone and encoded message', () => {
    const url = buildWhatsAppUrl({ phone: '081234567890', message: 'Hello Mega' })
    expect(url).toBe('https://wa.me/6281234567890?text=Hello%20Mega')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/utils/whatsapp.test.js
```

Expected: all 10 tests FAIL with "Cannot find module"

- [ ] **Step 3: Create the utility**

Create `src/utils/whatsapp.js`:

```js
const EWALLET_LABELS = {
  gopay: 'GoPay',
  ovo: 'OVO',
  dana: 'Dana',
  shopeepay: 'ShopeePay',
}

export function formatPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('62')) return digits
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  return '62' + digits
}

export function buildPaymentLine({ phone, ewallets, bankName, bankAccount, creditor }) {
  const parts = []
  if (ewallets && ewallets.length > 0 && phone) {
    const labels = ewallets.map((e) => EWALLET_LABELS[e] || e).join(' / ')
    parts.push(`${labels}: ${phone}`)
  }
  if (bankName && bankAccount) {
    parts.push(`${bankName}: ${bankAccount} a/n ${creditor}`)
  }
  return parts.join(' / ')
}

export function buildReminderMessage({ debtor, tripName, amountFormatted, creditor, phone, ewallets, bankName, bankAccount }) {
  const paymentLine = buildPaymentLine({ phone, ewallets, bankName, bankAccount, creditor })
  let msg = `Hey ${debtor}, reminder for trip ${tripName} — you owe ${amountFormatted} to ${creditor}.`
  if (paymentLine) msg += ` ${paymentLine}.`
  msg += ` Thanks! 🙏`
  return msg
}

export function buildWhatsAppUrl({ phone, message }) {
  const formatted = formatPhone(phone)
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`
}
```

- [ ] **Step 4: Run tests — all 10 should pass**

```bash
npx vitest run tests/utils/whatsapp.test.js
```

Expected: 10 PASS

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
rtk git add src/utils/whatsapp.js tests/utils/whatsapp.test.js
rtk git commit -m "feat: WhatsApp utility — phone format, message builder, URL builder"
```

---

### Task 3: Update SettlementRow with expand/collapse and payment actions

**Files:**
- Modify: `src/components/SettlementRow.jsx`

Current props: `{ settlement, onMarkPaid }`
New props: `{ settlement, onMarkPaid, paymentInfo, tripName }`

Where `paymentInfo` is the creditor's info: `{ phone, ewallets, bankName, bankAccount }` or `undefined`.

- [ ] **Step 1: Replace full content of SettlementRow.jsx**

```jsx
import { useState } from 'react'
import { formatRupiah } from '../utils/currency'
import { buildReminderMessage, buildWhatsAppUrl } from '../utils/whatsapp'

export default function SettlementRow({ settlement, onMarkPaid, paymentInfo, tripName }) {
  const [expanded, setExpanded] = useState(false)

  const hasPhone = !!paymentInfo?.phone
  const hasBank = !!(paymentInfo?.bankName && paymentInfo?.bankAccount)
  const hasEwallets = !!(paymentInfo?.ewallets && paymentInfo.ewallets.length > 0)
  const hasAnyInfo = hasPhone || hasBank

  function copyText(text) {
    navigator.clipboard.writeText(text)
  }

  function handleRemind() {
    const message = buildReminderMessage({
      debtor: settlement.from,
      tripName: tripName || '',
      amountFormatted: formatRupiah(settlement.amount),
      creditor: settlement.to,
      phone: paymentInfo?.phone || '',
      ewallets: paymentInfo?.ewallets || [],
      bankName: paymentInfo?.bankName || '',
      bankAccount: paymentInfo?.bankAccount || '',
    })
    const url = buildWhatsAppUrl({ phone: paymentInfo.phone, message })
    window.open(url, '_blank')
  }

  const ewalletLabel = hasEwallets
    ? paymentInfo.ewallets
        .map((e) => ({ gopay: 'GoPay', ovo: 'OVO', dana: 'Dana', shopeepay: 'ShopeePay' }[e] || e))
        .join(' / ')
    : null

  return (
    <div className={`bg-card rounded-xl px-3 py-3 ${settlement.paid ? 'opacity-50' : ''}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-sm font-semibold ${settlement.paid ? 'line-through text-gray-400' : 'text-white'}`}>
              {settlement.from} <span className="text-gray-500 font-normal">→</span> {settlement.to}
            </div>
            <div className={`text-base font-bold mt-0.5 ${settlement.paid ? 'line-through text-gray-500' : 'text-accent'}`}>
              {formatRupiah(settlement.amount)}
            </div>
          </div>
          <span className="text-gray-500 text-xs ml-3">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && !settlement.paid && (
        <div className="mt-3">
          {hasAnyInfo ? (
            <div className="bg-deep rounded-lg p-3 mb-3 space-y-2">
              {hasPhone && hasEwallets && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{ewalletLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium">{paymentInfo.phone}</span>
                    <button
                      onClick={() => copyText(paymentInfo.phone)}
                      className="bg-card text-accent text-xs px-2 py-1 rounded"
                    >
                      📋
                    </button>
                  </div>
                </div>
              )}
              {hasBank && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{paymentInfo.bankName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium">
                      {paymentInfo.bankAccount} a/n {settlement.to}
                    </span>
                    <button
                      onClick={() => copyText(paymentInfo.bankAccount)}
                      className="bg-card text-accent text-xs px-2 py-1 rounded"
                    >
                      📋
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-xs mb-3">
              No payment info set for {settlement.to} — add it in Trip Settings
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => onMarkPaid(settlement.id)}
              className="bg-deep border border-gray-600 text-gray-300 text-xs px-3 py-2 rounded-lg"
            >
              Mark Paid
            </button>
            {hasPhone && (
              <button
                onClick={handleRemind}
                className="flex-1 bg-green-600 text-white text-xs py-2 rounded-lg font-semibold"
              >
                📲 Remind via WA
              </button>
            )}
          </div>
        </div>
      )}

      {expanded && settlement.paid && (
        <div className="mt-2">
          <span className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg">✓ Paid</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/SettlementRow.jsx
rtk git commit -m "feat: SettlementRow expand/collapse with inline payment info and WA remind"
```

---

### Task 4: Wire usePaymentInfo into Settlement page

**Files:**
- Modify: `src/pages/Settlement.jsx`

- [ ] **Step 1: Replace full content of Settlement.jsx**

```jsx
import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'
import { useExpenses } from '../hooks/useExpenses'
import { useSettlements } from '../hooks/useSettlements'
import { usePaymentInfo } from '../hooks/usePaymentInfo'
import { formatRupiah } from '../utils/currency'
import SettlementRow from '../components/SettlementRow'

export default function Settlement() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip } = useTrip(tripId)
  const { expenses } = useExpenses(tripId)
  const { settlements, markPaid } = useSettlements(tripId)
  const { paymentInfo } = usePaymentInfo(tripId)

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
              <SettlementRow
                key={s.id}
                settlement={s}
                onMarkPaid={markPaid}
                paymentInfo={paymentInfo[s.to]}
                tripName={trip?.name || ''}
              />
            ))}
          </div>
        </div>
      )}

      {paid.length > 0 && (
        <div>
          <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Settled ✓</div>
          <div className="space-y-2">
            {paid.map((s) => (
              <SettlementRow
                key={s.id}
                settlement={s}
                onMarkPaid={markPaid}
                paymentInfo={paymentInfo[s.to]}
                tripName={trip?.name || ''}
              />
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

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
rtk git add src/pages/Settlement.jsx
rtk git commit -m "feat: wire usePaymentInfo into Settlement — pass payment info to each row"
```

---

### Task 5: Payment Info section in TripSettings

**Files:**
- Modify: `src/pages/TripSettings.jsx`

- [ ] **Step 1: Replace full content of TripSettings.jsx**

```jsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'
import { usePaymentInfo } from '../hooks/usePaymentInfo'

const EWALLETS = [
  { key: 'gopay', label: 'GoPay' },
  { key: 'ovo', label: 'OVO' },
  { key: 'dana', label: 'Dana' },
  { key: 'shopeepay', label: 'ShopeePay' },
]

const EMPTY_FORM = { phone: '', ewallets: [], bankName: '', bankAccount: '' }

export default function TripSettings() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip, addMember } = useTrip(tripId)
  const { paymentInfo, updatePaymentInfo } = usePaymentInfo(tripId)

  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [expandedName, setExpandedName] = useState(null)
  const [formValues, setFormValues] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    const name = newName.trim()
    if (!name || (trip?.participants || []).includes(name)) return
    setAdding(true)
    try {
      await addMember(name)
      setNewName('')
    } finally {
      setAdding(false)
    }
  }

  function handleExpand(name) {
    if (expandedName === name) {
      setExpandedName(null)
      return
    }
    setExpandedName(name)
    const info = paymentInfo[name] || {}
    setFormValues({
      phone: info.phone || '',
      ewallets: info.ewallets || [],
      bankName: info.bankName || '',
      bankAccount: info.bankAccount || '',
    })
  }

  function toggleEwallet(key) {
    setFormValues((prev) => ({
      ...prev,
      ewallets: prev.ewallets.includes(key)
        ? prev.ewallets.filter((e) => e !== key)
        : [...prev.ewallets, key],
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updatePaymentInfo(expandedName, formValues)
      setExpandedName(null)
    } finally {
      setSaving(false)
    }
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

      <div className="bg-card rounded-xl p-4 mb-4">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">Payment Info</div>
        <div className="space-y-2">
          {(trip.participants || []).map((name) => (
            <div key={name}>
              <button
                onClick={() => handleExpand(name)}
                className="w-full flex items-center justify-between bg-deep rounded-xl px-3 py-2.5"
              >
                <span className="text-white text-sm">{name}</span>
                <span className="text-gray-400 text-xs">
                  {expandedName === name ? '▲ collapse' : paymentInfo[name] ? '▼ edit' : '▼ set info'}
                </span>
              </button>

              {expandedName === name && (
                <div className="bg-deep rounded-xl px-3 pt-0 pb-3 mt-0.5 space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Phone (for transfers)</label>
                    <input
                      value={formValues.phone}
                      onChange={(e) => setFormValues((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="08xxxxxxxxxx"
                      className="w-full bg-card text-white text-sm px-3 py-2 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-2">E-wallets on this number</label>
                    <div className="flex flex-wrap gap-2">
                      {EWALLETS.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => toggleEwallet(key)}
                          className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                            formValues.ewallets.includes(key)
                              ? 'bg-accent text-white'
                              : 'bg-card border border-deep text-gray-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 block mb-1">Bank</label>
                      <input
                        value={formValues.bankName}
                        onChange={(e) => setFormValues((p) => ({ ...p, bankName: e.target.value }))}
                        placeholder="BCA"
                        className="w-full bg-card text-white text-sm px-3 py-2 rounded-lg outline-none"
                      />
                    </div>
                    <div className="flex-2">
                      <label className="text-xs text-gray-400 block mb-1">Account number</label>
                      <input
                        value={formValues.bankAccount}
                        onChange={(e) => setFormValues((p) => ({ ...p, bankAccount: e.target.value }))}
                        placeholder="1234567890"
                        className="w-full bg-card text-white text-sm px-3 py-2 rounded-lg outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-accent text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          ))}
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

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build succeeds with no errors

- [ ] **Step 4: Commit and deploy**

```bash
rtk git add src/pages/TripSettings.jsx
rtk git commit -m "feat: Payment Info accordion in TripSettings — phone, e-wallets, bank"
rtk git push
firebase deploy --only hosting
```
