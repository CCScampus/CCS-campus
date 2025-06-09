-- add_version_column.sql
-- Add version column to daily_attendance table for optimistic concurrency control

-- Check if version column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'daily_attendance'
    AND column_name = 'version'
  ) THEN
    -- Add version column with default value of 1
    ALTER TABLE daily_attendance ADD COLUMN version INTEGER DEFAULT 1;
    
    -- Update all existing records to have version 1
    UPDATE daily_attendance SET version = 1 WHERE version IS NULL;
  END IF;
END $$;

-- Update the timestamp trigger function to increment version on update
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Increment version on update
  IF TG_OP = 'UPDATE' THEN
    NEW.version = COALESCE(OLD.version, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is applied
DROP TRIGGER IF EXISTS set_timestamp ON daily_attendance;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON daily_attendance
FOR EACH ROW
EXECUTE FUNCTION update_timestamp(); 