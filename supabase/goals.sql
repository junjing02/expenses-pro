-- =====================================================================
-- SUPABASE POSTGRESQL INCREMENTAL MIGRATION: GOALS TABLE
-- =====================================================================
-- Run this script in the Supabase SQL Editor.
-- It creates a goals table to track target savings.

CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g. Emergency Fund, New Laptop
    target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (current_amount >= 0),
    target_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Define Policies
CREATE POLICY "Users can manage their own goals" 
ON public.goals 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
