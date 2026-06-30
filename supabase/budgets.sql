-- =====================================================================
-- SUPABASE POSTGRESQL INCREMENTAL MIGRATION: BUDGETS TABLE
-- =====================================================================
-- Run this script in the Supabase SQL Editor.
-- It creates a budgets configuration table and sets up Row Level Security.

-- 1. Create budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    limit_amount NUMERIC(15, 2) NOT NULL CHECK (limit_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforce a unique budget configuration per category for each user
    CONSTRAINT unique_user_category_budget UNIQUE (user_id, category)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies
CREATE POLICY "Users can manage their own budgets" 
ON public.budgets 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
