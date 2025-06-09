-- attendance_schema.sql
-- Create daily_attendance table with versioning for concurrency control
CREATE TABLE IF NOT EXISTS daily_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hourly_status JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  version INTEGER DEFAULT 1,
  UNIQUE(student_id, date)
);

-- Create trigger to automatically update updated_at on record changes
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Increment version on update
  IF TG_OP = 'UPDATE' THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to daily_attendance table
DROP TRIGGER IF EXISTS set_timestamp ON daily_attendance;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON daily_attendance
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Create trigger function to validate maximum present lectures
CREATE OR REPLACE FUNCTION enforce_max_present_lectures()
RETURNS TRIGGER AS $$
DECLARE
  required_slots INTEGER;
  present_count INTEGER;
BEGIN
  -- Get the required number of slots from system_defaults
  SELECT required_attendance_slots INTO required_slots FROM system_defaults WHERE id = 1;
  
  -- Default to 15 if not found
  IF required_slots IS NULL THEN
    required_slots := 15;
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

-- Create trigger to enforce max 15 present lectures
CREATE TRIGGER enforce_max_present_lectures_trigger
BEFORE INSERT OR UPDATE ON daily_attendance
FOR EACH ROW
EXECUTE FUNCTION enforce_max_present_lectures(); 