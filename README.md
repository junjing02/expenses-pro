# Moneyboard Pro — Serverless Personal Finance Tracker & OCR Receipt Scanner

A serverless, zero-cost-host personal finance tracker with client-side OCR receipt scanning capabilities. This project is built on **React.js (Vite)**, styled using **Tailwind CSS**, and integrates directly with **Supabase (PostgreSQL, Auth, & Storage)**, completely eliminating the need for a custom API server.

---

## 🚀 Key Features

1. **Grouped Ledger & Balance Cards**: A daily-grouped transaction timeline (with search and monthly pagination) displaying MTD balance summaries.
2. **Interactive Reports & Merchant Drill-Downs**: A statistics dashboard featuring timeframe switcher filters (Week, Month, Year, All), daily trend line charts, and category pie charts. Tapping any category expands a list of transactions aggregated by specific merchants (e.g. Lazada, Shopee, PDD) with relative percentages.
3. **Monthly Budget Configuration & Real-time Alerts**: Custom monthly budget thresholds. It triggers warnings (at 80% limit warnings) or alerts (at 100% budget exceedance) client-side before transactions are saved.
4. **Recurring Payments & Subscriptions**: Track fixed bills, loans, and media memberships (e.g. Spotify, House Loan) linked to payment methods with automatic monthly costs aggregation.
5. **Malaysian Banks & E-Wallets Support**: Dynamic icon mapping and logo assets supporting Maybank, CIMB, Touch 'n Go (TnG) eWallet, and Cash.
6. **Client-Side OCR Scanning**: Local browser-based receipt processing utilizing **Tesseract.js** to parse date, vendor, total price, and line items. Review line items before saving and batch-insert them into the database.
7. **Database Synchronizations**: Auto-calculating account balances utilizing PostgreSQL trigger functions on transaction updates, insertions, and deletions.
8. **Row-Level Security (RLS)**: Fine-grained security policies on all PostgreSQL tables and Supabase Storage Objects, ensuring data is accessible only by the authenticated owner.
9. **Private Receipt Storage**: Receipts uploaded to a secure private storage bucket, fetched securely on-demand via time-limited signed URLs.

---

## 🛠️ Tech Stack
- **Frontend Framework**: React.js (via Vite)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Chart.js (via react-chartjs-2)
- **Database & Auth**: Supabase (Postgres, Storage, Auth)
- **OCR Engine**: Tesseract.js (running fully inside the browser)

---

## 📁 Directory Structure
```
expenses-pro/
├── supabase/
│   ├── schema.sql              # Complete Supabase SQL scripts (core tables, balance updates trigger, and RLS)
│   ├── budgets.sql             # Incremental SQL migration for budgets table configuration
│   └── subscriptions.sql       # Incremental SQL migration for recurring subscriptions table
├── src/
│   ├── components/
│   │   ├── HomeLedger.jsx      # Daily-grouped transaction ledger with search filters & monthly paginations
│   │   ├── WalletList.jsx      # Multi-column portfolio display grouping Banks, Credit Cards, E-Wallets, & Cash
│   │   ├── StatisticsReports.jsx # Trend line charts, pie charts, and category merchant drill-downs
│   │   ├── SubscriptionsManager.jsx # Recurring bills tracker and monthly cost aggregator
│   │   ├── TransactionForm.jsx # Manual income/expense entry form with budget limit checks
│   │   ├── ReceiptScanner.jsx  # Drag-and-drop OCR reviewer, line-items table editor, & budget limits checking
│   │   ├── Dashboard.jsx       # Reused budget threshold configuration card
│   │   └── ImportExport.jsx    # CSV backups management, database reset commands, and Moneyboard CSV parser
│   ├── lib/
│   │   └── supabaseClient.js   # Supabase client instance configuration
│   ├── utils/
│   │   ├── ocrProcessor.js     # Tesseract.js OCR engine wrapper & multi-format item extraction regexp heuristics
│   │   └── logoHelper.jsx      # Vector logo and emoji mapper utility for Malaysian banks, e-wallets, & merchants
│   ├── App.jsx                 # User auth portal, viewport container, and modal handlers
│   ├── index.css               # Global styling, keyframes, transitions, and glassmorphism helpers
│   └── main.jsx                # React mount entry
```

---

## ⚙️ Setup & Local Startup

### 1. Database & Storage Configuration (Supabase)
1. Create a free project on [Supabase.com](https://supabase.com).
2. Open the **SQL Editor** from your project sidebar.
3. Paste and run the contents of [supabase/schema.sql](file:///Users/ting/Documents/Antigravity/expenses-pro/supabase/schema.sql) first.
4. Next, paste and run [supabase/budgets.sql](file:///Users/ting/Documents/Antigravity/expenses-pro/supabase/budgets.sql) and [supabase/subscriptions.sql](file:///Users/ting/Documents/Antigravity/expenses-pro/supabase/subscriptions.sql) to add the budget and recurring payment tables.
   * *This will generate your tables, establish the balance update trigger, enable RLS, configure your storage buckets, and apply security policies.*

### 2. Local Environment Setup
1. Duplicate `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
2. Retrieve your credentials from the Supabase Dashboard: **Project Settings -> API**.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` inside `.env`.

### 3. Install Dependencies & Launch Dev Server
Ensure you have Node.js installed, then run:
```bash
# Install NPM packages
npm install

# Start local server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🔒 Row-Level Security Heuristic Rules
All database tables map `auth.uid() = user_id`, securing your tables so that no user can access another's transactions.
For receipts storage, objects are uploaded with prefix `receipts/<user_id>/...`. The RLS logic is configured as:
```sql
CREATE POLICY "Authenticated users can upload receipts to their folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
```
This forces strict partition isolation on file uploads.
