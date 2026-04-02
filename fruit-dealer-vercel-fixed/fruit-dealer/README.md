# 🍉 FreshTrack Wholesale — Fruit Dealer Management System

A Next.js inventory management system for fruit wholesalers. Tracks stock IN/OUT, transactions, and generates financial reports.

## Features
- 📦 Inventory management with low-stock alerts
- ↓ Stock IN recording (supplier, origin, collector, courier)
- ↑ Stock OUT recording (consumer, pricing, delivery info)
- ⇄ Transaction log with filters (date, fruit, type, supplier, consumer)
- 📊 Reports & Analytics (revenue, cost, profit per fruit)
- 💾 **Persistent storage via localStorage** — data survives page refreshes

## Deploy to Vercel

### Option A: GitHub → Vercel (Recommended)
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repository
4. Framework: **Next.js** (auto-detected)
5. Click **Deploy** — done!

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel
```

## Run Locally
```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Data Storage
Data is stored in the browser's **localStorage** under these keys:
- `ft_inventory` — current stock
- `ft_transactions` — all transaction records
- `ft_txNextId` / `ft_invNextId` — ID counters

> ⚠️ localStorage is **per browser / per device**. Data won't sync across devices. For multi-device sync, a backend database (e.g. Supabase, PlanetScale) would be needed.
