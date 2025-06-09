-- Start transaction
BEGIN;

-- Add back the grace_period_days column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='fees' AND column_name='grace_period_days') 
  THEN
    ALTER TABLE public.fees 
    ADD COLUMN grace_period_days integer NULL DEFAULT 150;
  END IF;
END $$;

-- Convert months to days
UPDATE public.fees 
SET grace_period_days = COALESCE(grace_month, 5) * 30;

-- Drop the grace_month column
ALTER TABLE public.fees 
DROP COLUMN IF EXISTS grace_month;

-- Update system_defaults table to use days again
ALTER TABLE public.system_defaults 
RENAME COLUMN grace_period_months TO grace_period;

-- Set default value for grace_period back to days
ALTER TABLE public.system_defaults 
ALTER COLUMN grace_period SET DEFAULT 150;

-- Add back the original comments
COMMENT ON COLUMN public.fees.grace_period_days IS 'Grace period in days before late fee is applied';
COMMENT ON COLUMN public.system_defaults.grace_period IS 'Default grace period in days before late fee is applied';

-- End transaction
COMMIT; 