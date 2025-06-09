-- Migration to enforce 12 present lectures limit

-- Create function to enforce max 12 present lectures per student per day
CREATE OR REPLACE FUNCTION enforce_max_present_lectures()
RETURNS TRIGGER AS $$
DECLARE
  present_count INTEGER;
  required_slots INTEGER;
BEGIN
  -- Get the required number of slots from system_defaults
  SELECT required_attendance_slots INTO required_slots FROM system_defaults WHERE id = 1;
  
  -- Default to 12 if not found
  IF required_slots IS NULL THEN
    required_slots := 12;
  END IF;
  
  -- Count how many 'present' statuses are in the hourly_status array
  SELECT COUNT(*) INTO present_count
  FROM jsonb_array_elements(NEW.hourly_status) AS hour_status
  WHERE hour_status->>'status' = 'present';
  
  -- If more than required_slots present statuses, raise an error
  IF present_count > required_slots THEN
    RAISE EXCEPTION 'Cannot mark more than % lectures as present for student % on % (found %)', 
      required_slots, NEW.student_id, NEW.date, present_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS enforce_max_present_lectures_trigger ON daily_attendance;

-- Create trigger to enforce max 12 present lectures
CREATE TRIGGER enforce_max_present_lectures_trigger
  BEFORE INSERT OR UPDATE ON daily_attendance
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_present_lectures(); 