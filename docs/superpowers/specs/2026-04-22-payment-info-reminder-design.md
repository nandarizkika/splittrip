# Payment Info & WhatsApp Reminder Design

**Date:** 2026-04-22

**Goal:** Allow trip participants to store their payment details (e-wallet numbers, bank account) so others can pay them easily from the Settlement screen — plus a one-tap WhatsApp reminder button for unpaid debts.

---

## Overview

Two connected additions:
1. **Payment info in Trip Settings** — anyone can enter phone number, e-wallet availability, and bank account for any participant
2. **Settlement row enhancement** — tap to expand a debt row and see the creditor's payment info inline, with copy buttons and a WhatsApp reminder button

---

## Data Model

New Firebase node alongside the existing trip data:

```
trips/{tripId}/paymentInfo/{participantName}
  phone: string          // e.g. "081234567890"
  ewallets: string[]     // subset of ["gopay", "ovo", "dana", "shopeepay"]
  bankName: string       // e.g. "BCA"
  bankAccount: string    // e.g. "1234567890"
```

All fields are optional. A participant with no payment info simply shows a hint in the settlement row. No changes to the existing `trips/{tripId}` structure.

---

## Architecture

### New file: `src/hooks/usePaymentInfo.js`

Reads and writes `trips/{tripId}/paymentInfo` via Firebase Realtime Database.

```js
usePaymentInfo(tripId)
// returns: { paymentInfo, updatePaymentInfo }
// paymentInfo: { [participantName]: { phone, ewallets, bankName, bankAccount } }
// updatePaymentInfo(name, data): writes to trips/{tripId}/paymentInfo/{name}
```

### Modified files

| File | Change |
|------|--------|
| `src/pages/TripSettings.jsx` | Add "Payment Info" accordion section below Members |
| `src/pages/Settlement.jsx` | Fetch `paymentInfo`, pass to each `SettlementRow` |
| `src/components/SettlementRow.jsx` | Expand/collapse behavior, inline payment info, copy buttons, Remind button |

---

## Trip Settings — Payment Info Section

Rendered below the existing Members card. One accordion row per participant, all collapsed by default.

**Collapsed state:** participant name + "▼ set info" label (or "▼ edit" if info already saved)

**Expanded state (form fields):**
- Phone number (text input, e.g. "081234567890")
- E-wallet toggles — tap to select/deselect: **GoPay**, **OVO**, **Dana**, **ShopeePay** (pill buttons, active = accent color)
- Bank name (text input, e.g. "BCA")
- Bank account number (text input)
- Save button — writes to Firebase on tap, collapses the row

**Rules:**
- All fields optional — no validation, no required fields
- Anyone can fill in info for any participant
- Saving with all fields empty clears that participant's payment info

---

## Settlement Row — Expanded State

### Collapsed (default)
```
Mega → Nanda          Rp 50,000        ▼
```

### Expanded (tap to toggle)
```
Mega → Nanda          Rp 50,000        ▲

┌─────────────────────────────────┐
│ GoPay / OVO   081234567890  📋  │
│ BCA           1234567890    📋  │
└─────────────────────────────────┘

[ Mark Paid ]   [ 📲 Remind via WA ]
```

**Copy buttons (📋):** copies the value to clipboard (phone number or account number).

**Remind via WA button:**
- Only shown if the creditor has a phone number set
- Opens `https://wa.me/62{phone}?text={message}` (strips leading 0 from phone, prepends 62)
- Pre-filled message:

```
Hey {debtor}, reminder for trip {tripName} — you owe Rp {amount} to {creditor}.
{ewallets}: {phone} / {bankName}: {bankAccount} a/n {creditor}. Thanks! 🙏
```

- If only e-wallets set (no bank): omit bank line
- If only bank set (no e-wallets): omit e-wallet line
- If both missing but phone exists: message still sends, just no payment method line

**No payment info fallback:**
```
Mega → Nanda          Rp 50,000        ▼
```
Expanding shows: *"No payment info set for Nanda — add it in Trip Settings"* + Mark Paid button only.

---

## WhatsApp Message Format

```
Hey {debtor}, reminder for trip {tripName} — you owe Rp {amount} to {creditor}. {paymentLine}. Thanks! 🙏
```

**Payment line construction:**
- If ewallets non-empty: `{ewallet labels joined by " / "}: {phone}`
- If bank set: `{bankName}: {bankAccount} a/n {creditor}`
- If both: join with ` / `
- Example: `GoPay / OVO: 081234567890 / BCA: 1234567890 a/n Nanda`

**Phone formatting:** strip leading `0`, prepend `62`. e.g. `081234567890` → `6281234567890`

---

## Edge Cases

- **Participant has no payment info:** settlement row expands to show hint + Mark Paid only, no Remind button
- **Phone set but no bank/ewallets:** Remind button shows, payment line omitted from message
- **All fields empty on Save:** clears existing payment info for that participant
- **Accordion in settings:** only one participant expanded at a time (opening one collapses others)

---

## Out of Scope

- QRIS image upload
- Validating phone number format
- Confirming payment via WhatsApp (read receipts, callbacks)
- Push notifications
- GoPay/OVO deep links (just phone number for manual transfer)
