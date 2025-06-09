-- First, add the new grace_month column if it doesn't exist
DO $$ 
BEGIN
  -- Add grace_month column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'fees' 
    AND column_name = 'grace_month') THEN
    
    ALTER TABLE fees ADD COLUMN grace_month INTEGER DEFAULT 5;
  END IF;

  -- Convert existing grace_period_days to grace_month (divide by 30 and round)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'fees' 
    AND column_name = 'grace_period_days') THEN

    -- Update grace_month based on grace_period_days
    UPDATE fees 
    SET grace_month = CASE 
      WHEN grace_period_days IS NOT NULL AND grace_period_days > 0 
      THEN GREATEST(1, ROUND(grace_period_days::numeric / 30))
      ELSE 5 -- Default value
    END
    WHERE grace_period_days IS NOT NULL;

    -- Drop the old column
    ALTER TABLE fees DROP COLUMN grace_period_days;
  END IF;

  -- Set default values for grace_month where it's null
  UPDATE fees 
  SET grace_month = 5 
  WHERE grace_month IS NULL;

END $$; 