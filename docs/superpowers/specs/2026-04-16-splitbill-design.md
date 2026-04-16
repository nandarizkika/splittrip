# Split Bill — Design Spec
**Date:** 2026-04-16  
**Status:** Approved

---

## Overview

Add an itemized bill-splitting feature to SplitTrip. When a group eats at a cafe and each person orders different things, one person can scan or type the receipt, assign each item to the people who ordered it, and the app calculates exactly what each person owes — including proportional service charge and tax. The result integrates seamlessly with the existing expense list, totals, and settlement.

---

## Entry Point

A second action button on the Expense List screen, alongside the existing "+ Add Expense":

```
[ + Add Expense ]  [ 🧾 Split Bill ]
```

Route: `/trip/:tripId/splitbill`

---

## Screen: Split Bill

### Fields

1. **Category** — same `CategoryPicker` component as Add Expense
2. **Paid by** — same `NameChip` selector (single select); defaults to current user's identity
3. **Items list** — list of items, each with:
   - Item name (text input)
   - Item price (Rp formatted, same `AmountInput` component)
   - Person chips (all trip participants except payer; tap to toggle who shares this item)
   - Delete button (×) to remove the item
4. **+ Add Item** button — appends a new blank item row
5. **📷 Scan Receipt** button (top-right of header) — triggers OCR flow
6. **Service charge** — percentage input, default `0`
7. **Tax (PPN)** — percentage input, default `0`
8. **Per-person totals panel** — live calculation showing each person's amount; updates on every change
9. **Save Split Bill** button — disabled until at least one item has a price and at least one person assigned

### Per-person amount calculation

For each person:
```
subtotal = sum of (item_price / number_of_people_sharing_item) for each item they're assigned to
multiplier = 1 + (serviceCharge / 100) + (tax / 100)
finalAmount = round(subtotal * multiplier)
```

Rounding: `Math.round`. Any rounding remainder is absorbed by the first person alphabetically (consistent with existing settlement rounding).

---

## OCR Flow (Gemini)

1. User taps **📷 Scan Receipt**
2. Native file picker opens (`accept="image/*"`, `capture="environment"` for mobile camera)
3. Image is base64-encoded in the browser
4. POST to Gemini API (`gemini-1.5-flash`) with the image and prompt:
   > "You are a receipt parser. Extract all line items from this receipt. Return ONLY a JSON array with no markdown, no explanation. Format: [{\"name\": \"Item Name\", \"price\": 45000}, ...]. Prices as integers in the original currency, no symbols."
5. Parse the JSON response → populate the items list
6. If parsing fails or API returns an error → show an inline error message: "Couldn't read receipt — please add items manually"
7. User can edit, delete, or add items after OCR populates them

### API key

Stored in `VITE_GEMINI_API_KEY` in `.env.local` (added to `.env.example`).

Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={API_KEY}`

Free tier: 15 requests/min, 1500 requests/day — sufficient for a friend group.

---

## Data Model Changes

### Expense schema (additive change)

```
expenses/{tripId}/{expenseId}
  category: string
  amount: number                    // total bill amount (sum of all items + service + tax)
  paidBy: string
  payerIncluded: boolean            // always false for split bill — ignored when perPersonAmounts present
  splitAmong: string[]              // keys of perPersonAmounts (everyone who owes, may include payer)
  perPersonAmounts: object          // { "Nanda": 59850, "Andri": 66275, ... } — includes payer's own share if they ate
  createdAt: timestamp
```

`perPersonAmounts` is only present on itemized expenses. When absent, the existing equal-split logic applies unchanged.

### No schema migration needed

Existing expenses don't have `perPersonAmounts` — the algorithm falls back to equal split automatically.

---

## Algorithm Changes

### `computeSettlements` (src/utils/settlement.js)

When computing each person's share of an expense:
- If `expense.perPersonAmounts` exists → use `perPersonAmounts[person]` (or 0 if not present)
- Otherwise → existing equal-split logic unchanged

### `ExpenseList` balance calculation

Same change: use `perPersonAmounts[identity]` when present instead of equal share.

---

## ExpenseRow Display

For itemized expenses, show `"itemized"` instead of `"N people"` in the subtitle line:

```
🍜 Food & Drinks
Andri · itemized · 13 Apr       Rp 243.000  ✏️
```

Edit (✏️) on an itemized expense navigates to `/trip/:tripId/splitbill?edit={expenseId}` — the Split Bill screen pre-populated with the saved items (stored in `perPersonAmounts` only; items are not stored separately, so edit mode shows a single editable total amount per person instead of individual items).

> **Edit mode simplification:** Since items aren't stored in Firebase (only `perPersonAmounts`), editing a split bill shows a simplified view: the per-person amounts are displayed as editable fields. Full item re-entry is not supported in edit mode.

---

## New Files

| File | Purpose |
|---|---|
| `src/pages/SplitBill.jsx` | Main split bill screen |
| `src/utils/gemini.js` | Gemini API call — takes image base64, returns `[{name, price}]` |

## Modified Files

| File | Change |
|---|---|
| `src/App.jsx` | Add route `/trip/:tripId/splitbill` |
| `src/pages/ExpenseList.jsx` | Add "🧾 Split Bill" button; update balance calc for `perPersonAmounts` |
| `src/utils/settlement.js` | Handle `perPersonAmounts` in `computeSettlements` |
| `src/components/ExpenseRow.jsx` | Show "itemized" label when `perPersonAmounts` present |
| `.env.example` | Add `VITE_GEMINI_API_KEY=` |

---

## Out of Scope

- Storing individual items in Firebase (only `perPersonAmounts` is saved)
- Full item re-entry in edit mode (edit shows per-person amounts only)
- Multiple payers on a single bill
- Currency conversion
- Tip splitting (use service charge % instead)
