-- Strict enforcement of 12 present lectures limit

-- Create a strict function to prevent more than 12 present lectures
CREATE OR REPLACE FUNCTION enforce_max_present_lectures()
RETURNS TRIGGER AS $$
DECLARE
  present_count INTEGER;
BEGIN
  -- Count how many 'present' statuses are in the hourly_status array
  SELECT COUNT(*) INTO present_count
  FROM jsonb_array_elements(NEW.hourly_status) AS hour_status
  WHERE hour_status->>'status' = 'present';
  
  -- If more than 12 present statuses, raise an error
  IF present_count > 12 THEN
    RAISE EXCEPTION 'Cannot save: Student has % lectures marked as present. Maximum allowed is 12.', 
      present_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS enforce_max_present_lectures_trigger ON daily_attendance;

-- Create trigger to enforce max 12 present lectures
CREATE TRIGGER enforce_max_present_lectures_trigger
  BEFORE INSERT OR UPDATE ON daily_attendance
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_present_lectures(); 