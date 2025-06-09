-- Migration to update daily_attendance system from 12 to 15 slots

-- 1. Add max_attendance_slots and required_attendance_slots to system_defaults
ALTER TABLE IF EXISTS system_defaults 
ADD COLUMN IF NOT EXISTS max_attendance_slots INTEGER NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS required_attendance_slots INTEGER NOT NULL DEFAULT 15;

-- 2. Create selected_slots table for tracking which 15 out of 15 slots count for attendance
CREATE TABLE IF NOT EXISTS public.selected_slots (
  id uuid not null default gen_random_uuid(),
  student_id uuid not null,
  date date not null,
  selected_hours integer[] not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint selected_slots_pkey primary key (id),
  constraint selected_slots_student_id_fkey foreign key (student_id) references students (id) on delete cascade,
  constraint selected_slots_hours_count check (array_length(selected_hours, 1) = 15),
  constraint selected_slots_hours_range check (
    array_position(selected_hours, 0) is null and
    array_position(selected_hours, 16) is null
  ),
  constraint selected_slots_unique_student_date unique (student_id, date)
);

-- 3. Drop trigger if it exists before creating it
DROP TRIGGER IF EXISTS update_selected_slots_updated_at ON selected_slots;

-- Create trigger for selected_slots
CREATE TRIGGER update_selected_slots_updated_at
    BEFORE UPDATE ON selected_slots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Drop function and trigger if they exist before creating them
DROP TRIGGER IF EXISTS enforce_max_present_lectures_trigger ON daily_attendance;
DROP FUNCTION IF EXISTS enforce_max_present_lectures();

-- Create function to enforce max 15 present lectures per student per day
CREATE OR REPLACE FUNCTION enforce_max_present_lectures()
RETURNS TRIGGER AS $$
DECLARE
  present_count INTEGER;
  required_slots INTEGER;
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

-- 5. Create trigger to enforce max 15 present lectures
CREATE TRIGGER enforce_max_present_lectures_trigger
  BEFORE INSERT OR UPDATE ON daily_attendance
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_present_lectures(); 