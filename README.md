# ApexLedger — Serverless Personal Finance Tracker & OCR Receipt Scanner

A serverless, zero-cost-host personal finance tracker with client-side OCR receipt scanning capabilities. This starter project is built on **React.js (Vite)**, styled using **Tailwind CSS**, and integrates directly with **Supabase (PostgreSQL, Auth, & Storage)**, completely eliminating the need for a custom API server.

---

## 🚀 Key Features

1. **Transaction & Account CRUD**: Real-time checking, savings, credit cards, and investments tracking.
2. **Client-Side OCR Scanning**: Local browser-based receipt processing utilizing **Tesseract.js** to parse date, vendor, total price, and line items, saving compute resources and costs.
3. **Database Synchronizations**: Auto-calculating account balances utilizing PostgreSQL trigger functions on transaction updates, insertions, and deletions.
4. **Row-Level Security (RLS)**: Fine-grained security policies on all PostgreSQL tables and Supabase Storage Objects, ensuring data is accessible only by the authenticated owner.
5. **Private Receipt Storage**: Receipts uploaded to a secure private storage bucket, fetched securely on-demand via time-limited signed URLs.

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
│   └── schema.sql          # Complete Supabase SQL scripts (tables, keys, trigger, and RLS)
├── src/
│   ├── components/
│   │   ├── AccountCard.jsx     # Card component for account management
│   │   ├── Dashboard.jsx       # Financial scorecard & category charts
│   │   ├── ReceiptScanner.jsx  # Drag-and-drop OCR and Supabase storage coordinator
│   │   ├── TransactionList.jsx # Transaction ledger with filters, search, and sorting
│   │   └── TransactionForm.jsx # Manual income/expense entry form
│   ├── lib/
│   │   └── supabaseClient.js   # Supabase client instance config
│   ├── utils/
│   │   └── ocrProcessor.js     # Tesseract.js wrapper & regexp receipt parsing heuristics
│   ├── App.jsx                 # User authentication router & main UI container
│   ├── index.css               # Global styling, transitions, and glassmorphism helpers
│   └── main.jsx                # React mount entry
├── .env.example            # Environment variables template
├── package.json            # Node project configuration
├── tailwind.config.js      # Tailwind configurations
├── postcss.config.js       # PostCSS config
├── vite.config.js          # Vite plugins & configuration
└── index.html              # Vite entry page
```

---

## ⚙️ Setup & Local Startup

### 1. Database & Storage Configuration (Supabase)
1. Create a free project on [Supabase.com](https://supabase.com).
2. Open the **SQL Editor** from your project sidebar.
3. Paste the contents of [supabase/schema.sql](file:///Users/ting/Documents/Antigravity/expenses-pro/supabase/schema.sql) and click **Run**.
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
