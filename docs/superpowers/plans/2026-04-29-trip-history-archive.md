# Trip History & Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a trip history home screen with Active/Archived tabs, auto-tracking of visited trips in localStorage, and swipe-left actions to archive or remove trips.

**Architecture:** Trip visit history lives in localStorage (`splittrip_trips`) — a JSON array updated on every trip visit in ExpenseList. Archive state lives in Firebase (`trips/{tripId}/archived`) so it syncs across all members. Home.jsx is rewritten as a trip list with tabs; Create/Join UI moves into a bottom sheet. Each TripCard reads its own `archived` state from Firebase and filters itself based on the active tab.

**Tech Stack:** React, Firebase Realtime Database, localStorage, Tailwind CSS

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useLocalTrips.js` | Create | Read/write `splittrip_trips` JSON array in localStorage |
| `src/hooks/useTripArchive.js` | Create | Read/write `trips/{tripId}/archived` in Firebase |
| `src/components/TripCard.jsx` | Create | Trip card with swipe-left Archive/Restore/Remove actions; self-filters by tab |
| `src/pages/Home.jsx` | Rewrite | Trip list with Active/Archived tabs + Create/Join bottom sheet |
| `src/pages/ExpenseList.jsx` | Modify | Call `upsertTrip` when trip loads to auto-track visits |
| `tests/hooks/useLocalTrips.test.js` | Create | Unit tests for useLocalTrips |

---

### Task 1: useLocalTrips hook

**Files:**
- Create: `src/hooks/useLocalTrips.js`
- Test: `tests/hooks/useLocalTrips.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/hooks/useLocalTrips.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalTrips } from '../../src/hooks/useLocalTrips'

const KEY = 'splittrip_trips'

beforeEach(() => {
  localStorage.clear()
})

