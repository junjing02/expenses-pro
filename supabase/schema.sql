-- =====================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR PERSONAL FINANCE TRACKER
-- =====================================================================
-- This script sets up the tables, triggers, and Row Level Security (RLS)
-- policies for accounts, transactions, receipt_items, and receipt storage.
-- Run this in the Supabase SQL Editor.

-- Enable UUID extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. TABLES DEFINITIONS
-- ---------------------------------------------------------------------

-- ACCOUNTS TABLE
-- Stores accounts (e.g., Checking, Savings, Credit Card, Investment)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Checking', 'Savings', 'Credit Card', 'Investment', 'Cash', 'Other')),
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TRANSACTIONS TABLE
-- Stores daily income/expense flows linked to an account
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_image_url TEXT, -- Path in Supabase Storage (e.g., 'auth_uid/file.jpg')
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RECEIPT ITEMS TABLE
-- Stores line-item breakdowns extracted via client-side OCR
CREATE TABLE IF NOT EXISTS public.receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2. AUTOMATIC ACCOUNT BALANCE UPDATE TRIGGERS
-- ---------------------------------------------------------------------
-- Updates public.accounts.current_balance automatically when transactions are
-- created, updated, or deleted, avoiding race conditions or sync bugs.

CREATE OR REPLACE FUNCTION public.fn_update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- HANDLE INSERT
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.type = 'income') THEN
            UPDATE public.accounts
            SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.account_id;
        ELSIF (NEW.type = 'expense') THEN
            UPDATE public.accounts
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.account_id;
        END IF;
        
    -- HANDLE DELETE
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.type = 'income') THEN
            UPDATE public.accounts
            SET current_balance = current_balance - OLD.amount
            WHERE id = OLD.account_id;
        ELSIF (OLD.type = 'expense') THEN
            UPDATE public.accounts
            SET current_balance = current_balance + OLD.amount
            WHERE id = OLD.account_id;
        END IF;

    -- HANDLE UPDATE
    ELSIF (TG_OP = 'UPDATE') THEN
        -- If transaction moved to a different account, revert old and apply to new
        IF (OLD.account_id <> NEW.account_id) THEN
            -- Revert old account changes
            IF (OLD.type = 'income') THEN
                UPDATE public.accounts
                SET current_balance = current_balance - OLD.amount
                WHERE id = OLD.account_id;
            ELSIF (OLD.type = 'expense') THEN
                UPDATE public.accounts
                SET current_balance = current_balance + OLD.amount
                WHERE id = OLD.account_id;
            END IF;

            -- Apply new account changes
            IF (NEW.type = 'income') THEN
                UPDATE public.accounts
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.account_id;
            ELSIF (NEW.type = 'expense') THEN
                UPDATE public.accounts
                SET current_balance = current_balance - NEW.amount
                WHERE id = NEW.account_id;
            END IF;
        
        -- Same account, balance changed or transaction type changed
        ELSE
            -- Revert old amounts first
            IF (OLD.type = 'income') THEN
                UPDATE public.accounts
                SET current_balance = current_balance - OLD.amount
                WHERE id = NEW.account_id;
            ELSIF (OLD.type = 'expense') THEN
                UPDATE public.accounts
                SET current_balance = current_balance + OLD.amount
                WHERE id = NEW.account_id;
            END IF;

            -- Apply new amounts
            IF (NEW.type = 'income') THEN
                UPDATE public.accounts
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.account_id;
            ELSIF (NEW.type = 'expense') THEN
                UPDATE public.accounts
                SET current_balance = current_balance - NEW.amount
                WHERE id = NEW.account_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to transactions table
CREATE TRIGGER tr_transactions_balance_sync
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_update_account_balance();


-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------

-- Enable Row Level Security on all tables
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

-- ACCOUNTS POLICIES
CREATE POLICY "Users can perform CRUD on their own accounts" 
ON public.accounts 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- TRANSACTIONS POLICIES
CREATE POLICY "Users can perform CRUD on their own transactions" 
ON public.transactions 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- RECEIPT ITEMS POLICIES
CREATE POLICY "Users can perform CRUD on their own receipt items" 
ON public.receipt_items 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------
-- 4. STORAGE BUCKET CONFIGURATION & POLICIES
-- ---------------------------------------------------------------------
-- Secure buckets must hold receipt images. Each user's uploads go into 
-- receipts/<user_id>/... for directory-level RLS.

-- Create storage bucket (needs to run with database/storage privileges)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts', 
    'receipts', 
    false, -- Keep private. Frontend will fetch authenticated signed URLs.
    5242880, -- 5 MB size limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for receipts storage bucket:
-- Folder structure is assumed: receipts/user_id/file.ext

CREATE POLICY "Authenticated users can upload receipts to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'receipts' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'receipts' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'receipts' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'receipts' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
