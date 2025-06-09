-- Start transaction
BEGIN;

-- Drop the old grace_period_days column if it exists
ALTER TABLE public.fees 
DROP COLUMN IF EXISTS grace_period_days;

-- Add the new grace_month column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='fees' AND column_name='grace_month') 
  THEN
    ALTER TABLE public.fees 
    ADD COLUMN grace_month integer NULL DEFAULT 5;
  END IF;
END $$;

-- Update system_defaults table to use months instead of days
ALTER TABLE public.system_defaults 
RENAME COLUMN grace_period TO grace_period_months;

-- Set default value for grace_period_months
ALTER TABLE public.system_defaults 
ALTER COLUMN grace_period_months SET DEFAULT 5;

-- Add comments to document the changes
COMMENT ON COLUMN public.fees.grace_month IS 'Grace period in months before late fee is applied';
COMMENT ON COLUMN public.system_defaults.grace_period_months IS 'Default grace period in months before late fee is applied';

-- End transaction
COMMIT; 