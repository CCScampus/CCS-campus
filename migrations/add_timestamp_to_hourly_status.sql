-- Migration to ensure all hourly_status records have a timestamp
-- This will update existing records that don't have a 'time' field

-- Function to recursively process and add 'time' to all hourly_status entries
CREATE OR REPLACE FUNCTION update_hourly_status_timestamps()
RETURNS void AS $$
DECLARE
    attendance_record RECORD;
    hourly_statuses JSONB;
    updated_hourly_statuses JSONB;
    hourly_status JSONB;
    new_hourly_status JSONB;
    i INTEGER;
BEGIN
    -- Loop through all records in daily_attendance
    FOR attendance_record IN SELECT id, hourly_status FROM daily_attendance
    LOOP
        hourly_statuses := attendance_record.hourly_status;
        updated_hourly_statuses := '[]'::JSONB;
        
        -- Loop through each hourly_status array element
        FOR i IN 0..jsonb_array_length(hourly_statuses) - 1
        LOOP
            hourly_status := hourly_statuses->i;
            
            -- If time field doesn't exist or is null, add the current timestamp
            IF hourly_status->>'time' IS NULL THEN
                new_hourly_status := jsonb_set(
                    hourly_status, 
                    '{time}', 
                    to_jsonb(now()::text)
                );
            ELSE
                new_hourly_status := hourly_status;
            END IF;
            
            -- Add the updated status to our new array
            updated_hourly_statuses := updated_hourly_statuses || new_hourly_status;
        END LOOP;
        
        -- Update the record with the new hourly_status array
        UPDATE daily_attendance 
        SET hourly_status = updated_hourly_statuses
        WHERE id = attendance_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT update_hourly_status_timestamps();

-- Drop the function after use
DROP FUNCTION update_hourly_status_timestamps(); 