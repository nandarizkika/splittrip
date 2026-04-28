# Trip History & Archive Design

**Date:** 2026-04-29

**Goal:** Give users a home screen that lists all trips they've visited, with tabs for Active and Archived, and swipe-left actions to archive or remove a trip from their list.

---

## Overview

Two connected additions:
1. **Trip history** — automatically track every trip URL the user visits, stored in localStorage, shown on a new home screen
2. **Archive** — any member can archive a trip (Firebase flag, shared to everyone); reversible from the Archived tab

---

## Home Screen

Replaces the current Home.jsx two-tab (Create / Join) interface. The new home screen has:

- **Trip list** as the primary content — two tabs: **Active** and **Archived**
- **+ New Trip** button (top-right) that opens a bottom sheet containing the existing Create and Join flows
- Empty state when no trips tracked yet: prompt to create or join

### Tabs

| Tab | Content |
|-----|---------|
| Active | All tracked trips where `archived` is falsy, sorted by `lastVisited` descending |
| Archived | All tracked trips where `archived: true`, sorted by `lastVisited` descending, dimmed |

---

## Trip Card

Each card shows:
- **Trip name**
- **Participant count** (e.g. "4 people")
- **Last visited** (e.g. "Apr 22")

Settlement status is intentionally omitted — loading settlements for every card would require one Firebase listener per trip.

Tapping a card navigates to `/trip/:tripId`.

---

## Swipe Left Actions

Swiping a card left reveals two action buttons:

### On Active tab
| Button | Color | Action |
|--------|-------|--------|
| Archive | Amber | Sets `archived: true` on `trips/{tripId}` in Firebase. Moves trip to Archived tab for all members. |
| Remove | Red | Removes the trip entry from localStorage only. Does not affect Firebase or other members. |

### On Archived tab
| Button | Color | Action |
|--------|-------|--------|
| Restore | Green | Sets `archived: false` on `trips/{tripId}` in Firebase. Moves trip back to Active for all members. |
| Remove | Red | Removes from localStorage only. |

---

## Trip Tracking (localStorage)

**Key:** `splittrip_trips`

**Value:** JSON array of trip entries:
```json
[
  { "tripId": "ABC123", "name": "Bali Trip", "lastVisited": 1714320000000 },
  { "tripId": "XYZ456", "name": "Lombok Weekend", "lastVisited": 1714233600000 }
]
```

**When to update:**
- On every visit to `/trip/:tripId` — upsert the entry with the current timestamp and trip name (read from Firebase `trips/{tripId}/name`)
- On Remove — delete the entry from the array

The `archived` state is NOT stored in localStorage — it is always read from Firebase so it stays in sync across all members' devices.

---

## Data Model Change

One new optional field on the existing Firebase trip node:

```
trips/{tripId}/archived: true | (absent)
```

- `absent` or `false` = active
- `true` = archived

No other Firebase structure changes.

---

## Architecture

### New files

| File | Purpose |
|------|---------|
| `src/hooks/useLocalTrips.js` | Read/write the localStorage `splittrip_trips` array |
| `src/hooks/useTripArchive.js` | Read `archived` flag from Firebase + setArchived(tripId, bool) |

### Modified files

| File | Change |
|------|--------|
| `src/pages/Home.jsx` | Full rewrite — trip list with tabs, swipe actions, + button for create/join sheet |
| `src/hooks/useTrip.js` | Add `archived` field to trip data returned |

### useLocalTrips hook

```js
useLocalTrips()
// returns: { trips, upsertTrip, removeTrip }
// trips: [{ tripId, name, lastVisited }] sorted by lastVisited desc
// upsertTrip(tripId, name): add or update entry with Date.now()
// removeTrip(tripId): remove entry from array
```

### useTripArchive hook

```js
useTripArchive(tripId)
// returns: { archived, setArchived }
// archived: boolean (read from Firebase trips/{tripId}/archived)
// setArchived(bool): writes trips/{tripId}/archived to Firebase
```

---

## Trip Visit Tracking

In `src/pages/ExpenseList.jsx` (the main trip page at `/trip/:tripId`), call `upsertTrip(tripId, trip.name)` inside a `useEffect` when the trip data loads. This ensures any trip visited gets tracked automatically.

---

## Out of Scope

- Push notifications for archived trips
- Trip deletion from Firebase (remove only removes from local list)
- Sorting options other than last visited
- Search / filter trips
- Pagination (localStorage list is assumed small)
