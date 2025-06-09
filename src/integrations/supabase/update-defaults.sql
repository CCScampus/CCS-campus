-- First, ensure we have a record with id = 1
INSERT INTO system_defaults (id) 
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Then update with default values if they are 0 or null
UPDATE system_defaults 
SET 
  grace_period = COALESCE(NULLIF(grace_period, 0), 5),
  grace_fee = COALESCE(NULLIF(grace_fee, 0), 500),
  batch_format = COALESCE(batch_format, 'YYYY-BATCH'),
  course_list = CASE 
    WHEN course_list IS NULL OR array_length(course_list, 1) IS NULL 
    THEN ARRAY['BCA', 'BBA', 'MCA', 'MBA', 'BSc', 'MSc', 'BA', 'MA']
    ELSE course_list 
  END,
  min_payment = COALESCE(NULLIF(min_payment, 0), 500),
  attendance_threshold = COALESCE(NULLIF(attendance_threshold, 0), 80),
  currency = COALESCE(currency, 'INR')
WHERE id = 1; 