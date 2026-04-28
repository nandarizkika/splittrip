# SplitTrip

A mobile-first web app for tracking and splitting trip expenses among a group of friends. No login, no install — just share a link.

**Live:** https://splittripid.web.app

---

## Features

### Core
- **No accounts needed** — pick your name once, stored locally per trip
- **Shareable trip code** — invite friends by sharing the URL
- **Real-time sync** — everyone sees changes instantly via Firebase

### Expense Tracking
- Add expenses with category, amount, who paid, and who it's split among
- Equal split or custom per-person amounts
- Edit or delete any expense

### Split Bill
- Itemized bill splitting — enter each dish and assign it to whoever ordered it
- **Receipt OCR** — scan a receipt photo with Gemini Vision to auto-fill items
- Service charge and tax percentage inputs
- Live per-person total as you assign items

### Settlement
- Optimized debt minimization — fewest transactions to settle up
- Mark debts as paid
- **Payment info per participant** — store phone number, e-wallet (GoPay, OVO, Dana, ShopeePay), and bank account so debtors know where to send money
- **Copy to clipboard** — tap 📋 to copy phone or account number instantly
- **WhatsApp reminder** — one tap opens WhatsApp with a pre-filled reminder message to the debtor

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Database | Firebase Realtime Database |
| Hosting | Firebase Hosting |
| OCR | Google Gemini Vision API (`gemini-1.5-flash`) |

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/your-username/trip_spending.git
cd trip_spending
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_GEMINI_API_KEY=       # Optional — only needed for receipt OCR
```

- **Firebase**: Create a project at [console.firebase.google.com](https://console.firebase.google.com), enable Realtime Database, and copy the config.
- **Gemini API key**: Get a free key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) (1,500 free requests/day, no billing required).

### 3. Start dev server

```bash
npm run dev
```

---

## Deploy

```bash
npm run build
firebase deploy --only hosting
```

---

## How It Works

### Identity
Each trip is identified by a unique code in the URL (`/trip/{tripId}`). Anyone with the link can join. Your name is picked once on first visit and stored in `localStorage` — no accounts needed.

### Equal Split
Expenses are split equally among participants. The first person in the list absorbs any rounding remainder (e.g. Rp 100,000 split 3 ways: person 1 pays Rp 33,334, others pay Rp 33,333).

### Itemized Split (Split Bill)
Each item is assigned to one or more people. The cost is divided equally among assignees. Service charge and tax are applied as compounding multipliers — service is applied to the subtotal first, then tax is applied on top of the result (e.g. 10,000 + 5% service = 10,500, then +10% tax = 11,550). The result is stored as a `perPersonAmounts` map and used directly in settlement.

### WhatsApp Reminder
Each trip participant can store their payment info (phone, e-wallet, bank account) in Trip Settings. On the Settlement screen, tapping a debt row reveals the creditor's payment details. If the debtor has a phone number saved, a "Remind via WA" button opens WhatsApp with a pre-filled message addressed to the debtor.

### Settlement Algorithm
Uses a greedy debt-minimization approach: calculates each person's net balance (total paid minus total owed), then matches the largest creditor with the largest debtor iteratively — minimizing the total number of transactions needed to settle up.
