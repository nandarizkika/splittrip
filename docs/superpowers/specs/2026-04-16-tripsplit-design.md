# TripSplit — Design Spec
**Date:** 2026-04-16  
**Status:** Approved

---

## Overview

A mobile-first web app for tracking and splitting trip expenses among a group of friends. No installation required — anyone with the link can open it on their phone. Real-time sync so everyone sees the same data instantly.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React (Vite) | Fast, lightweight SPA |
| Database | Firebase Realtime Database | Real-time sync across all devices, free tier sufficient |
| Hosting | Firebase Hosting | One-command deploy, free, gives shareable HTTPS URL |
| Auth | None | Trip identified by unique ID in URL |

Trip URL format: `https://tripsplit.web.app/trip/{tripId}`

---

## Data Model

```
trips/{tripId}
  name: string                  // "Bali Trip 2026"
  participants: string[]        // ["Andri", "Nanda", "Mega", "Arul", "Ama"]
  createdAt: timestamp          // auto-set

expenses/{tripId}/{expenseId}
  category: string              // "food" | "transport" | "accommodation" | "activities" | "shopping" | "health" | "other"
  amount: number                // 1500000 (stored as integer, IDR)
  paidBy: string                // "Andri"
  payerIncluded: boolean        // true = Andri also splits the cost
  splitAmong: string[]          // ["Nanda", "Mega", "Arul", "Ama"]
  createdAt: timestamp          // auto-set

settlements/{tripId}/{settlementId}
  from: string                  // "Nanda"
  to: string                    // "Andri"
  amount: number                // 300000
  paid: boolean                 // false → true when marked settled
```

**Notes:**
- `settlements` are computed from `expenses` using the debt-minimization algorithm and stored so all clients see the same result
- Settlement is recomputed and overwritten whenever an expense is added or edited
- `participants` is mutable — new members can be added mid-trip

---

## Expense Categories

7 preset categories with emoji, searchable by typing:

| Emoji | Label |
|---|---|
| 🍜 | Food & Drinks |
| 🚗 | Transport |
| 🏨 | Accommodation |
| 🛒 | Shopping |
| 📦 | Other |

---

## Screens

### 1. Home
- Tab toggle: **Create** / **Join**
- **Create tab:** trip name input + participant names input → generates trip ID → redirect to Identity Selection
- **Join tab:** enter trip code → redirect to Identity Selection

### 1b. Identity Selection (shown once per device per trip)
- Shown after creating or joining a trip
- "Who are you?" — display all participant name chips, tap to select yours
- Selection stored in `localStorage` keyed by `tripId` so it persists across sessions
- On return visits, identity is auto-loaded from localStorage — this screen is skipped

### 2. Expense List (main screen)
- Header: trip name, member count, trip code (for sharing latecomers)
- Summary bar: total spent + current user's balance (owe/owed)
- Expense rows (newest first):
  - Category emoji + label
  - Who paid, how many people, date
  - Amount (Rp formatted)
  - ✏️ edit button always visible on each row
- Bottom actions: **+ Add Expense** | **Settlement →**
- ⚙️ gear icon → Trip Settings

### 3. Trip Settings
- List of current members with names
- Input to add a new member (added globally to the trip)

### 4. Add / Edit Expense
- **Category** — dropdown with search-by-typing, 7 presets
- **Amount** — Rp prefix, auto-formatted with thousand separators (e.g. `Rp 1.500.000`) as user types
- **Paid by** — tap a name chip to select (single select)
- **Include payer in split** — toggle switch; when on, payer is counted as one of the people splitting
- **Split among** — name chips, tap to toggle on/off; "Select all" shortcut; live per-person amount shown below the chips
- **Add new member** — `+ New` chip inside Split Among opens inline input; new member is added to the trip globally

### 5. Settlement
- Summary bar: total spent + number of transactions needed
- **Outstanding** section: each unpaid debt as `[From] → [To]` with amount and "Mark Paid" button
- **Settled** section: paid debts greyed out with ✓ badge
- Anyone (payer or receiver) can tap "Mark Paid"
- Each debt row has a **Copy** button — copies the amount to clipboard for easy bank transfer
- Live sync — marking paid is visible to all participants instantly

---

## Settlement Algorithm

Uses a **net balance + greedy debt minimization** approach:

1. For each expense, calculate each participant's share
2. Sum up: each person's net balance = (total paid by them) − (total owed by them across all expenses)
3. Separate into creditors (positive balance) and debtors (negative balance)
4. Greedily match the largest creditor with the largest debtor:
   - If creditor amount > debtor amount: debtor pays full amount to creditor, creditor balance reduces
   - If creditor amount < debtor amount: creditor is fully settled, debtor still owes the remainder to next creditor
   - If equal: one transaction settles both
5. Repeat until all balances are zero

This minimizes the number of transactions needed.

---

## Member Management

Members can be added in two places:
1. **Trip Settings** (⚙️) — dedicated screen, manage full member list
2. **Add Expense → Split Among** — `+ New` chip opens inline input; new member added globally to trip

Both paths add the member to `trips/{tripId}/participants` and they immediately appear everywhere in the app.

---

## Amount Formatting

- Stored as plain integer (IDR, no decimals)
- Displayed with `Rp` prefix and `.` as thousand separator: `Rp 1.500.000`
- User types digits only — formatting applied automatically on input

---

## Key Behaviours

- **No login** — identity is picking your name once per device; stored in localStorage per trip
- **Real-time** — all changes sync instantly to all open clients via Firebase
- **Settlement recalculates** automatically on every expense add/edit
- **Copy amount** on settlement rows — copies `Rp 300.000` to clipboard for manual bank transfer (no payment URL redirect — not reliable across Indonesian banks)
- **Trip code** always visible on Expense List for sharing with latecomers

---

## Out of Scope

- Push notifications
- Expense photos / receipts
- Multi-currency
- Payment URL deep links to bank apps
- User accounts / login
