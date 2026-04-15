# SplitTrip

A mobile-first web app for tracking and splitting trip expenses among a group of friends. No installation, no login — just share a link.

**Live:** https://splittripid.web.app

---

## Features

- Create a trip and invite friends via a shareable code
- Add expenses with category, amount, who paid, and who splits
- Real-time sync — everyone sees changes instantly
- Settlement screen with optimized debt minimization (fewest transactions to settle up)
- Mark debts as paid, copy amounts for bank transfer
- Works on any phone browser, no app install needed

## Tech Stack

- React + Vite
- Firebase Realtime Database (real-time sync)
- Firebase Hosting
- Tailwind CSS

## Local Development

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in your Firebase project credentials
3. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run build
firebase deploy --only hosting
```

## How It Works

Each trip is identified by a unique code in the URL (`/trip/{tripId}`). Anyone with the link can join. Identity (your name) is picked once and stored in `localStorage` per trip — no accounts needed.

Settlement uses a greedy debt-minimization algorithm: it calculates each person's net balance and matches the largest creditor with the largest debtor, minimizing the total number of transactions.