describe('useLocalTrips', () => {
  it('returns empty array when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalTrips())
    expect(result.current.trips).toEqual([])
  })

  it('upsertTrip adds a new entry with tripId, name, lastVisited', () => {
    const { result } = renderHook(() => useLocalTrips())
    act(() => result.current.upsertTrip('ABC123', 'Bali Trip'))
    expect(result.current.trips).toHaveLength(1)
    expect(result.current.trips[0].tripId).toBe('ABC123')
    expect(result.current.trips[0].name).toBe('Bali Trip')
    expect(typeof result.current.trips[0].lastVisited).toBe('number')
  })

  it('upsertTrip updates existing entry and moves it to front', () => {
    const { result } = renderHook(() => useLocalTrips())
    act(() => result.current.upsertTrip('ABC123', 'Bali Trip'))
    act(() => result.current.upsertTrip('XYZ456', 'Lombok'))
    act(() => result.current.upsertTrip('ABC123', 'Bali Trip Updated'))
    expect(result.current.trips[0].tripId).toBe('ABC123')
    expect(result.current.trips[0].name).toBe('Bali Trip Updated')
    expect(result.current.trips).toHaveLength(2)
  })

  it('removeTrip removes the entry', () => {
    const { result } = renderHook(() => useLocalTrips())
    act(() => result.current.upsertTrip('ABC123', 'Bali Trip'))
    act(() => result.current.upsertTrip('XYZ456', 'Lombok'))
    act(() => result.current.removeTrip('ABC123'))
    expect(result.current.trips).toHaveLength(1)
    expect(result.current.trips[0].tripId).toBe('XYZ456')
  })

  it('reads existing data from localStorage on mount', () => {
    localStorage.setItem(KEY, JSON.stringify([
      { tripId: 'ABC123', name: 'Bali', lastVisited: 1000 },
    ]))
    const { result } = renderHook(() => useLocalTrips())
    expect(result.current.trips).toHaveLength(1)
    expect(result.current.trips[0].tripId).toBe('ABC123')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
rtk vitest run tests/hooks/useLocalTrips.test.js
```

Expected: FAIL — `useLocalTrips` not found

- [ ] **Step 3: Implement useLocalTrips**

Create `src/hooks/useLocalTrips.js`:

```js
import { useState } from 'react'

const KEY = 'splittrip_trips'

function readFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function useLocalTrips() {
  const [trips, setTrips] = useState(readFromStorage)

  function upsertTrip(tripId, name) {
    const existing = readFromStorage().filter((t) => t.tripId !== tripId)
    const updated = [{ tripId, name, lastVisited: Date.now() }, ...existing]
    localStorage.setItem(KEY, JSON.stringify(updated))
    setTrips(updated)
  }

  function removeTrip(tripId) {
    const updated = readFromStorage().filter((t) => t.tripId !== tripId)
    localStorage.setItem(KEY, JSON.stringify(updated))
    setTrips(updated)
  }

  return { trips, upsertTrip, removeTrip }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
rtk vitest run tests/hooks/useLocalTrips.test.js
```

Expected: PASS (5)

- [ ] **Step 5: Run full test suite**

```bash
rtk vitest run
```

Expected: PASS (40) FAIL (0)

- [ ] **Step 6: Commit**

```bash
rtk git add src/hooks/useLocalTrips.js tests/hooks/useLocalTrips.test.js
rtk git commit -m "feat: add useLocalTrips hook for localStorage trip history"
```

---

### Task 2: useTripArchive hook

**Files:**
- Create: `src/hooks/useTripArchive.js`

No unit tests — follows the identical Firebase `onValue` pattern already used by `usePaymentInfo`, `useTrip`, and `useSettlements`.

- [ ] **Step 1: Create useTripArchive**

Create `src/hooks/useTripArchive.js`:

```js
import { ref, onValue, update } from 'firebase/database'
import { useState, useEffect } from 'react'
import { db } from '../firebase'

export function useTripArchive(tripId) {
  const [archived, setArchivedState] = useState(false)

  useEffect(() => {
    if (!tripId) return
    const archivedRef = ref(db, `trips/${tripId}/archived`)
    return onValue(archivedRef, (snap) => {
      setArchivedState(snap.val() === true)
    })
  }, [tripId])

  async function setArchived(bool) {
    await update(ref(db, `trips/${tripId}`), { archived: bool ? true : null })
  }

  return { archived, setArchived }
}
```

`setArchived(false)` writes `null`, which removes the key from Firebase — keeping absent = active as the spec requires.

- [ ] **Step 2: Run full test suite**

```bash
rtk vitest run
```

Expected: PASS (40) FAIL (0)

- [ ] **Step 3: Commit**

```bash
rtk git add src/hooks/useTripArchive.js
rtk git commit -m "feat: add useTripArchive hook for shared archive state"
```

---

### Task 3: Auto-track trip visits in ExpenseList.jsx

**Files:**
- Modify: `src/pages/ExpenseList.jsx`

The current file is 118 lines. Add 2 lines of imports and a `useEffect`.

- [ ] **Step 1: Add upsertTrip call when trip loads**

In `src/pages/ExpenseList.jsx`:

Add after line 6 (after the `formatRupiah` import):

```js
import { useLocalTrips } from '../hooks/useLocalTrips'
```

Add after line 14 (after `const { identity } = useIdentity(tripId)`):

```js
const { upsertTrip } = useLocalTrips()
```

Add after line 18 (after the identity-redirect `useEffect`):

```js
useEffect(() => {
  if (trip?.name) upsertTrip(tripId, trip.name)
}, [tripId, trip?.name])
```

- [ ] **Step 2: Run full test suite**

```bash
rtk vitest run
```

Expected: PASS (40) FAIL (0)

- [ ] **Step 3: Commit**

```bash
rtk git add src/pages/ExpenseList.jsx
rtk git commit -m "feat: auto-track trip visits in localStorage"
```

---

### Task 4: TripCard component

**Files:**
- Create: `src/components/TripCard.jsx`

TripCard reads its own `archived` state from Firebase via `useTripArchive` and returns `null` if it doesn't belong in the current tab. This lets Home.jsx render all trips without needing to know which are archived.

- [ ] **Step 1: Create TripCard**

Create `src/components/TripCard.jsx`:

```jsx
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTripArchive } from '../hooks/useTripArchive'

const ACTION_WIDTH = 160

export default function TripCard({ tripId, name, lastVisited, onRemove, activeTab }) {
  const navigate = useNavigate()
  const { archived, setArchived } = useTripArchive(tripId)
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef(null)
  const startOffsetRef = useRef(0)

  if (activeTab === 'active' && archived) return null
  if (activeTab === 'archived' && !archived) return null

  const formattedDate = new Date(lastVisited).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  function onTouchStart(e) {
    startXRef.current = e.touches[0].clientX
    startOffsetRef.current = offsetX
    setDragging(true)
  }

  function onTouchMove(e) {
    if (startXRef.current === null) return
    const dx = e.touches[0].clientX - startXRef.current
    setOffsetX(Math.min(0, Math.max(-ACTION_WIDTH, startOffsetRef.current + dx)))
  }

  function onTouchEnd() {
    setDragging(false)
    startXRef.current = null
    setOffsetX(Math.abs(offsetX) >= ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0)
  }

  function close() {
    setOffsetX(0)
  }

  function handleCardClick() {
    if (offsetX !== 0) { close(); return }
    navigate(`/trip/${tripId}`)
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute right-0 top-0 h-full flex">
        {archived ? (
          <button
            onClick={() => { setArchived(false); close() }}
            className="bg-green-600 text-white text-xs font-semibold px-5 h-full"
          >
            Restore
          </button>
        ) : (
          <button
            onClick={() => { setArchived(true); close() }}
            className="bg-amber-500 text-white text-xs font-semibold px-5 h-full"
          >
            Archive
          </button>
        )}
        <button
          onClick={() => { onRemove(tripId); close() }}
          className="bg-red-600 text-white text-xs font-semibold px-5 h-full"
        >
          Remove
        </button>
      </div>

      <div
        className={`relative bg-card rounded-xl px-4 py-3 ${dragging ? '' : 'transition-transform duration-200'}`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className={`font-semibold text-sm ${archived ? 'text-gray-500' : 'text-white'}`}>
              {name}
            </div>
            <div className="text-gray-500 text-xs mt-0.5">{formattedDate}</div>
          </div>
          <span className="text-gray-500 text-sm">›</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
rtk vitest run
```

Expected: PASS (40) FAIL (0)

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/TripCard.jsx
rtk git commit -m "feat: add TripCard with swipe-left archive/restore/remove actions"
```

---

### Task 5: Rewrite Home.jsx

**Files:**
- Modify: `src/pages/Home.jsx` (full rewrite)

- [ ] **Step 1: Rewrite Home.jsx**

Replace the full contents of `src/pages/Home.jsx` with:

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, set } from 'firebase/database'
import { db } from '../firebase'
import { generateTripId } from '../utils/tripId'
import { useLocalTrips } from '../hooks/useLocalTrips'
import TripCard from '../components/TripCard'

export default function Home() {
  const navigate = useNavigate()
  const { trips, removeTrip } = useLocalTrips()
  const [tab, setTab] = useState('active')
  const [sheet, setSheet] = useState(null) // null | 'create' | 'join'

  const [tripName, setTripName] = useState('')
  const [participantInput, setParticipantInput] = useState('')
  const [participants, setParticipants] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)

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
    try {
      const tripId = generateTripId()
      await set(ref(db, `trips/${tripId}`), {
        name: tripName.trim(),
        participants,
        createdAt: Date.now(),
      })
      navigate(`/trip/${tripId}/identity`)
    } finally {
      setLoading(false)
    }
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    navigate(`/trip/${code}/identity`)
  }

  function closeSheet() {
    setSheet(null)
    setTripName('')
    setParticipants([])
    setParticipantInput('')
    setJoinCode('')
  }

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-accent font-extrabold text-xl">SplitTrip</h1>
          <p className="text-gray-500 text-xs">Split trip expenses easily</p>
        </div>
        <button
          onClick={() => setSheet('create')}
          className="bg-accent text-white text-sm font-bold px-4 py-2 rounded-xl"
        >
          + New Trip
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <div className="text-4xl">✈️</div>
          <p className="text-gray-400 text-sm">No trips yet.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setSheet('create')}
              className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Create Trip
            </button>
            <button
              onClick={() => setSheet('join')}
              className="bg-card text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Join Trip
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex bg-card rounded-xl p-1 mb-4">
            {['active', 'archived'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                  tab === t ? 'bg-accent text-white' : 'text-gray-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {trips.map((t) => (
              <TripCard
                key={t.tripId}
                tripId={t.tripId}
                name={t.name}
                lastVisited={t.lastVisited}
                onRemove={removeTrip}
                activeTab={tab}
              />
            ))}
          </div>
        </>
      )}

      {sheet && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={closeSheet}>
          <div
            className="w-full bg-deep rounded-t-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex bg-card rounded-xl p-1 flex-1 mr-3">
                {['create', 'join'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSheet(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      sheet === t ? 'bg-accent text-white' : 'text-gray-400'
                    }`}
                  >
                    {t === 'create' ? 'Create' : 'Join'}
                  </button>
                ))}
              </div>
              <button onClick={closeSheet} className="text-gray-400 text-xl px-1">✕</button>
            </div>

            {sheet === 'create' && (
              <>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Trip Name</label>
                  <input
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    placeholder="e.g. Bali Trip 2026"
                    className="w-full bg-card text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 ring-accent"
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
                      className="flex-1 bg-card text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 ring-accent"
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
                        <span key={p} className="bg-card text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
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
              </>
            )}

            {sheet === 'join' && (
              <>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Trip Code</label>
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC123"
                    className="w-full bg-card text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 ring-accent tracking-widest"
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
rtk vitest run
```

Expected: PASS (40) FAIL (0)

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
rtk git add src/pages/Home.jsx
rtk git commit -m "feat: rewrite Home with trip list, tabs, and create/join sheet"
```

- [ ] **Step 5: Push and deploy**

```bash
rtk git push && firebase deploy --only hosting
```

Expected: deploy completes, Hosting URL: `https://splittripid.web.app`
