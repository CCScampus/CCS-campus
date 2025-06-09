-- Start transaction
BEGIN;

-- Rename grace_period to grace_period_months if it exists
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='system_defaults' AND column_name='grace_period') 
  THEN
    ALTER TABLE public.system_defaults 
    RENAME COLUMN grace_period TO grace_period_months;
  END IF;
END $$;

-- Change currency to INR
ALTER TABLE public.system_defaults
ALTER COLUMN currency SET DEFAULT 'INR';

UPDATE public.system_defaults
SET currency = 'INR'
WHERE id = 1;

COMMIT; 