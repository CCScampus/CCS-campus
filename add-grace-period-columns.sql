-- Add grace period and late fee columns to the fees table
-- Run this SQL in your Supabase SQL Editor

-- Add grace period days column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'fees' AND column_name = 'grace_period_days') THEN
        ALTER TABLE fees ADD COLUMN grace_period_days INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add grace fee amount column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'fees' AND column_name = 'grace_fee_amount') THEN
        ALTER TABLE fees ADD COLUMN grace_fee_amount INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add is_late_fee_applied column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'fees' AND column_name = 'is_late_fee_applied') THEN
        ALTER TABLE fees ADD COLUMN is_late_fee_applied BOOLEAN DEFAULT false;
    END IF;
END $$; 