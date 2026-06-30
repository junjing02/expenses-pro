-- =====================================================================
-- SUPABASE POSTGRESQL INCREMENTAL MIGRATION: SUBSCRIPTIONS TABLE
-- =====================================================================
-- Run this script in the Supabase SQL Editor.
-- It creates a subscriptions table for recurring expense tracking.

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., Spotify, Netflix, House Loan
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    type VARCHAR(50) NOT NULL DEFAULT 'Subscription', -- 'Subscription', 'Loan', 'Insurance', 'Utilities', 'Other'
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL, -- linked payment method
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly', -- 'weekly', 'monthly', 'yearly'
    next_payment_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Define Policies
CREATE POLICY "Users can manage their own subscriptions" 
ON public.subscriptions 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
