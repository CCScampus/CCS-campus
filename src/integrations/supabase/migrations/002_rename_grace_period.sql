-- Start transaction
BEGIN;

-- Rename grace_period to grace_period_months if it exists
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='system_defaults' 
    AND column_name='grace_period'
  ) THEN
    ALTER TABLE system_defaults 
    RENAME COLUMN grace_period TO grace_period_months;
  END IF;
END $$;

-- Add grace_period_months if neither column exists
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='system_defaults' 
    AND (column_name='grace_period' OR column_name='grace_period_months')
  ) THEN
    ALTER TABLE system_defaults 
    ADD COLUMN grace_period_months INTEGER NULL DEFAULT 5;
  END IF;
END $$;

-- Update any null values to default
UPDATE system_defaults 
SET grace_period_months = 5 
WHERE grace_period_months IS NULL;

-- End transaction
COMMIT; 