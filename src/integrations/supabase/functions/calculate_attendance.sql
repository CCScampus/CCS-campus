-- Function to calculate attendance percentage based on selected slots
CREATE OR REPLACE FUNCTION calculate_attendance_percentage(
  p_student_id UUID,
  p_start_date DATE,
  p_end_date DATE
) 
RETURNS NUMERIC AS $$
DECLARE
  total_hours INTEGER := 0;
  present_hours INTEGER := 0;
  attendance_record RECORD;
  hour_data JSONB;
  selected_hours INTEGER[];
BEGIN
  -- Loop through each day in the date range
  FOR attendance_record IN 
    SELECT 
      da.student_id, 
      da.date, 
      da.hourly_status,
      COALESCE(ss.selected_hours, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]) AS selected_hours
    FROM 
      daily_attendance da
    LEFT JOIN 
      selected_slots ss ON da.student_id = ss.student_id AND da.date = ss.date
    WHERE 
      da.student_id = p_student_id
      AND da.date BETWEEN p_start_date AND p_end_date
  LOOP
    -- Loop through each hour status in the JSON array
    FOR i IN 0..jsonb_array_length(attendance_record.hourly_status) - 1 LOOP
      hour_data := jsonb_array_element(attendance_record.hourly_status, i);
      
      -- Only count hours that are in the selected_hours array
      IF (hour_data->>'hour')::INTEGER = ANY(attendance_record.selected_hours) THEN
        total_hours := total_hours + 1;
        
        -- Count present attendance
        IF (hour_data->>'status') = 'present' THEN
          present_hours := present_hours + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  -- Calculate attendance percentage
  IF total_hours > 0 THEN
    RETURN ROUND((present_hours::NUMERIC / total_hours::NUMERIC) * 100, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql; 