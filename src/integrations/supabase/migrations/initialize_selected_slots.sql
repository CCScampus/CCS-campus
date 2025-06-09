-- Initialize selected_slots for existing attendance records

-- Insert default selected slots (first 15 hours) for all existing attendance records
INSERT INTO selected_slots (student_id, date, selected_hours)
SELECT 
  student_id, 
  date, 
  ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
FROM 
  daily_attendance
WHERE 
  NOT EXISTS (
    SELECT 1 FROM selected_slots 
    WHERE selected_slots.student_id = daily_attendance.student_id 
    AND selected_slots.date = daily_attendance.date
  );

-- Create a more strict function to enforce the 15 present lectures limit
CREATE OR REPLACE FUNCTION enforce_max_present_lectures()
RETURNS TRIGGER AS $$
DECLARE
  present_count INTEGER;
  selected_hours INTEGER[];
  hour_data JSONB;
  hour_num INTEGER;
  present_in_selected INTEGER := 0;
BEGIN
  -- Get the selected hours for this student and date
  SELECT ss.selected_hours INTO selected_hours
  FROM selected_slots ss
  WHERE ss.student_id = NEW.student_id AND ss.date = NEW.date;
  
  -- If no selected hours found, use default first 15 hours
  IF selected_hours IS NULL THEN
    selected_hours := ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
    
    -- Insert the default selected hours
    INSERT INTO selected_slots (student_id, date, selected_hours)
    VALUES (NEW.student_id, NEW.date, selected_hours);
  END IF;
  
  -- Count present statuses in selected hours
  FOR i IN 0..jsonb_array_length(NEW.hourly_status) - 1 LOOP
    hour_data := jsonb_array_element(NEW.hourly_status, i);
    hour_num := (hour_data->>'hour')::INTEGER;
    
    -- Check if this hour is in the selected hours
    IF hour_num = ANY(selected_hours) AND hour_data->>'status' = 'present' THEN
      present_in_selected := present_in_selected + 1;
    END IF;
  END LOOP;
  
  -- If more than 15 present statuses in selected hours, raise an error
  IF present_in_selected > 15 THEN
    RAISE EXCEPTION 'Cannot mark more than 15 lectures as present per day';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS enforce_max_present_lectures_trigger ON daily_attendance;

CREATE TRIGGER enforce_max_present_lectures_trigger
  BEFORE INSERT OR UPDATE ON daily_attendance
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_present_lectures(); 